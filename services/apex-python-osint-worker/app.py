from __future__ import annotations

import asyncio
import base64
import ctypes
import hashlib
import hmac
import ipaddress
import json
import os
import re
import signal
import socket
import subprocess
import tempfile
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

import httpx
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

TOKEN = os.getenv("APEX_PYTHON_SANDBOX_TOKEN", "").strip()
ISOLATION_PUBLIC_KEY_B64 = os.getenv("APEX_PYTHON_ISOLATION_ATTESTATION_PUBLIC_KEY", "").strip()
ISOLATION_PROOF_PATH = Path(os.getenv("APEX_PYTHON_ISOLATION_PROOF_PATH", "/run/apex/isolation-attestation.json"))
SPIDERFOOT_BASE_URL = "http://127.0.0.1:5001"
REQUIRED_NETWORK_NAMESPACE = "kubernetes-egress-policy-apex-osint-v2"
REQUIRED_EGRESS_BROKER = "apex-public-egress-proxy-v1"
MAX_ATTESTATION_PROOF_AGE_MS = 7 * 24 * 60 * 60 * 1000
MAX_OUTPUT_BYTES_CAP = 1_000_000
MAX_RUNTIME_MS_CAP = 120_000
MAX_TOOL_CONCURRENCY = max(1, min(4, int(os.getenv("APEX_OSINT_MAX_CONCURRENCY", "2"))))
REQUEST_REPLAY_WINDOW_SECONDS = 120.0
MAX_TRACKED_REQUEST_IDS = 2_048
active_requests: dict[str, asyncio.Task[Any]] = {}
seen_request_ids: dict[str, float] = {}
cancelled_request_ids: dict[str, float] = {}
ALLOWED_TOOLS = ("holehe", "maigret", "sherlock", "theharvester", "spiderfoot")
TOOL_VERSIONS = {
    "holehe": "git:14da70f588538936b20d238783c5e28a0772a2b3",
    "maigret": "0.6.6",
    "sherlock": "0.16.2",
    "theharvester": "4.11.1",
    "spiderfoot": "4.0",
}
PROFILE_MODULES: dict[str, tuple[str, ...]] = {
    "identity-expansion": (
        "sfp_socialprofiles", "sfp_sociallinks", "sfp_googlesearch", "sfp_bingsearch",
        "sfp_github", "sfp_crt",
    ),
    "domain-infrastructure": (
        "sfp_dnsresolve", "sfp_dnsraw", "sfp_dnscommonsrv", "sfp_whois",
        "sfp_sslcert", "sfp_crt", "sfp_googlesearch",
    ),
    "organization-footprint": (
        "sfp_company", "sfp_googlesearch", "sfp_bingsearch", "sfp_github",
        "sfp_sociallinks", "sfp_socialprofiles", "sfp_crt", "sfp_whois",
    ),
    "contact-adjacent": (
        "sfp_emailformat", "sfp_email", "sfp_socialprofiles", "sfp_googlesearch",
        "sfp_bingsearch",
    ),
}
PROFILE_MODULES["broad-osint"] = tuple(dict.fromkeys(
    name for profile, modules in PROFILE_MODULES.items() if profile != "broad-osint" for name in modules
))
SPIDERFOOT_ALLOWED_MODULES = frozenset(name for modules in PROFILE_MODULES.values() for name in modules)
TOOL_TIMEOUT_DEFAULTS = {"holehe": 45_000, "maigret": 60_000, "sherlock": 45_000, "theharvester": 60_000, "spiderfoot": 120_000}

semaphore = asyncio.Semaphore(MAX_TOOL_CONCURRENCY)
spiderfoot_process: asyncio.subprocess.Process | None = None
spiderfoot_start_error: str | None = None
spiderfoot_http: httpx.AsyncClient | None = None
cli_tool_ready: dict[str, bool] = {"holehe": False, "maigret": False, "sherlock": False, "theharvester": False}


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")


def sign_payload(value: Any) -> str:
    if not TOKEN:
        raise RuntimeError("Worker shared token is not configured.")
    return hmac.new(TOKEN.encode("utf-8"), canonical_json(value), hashlib.sha256).hexdigest()


def signed_envelope(payload: Any) -> dict[str, Any]:
    return {"payload": payload, "signature": sign_payload(payload)}


def verify_signature(secret: bytes, value: Any, signature: Any) -> bool:
    if not isinstance(signature, str) or not re.fullmatch(r"[0-9a-fA-F]{128}", signature):
        return False
    try:
        supplied = bytes.fromhex(signature)
    except ValueError:
        return False
    expected = hmac.new(secret, canonical_json(value), hashlib.sha512).digest()
    return hmac.compare_digest(expected, supplied)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def utc_iso(value: datetime | None = None) -> str:
    return (value or utcnow()).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def sha256_file(path: Path) -> str | None:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        return None


def load_isolation_proof() -> dict[str, Any] | None:
    """Accept only a deployment-controller-signed proof of the live network boundary."""
    if not ISOLATION_PUBLIC_KEY_B64:
        return None
    try:
        pub = Ed25519PublicKey.from_public_bytes(base64.b64decode(ISOLATION_PUBLIC_KEY_B64, validate=True))
        envelope = json.loads(ISOLATION_PROOF_PATH.read_text("utf-8"))
        if not isinstance(envelope, dict) or not isinstance(envelope.get("payload"), dict):
            return None
        payload = envelope["payload"]
        signature = base64.b64decode(envelope.get("signature", ""), validate=True)
        pub.verify(signature, canonical_json(payload))
        issued = datetime.fromisoformat(str(payload["issuedAt"]).replace("Z", "+00:00"))
        expires = datetime.fromisoformat(str(payload["expiresAt"]).replace("Z", "+00:00"))
        now = utcnow()
        if issued > now + timedelta(minutes=1) or expires <= now or (expires - issued).total_seconds() > 7 * 24 * 60 * 60:
            return None
        if (now - issued).total_seconds() * 1000 > MAX_ATTESTATION_PROOF_AGE_MS:
            return None
        if payload.get("policyContractVersion") != REQUIRED_NETWORK_NAMESPACE:
            return None
        if payload.get("networkNamespace") != REQUIRED_NETWORK_NAMESPACE or payload.get("egressBroker") != REQUIRED_EGRESS_BROKER:
            return None
        for field in ("verifiedPodCIDRs", "verifiedServiceCIDRs"):
            values = payload.get(field)
            if not isinstance(values, list) or not values or len(values) > 100 or any(not isinstance(value, str) for value in values):
                return None
            try:
                networks = [ipaddress.ip_network(value, strict=True) for value in values]
            except ValueError:
                return None
            if any(network.prefixlen == 0 for network in networks):
                return None
        required_policies = {
            "apex-osint-worker-ingress",
            "apex-osint-worker-egress",
            "apex-osint-proxy-ingress",
            "apex-osint-proxy-egress",
        }
        if set(payload.get("verifiedNetworkPolicies", [])) != required_policies:
            return None
        proxy_config_hash = sha256_file(Path("/etc/apex/egress-proxy/squid.conf"))
        if not proxy_config_hash or payload.get("proxyConfigSha256") != proxy_config_hash:
            return None
        expected_image_digest = os.getenv("APEX_PYTHON_WORKER_IMAGE_DIGEST", "").strip()
        observed_image_digest = str(payload.get("workerImageDigest", ""))
        expected_proxy_digest = os.getenv("APEX_PYTHON_EGRESS_PROXY_IMAGE_DIGEST", "").strip()
        observed_proxy_digest = str(payload.get("egressProxyImageDigest", ""))
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", expected_image_digest):
            return None
        if observed_image_digest != expected_image_digest:
            return None
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", expected_proxy_digest):
            return None
        if observed_proxy_digest != expected_proxy_digest:
            return None
        if not isinstance(payload.get("publicWorkerHostname"), str) or not payload["publicWorkerHostname"].strip():
            return None
        return payload
    except Exception:
        return None


def resolve_worker_tools() -> tuple[list[str], dict[str, str]]:
    tools: list[str] = []
    versions: dict[str, str] = {}
    executables = {
        "holehe": Path("/opt/venvs/holehe/bin/python"),
        "maigret": Path("/opt/venvs/maigret/bin/maigret"),
        "sherlock": Path("/opt/venvs/sherlock/bin/sherlock"),
        "theharvester": Path("/opt/venvs/theharvester/bin/theHarvester"),
        "spiderfoot": Path("/opt/venvs/spiderfoot/bin/python"),
    }
    for tool, executable in executables.items():
        if not executable.is_file():
            continue
        if tool == "spiderfoot":
            if not spiderfoot_is_healthy():
                continue
        elif not cli_tool_ready.get(tool, False):
            continue
        tools.append(tool)
        versions[tool] = TOOL_VERSIONS[tool]
    return tools, versions


def spiderfoot_is_healthy() -> bool:
    return spiderfoot_process is not None and spiderfoot_process.returncode is None and spiderfoot_start_error is None


async def initialize_cli_tool_readiness() -> None:
    probes = {
        "holehe": ("/opt/venvs/holehe/bin/python", "-c", "import holehe.core, trio, httpx"),
        "maigret": ("/opt/venvs/maigret/bin/python", "-c", "import maigret.maigret"),
        "sherlock": ("/opt/venvs/sherlock/bin/python", "-c", "import sherlock_project.sherlock"),
        "theharvester": ("/opt/venvs/theharvester/bin/python", "-c", "import theHarvester.__main__"),
    }
    for tool, command in probes.items():
        try:
            with tempfile.TemporaryDirectory(prefix="apex-probe-") as temp:
                code, _stdout, _stderr, failure = await run_process(
                    command[0], list(command[1:]), timeout_ms=10_000,
                    max_output_bytes=16_384, tool_home=Path(temp),
                )
            cli_tool_ready[tool] = failure is None and code == 0
        except Exception:
            cli_tool_ready[tool] = False


async def start_spiderfoot() -> None:
    global spiderfoot_process, spiderfoot_start_error, spiderfoot_http
    binary = Path("/opt/venvs/spiderfoot/bin/python")
    source = Path("/opt/tools/spiderfoot/sf.py")
    if not binary.is_file() or not source.is_file():
        spiderfoot_start_error = "SpiderFoot v4.0 runtime is not installed."
        return
    env = {
        "PATH": "/opt/venvs/spiderfoot/bin:/usr/bin:/bin",
        "HOME": "/tmp/apex-spiderfoot-home",
        "TMPDIR": "/tmp",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "HTTP_PROXY": os.getenv("HTTP_PROXY", ""),
        "HTTPS_PROXY": os.getenv("HTTPS_PROXY", ""),
        "http_proxy": os.getenv("HTTP_PROXY", ""),
        "https_proxy": os.getenv("HTTPS_PROXY", ""),
        "NO_PROXY": "127.0.0.1,localhost",
        "no_proxy": "127.0.0.1,localhost",
    }
    Path(env["HOME"]).mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        spiderfoot_process = await asyncio.create_subprocess_exec(
            "/usr/bin/prlimit", "--core=0", "--fsize=536870912",
            "--nofile=256", "--nproc=128", "--", str(binary), str(source),
            "-l", "127.0.0.1:5001", "-q",
            stdin=asyncio.subprocess.DEVNULL, stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL, env=env, cwd=env["HOME"],
            start_new_session=True,
        )
        spiderfoot_http = httpx.AsyncClient(timeout=3.0, trust_env=True, follow_redirects=False)
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            if spiderfoot_process.returncode is not None:
                spiderfoot_start_error = "SpiderFoot server exited during startup."
                return
            try:
                response = await spiderfoot_http.get(SPIDERFOOT_BASE_URL + "/scanstatus", params={"id": "apex-health-check"})
                if response.status_code < 500:
                    return
            except httpx.HTTPError:
                pass
            await asyncio.sleep(0.5)
        spiderfoot_start_error = "SpiderFoot local service did not become healthy before its startup deadline."
    except Exception:
        spiderfoot_start_error = "SpiderFoot local service failed to start."


async def stop_spiderfoot() -> None:
    global spiderfoot_process, spiderfoot_http
    if spiderfoot_http:
        await spiderfoot_http.aclose()
        spiderfoot_http = None
    if spiderfoot_process and spiderfoot_process.returncode is None:
        try:
            os.killpg(spiderfoot_process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            await asyncio.wait_for(spiderfoot_process.wait(), timeout=3)
        except asyncio.TimeoutError:
            try:
                os.killpg(spiderfoot_process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            await spiderfoot_process.wait()
    spiderfoot_process = None


class RequestCorrelation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    jobId: str | None = Field(default=None, max_length=120)
    caseId: int | None = Field(default=None, ge=1)
    investigatorTurn: int | None = Field(default=None, ge=0, le=10_000)


class ExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requestId: str = Field(min_length=16, max_length=80)
    tool: Literal["holehe", "maigret", "sherlock", "theharvester", "spiderfoot"]
    args: dict[str, Any]
    timeoutMs: int = Field(ge=1000, le=MAX_RUNTIME_MS_CAP)
    maxOutputBytes: int = Field(ge=1024, le=MAX_OUTPUT_BYTES_CAP)
    requestedAt: str
    correlation: RequestCorrelation | None = None

    @field_validator("args")
    @classmethod
    def args_must_be_object(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError("args must be an object")
        return value


def validate_args(tool: str, args: dict[str, Any]) -> dict[str, Any]:
    expected: dict[str, set[str]] = {
        "holehe": {"email"},
        "maigret": {"username"},
        "sherlock": {"username"},
        "theharvester": {"domain", "sources"},
        "spiderfoot": {"target", "targetType", "profile"},
    }
    if set(args) != expected[tool]:
        raise ValueError("Tool arguments did not match the canonical contract.")
    if tool == "holehe":
        email = str(args["email"]).strip().lower()
        if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise ValueError("Invalid email target.")
        return {"email": email}
    if tool in ("maigret", "sherlock"):
        username = str(args["username"]).strip().lstrip("@")
        if not 2 <= len(username) <= 80 or not re.fullmatch(r"[A-Za-z0-9._-]+", username):
            raise ValueError("Invalid username target.")
        return {"username": username}
    if tool == "theharvester":
        domain = str(args["domain"]).strip().lower().removeprefix("https://").removeprefix("http://").split("/", 1)[0]
        if len(domain) > 253 or not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", domain):
            raise ValueError("Invalid domain target.")
        allowed = {"bing", "duckduckgo", "yahoo", "certspotter", "crtsh"}
        sources = [str(item).strip().lower() for item in str(args["sources"]).split(",") if str(item).strip()]
        if not sources or len(sources) > len(allowed) or not set(sources).issubset(allowed):
            raise ValueError("The requested theHarvester source set is not in the allowed passive-source set.")
        return {"domain": domain, "sources": ",".join(dict.fromkeys(sources))}
    target = str(args["target"]).strip()
    target_type = str(args["targetType"]).strip().lower()
    profile = str(args["profile"]).strip().lower()
    if not target or len(target) > 300:
        raise ValueError("Invalid SpiderFoot target.")
    if target_type not in {"domain", "hostname", "ip", "email", "username", "person", "asn"}:
        raise ValueError("Invalid SpiderFoot target type.")
    if profile not in PROFILE_MODULES:
        raise ValueError("Invalid SpiderFoot profile.")
    if target_type in {"domain", "hostname"}:
        clean = target.lower().rstrip(".")
        if not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", clean):
            raise ValueError("Invalid SpiderFoot domain/hostname.")
        target = clean
    elif target_type == "ip":
        try:
            parsed = ipaddress.ip_address(target)
            if not parsed.is_global:
                raise ValueError("SpiderFoot only accepts public IP targets.")
            target = str(parsed)
        except ValueError as ex:
            raise ValueError("Invalid or non-public SpiderFoot IP target.") from ex
    elif target_type == "email":
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", target) or len(target) > 254:
            raise ValueError("Invalid SpiderFoot email target.")
    elif target_type == "asn":
        if not re.fullmatch(r"AS\d{1,10}", target, re.IGNORECASE):
            raise ValueError("Invalid ASN target.")
        target = target.upper()
    else:
        if not re.fullmatch(r"[\w .@+'-]{2,300}", target, re.UNICODE):
            raise ValueError("Invalid person/username target.")
    return {"target": target, "targetType": target_type, "profile": profile}


async def read_limited(stream: asyncio.StreamReader, limit: int, overflow: asyncio.Event) -> bytes:
    retained = bytearray()
    while True:
        chunk = await stream.read(8192)
        if not chunk:
            break
        remaining = limit - len(retained)
        if remaining > 0:
            retained.extend(chunk[:remaining])
        if len(chunk) > remaining:
            overflow.set()
    return bytes(retained)


async def kill_process_tree(process: asyncio.subprocess.Process) -> None:
    # Kill the process group even if the direct child already exited: its
    # descendants can keep stdout/stderr pipes open after the parent returns.
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    if process.returncode is None:
        try:
            await asyncio.wait_for(process.wait(), timeout=3)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()


async def run_process(
    executable: str,
    args: list[str],
    *,
    timeout_ms: int,
    max_output_bytes: int,
    tool_home: Path,
) -> tuple[int | None, bytes, bytes, str | None]:
    tool_home.mkdir(parents=True, mode=0o700, exist_ok=True)
    env = {
        "PATH": str(Path(executable).parent) + ":/usr/bin:/bin",
        "HOME": str(tool_home),
        "TMPDIR": "/tmp",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "HTTP_PROXY": os.getenv("HTTP_PROXY", ""),
        "HTTPS_PROXY": os.getenv("HTTPS_PROXY", ""),
        "http_proxy": os.getenv("HTTP_PROXY", ""),
        "https_proxy": os.getenv("HTTPS_PROXY", ""),
        "NO_PROXY": "127.0.0.1,localhost",
        "no_proxy": "127.0.0.1,localhost",
        "PYTHONNOUSERSITE": "1",
        "PYTHONUNBUFFERED": "1",
    }
    overflow = asyncio.Event()
    deadline = time.monotonic() + timeout_ms / 1000
    process: asyncio.subprocess.Process | None = None
    try:
        process = await asyncio.create_subprocess_exec(
            "/usr/bin/prlimit", "--core=0", "--fsize=" + str(max_output_bytes),
            "--nofile=128", "--nproc=64", "--", executable, *args,
            cwd=str(tool_home), env=env,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            start_new_session=True,
        )
        assert process.stdout is not None and process.stderr is not None
        stdout_task = asyncio.create_task(read_limited(process.stdout, max_output_bytes, overflow))
        stderr_task = asyncio.create_task(read_limited(process.stderr, min(32_000, max_output_bytes // 4), overflow))
        wait_task = asyncio.create_task(process.wait())
        overflow_task = asyncio.create_task(overflow.wait())
        done, _pending = await asyncio.wait(
            {wait_task, overflow_task}, timeout=max(0.0, deadline - time.monotonic()),
            return_when=asyncio.FIRST_COMPLETED,
        )
        if wait_task not in done:
            await kill_process_tree(process)
            await asyncio.gather(stdout_task, stderr_task, return_exceptions=True)
            return process.returncode, b"", b"", "timeout" if overflow_task not in done else "output_limit"
        if overflow.is_set():
            await kill_process_tree(process)
            await asyncio.gather(stdout_task, stderr_task, return_exceptions=True)
            return process.returncode, b"", b"", "output_limit"
        try:
            remaining = max(0.001, deadline - time.monotonic())
            stdout, stderr = await asyncio.wait_for(
                asyncio.gather(stdout_task, stderr_task), timeout=remaining,
            )
        except asyncio.TimeoutError:
            await kill_process_tree(process)
            for reader in (stdout_task, stderr_task):
                reader.cancel()
            await asyncio.gather(stdout_task, stderr_task, return_exceptions=True)
            return process.returncode, b"", b"", "timeout"
        # Readers can discover overflow after the process-exit wait has already
        # completed. Check again after both pipes drain before accepting output.
        if overflow.is_set():
            await kill_process_tree(process)
            return process.returncode, b"", b"", "output_limit"
        return process.returncode, stdout, stderr, None
    except asyncio.CancelledError:
        if process:
            await kill_process_tree(process)
        raise
    except FileNotFoundError:
        return None, b"", b"", "unavailable"
    except Exception:
        if process:
            await kill_process_tree(process)
        return None, b"", b"", "failed"
    finally:
        for child in (locals().get("wait_task"), locals().get("overflow_task")):
            if child:
                child.cancel()


def parse_json_from_stdout(stdout: bytes) -> dict[str, Any]:
    text = stdout.decode("utf-8", errors="replace").strip()
    # Some supported command-line tools include status text around their JSON;
    # accept a root object only and never interpret free-text output as evidence.
    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else {"items": value} if isinstance(value, list) else {}
    except json.JSONDecodeError:
        return {}


async def run_cli_tool(tool: str, args: dict[str, Any], timeout_ms: int, max_output_bytes: int) -> tuple[str, dict[str, Any] | None, str | None, str]:
    with tempfile.TemporaryDirectory(prefix="apex-osint-") as temp:
        home = Path(temp)
        if tool == "holehe":
            code, stdout, stderr, failure = await run_process(
                "/opt/venvs/holehe/bin/python",
                ["/app/tool_runner.py", "holehe", json.dumps(args, separators=(",", ":"))],
                timeout_ms=timeout_ms, max_output_bytes=max_output_bytes, tool_home=home,
            )
            if failure:
                return failure, None, "Holehe runner " + failure, "holehe"
            if code != 0:
                return "failed", None, "Holehe runner returned a non-zero exit code.", "holehe"
            result = parse_json_from_stdout(stdout)
            found = result.get("found") if isinstance(result, dict) else None
            if not isinstance(found, list) or any(not isinstance(item, dict) for item in found):
                return "failed", None, "Holehe runner returned an invalid structured result.", "holehe"
            checked = result.get("totalChecked")
            truncated = result.get("truncated", False)
            if isinstance(checked, bool) or not isinstance(checked, int) or checked < len(found):
                return "failed", None, "Holehe runner returned an invalid checked-count value.", "holehe"
            if not isinstance(truncated, bool):
                return "failed", None, "Holehe runner returned an invalid truncation flag.", "holehe"
            positives = sum(1 for item in found if item.get("exists") is True)
            status, error = classify_holehe_result(found)
            if truncated:
                status = "partial"
                truncation_error = "Holehe reached its bounded module/output limit; results are partial."
                error = (error + " " + truncation_error) if error else truncation_error
            return status, {
                "found": found[:250], "totalChecked": checked, "totalFound": positives,
                "truncated": truncated,
            }, error, "holehe"
        if tool == "maigret":
            report_dir = home / "reports"
            code, stdout, stderr, failure = await run_process(
                "/opt/venvs/maigret/bin/maigret",
                [args["username"], "--csv", "--folderoutput", str(report_dir), "--timeout", "8", "--no-progressbar", "--top-sites", "150", "--no-color"],
                timeout_ms=timeout_ms, max_output_bytes=max_output_bytes, tool_home=home,
            )
            if failure:
                return failure, None, "Maigret runner " + failure, "maigret"
            # Maigret v0.6.6's NDJSON exporter contains CLAIMED profiles only;
            # that output cannot distinguish a clean zero-hit run from a run in
            # which every site failed. Its CSV report retains each site's status.
            report_path = report_dir / ("report_" + args["username"] + ".csv")
            if not report_path.is_file():
                return "failed", None, "Maigret exited without its expected CSV report.", "maigret"
            import csv
            found: list[dict[str, Any]] = []
            total_sites_checked = 0
            site_rows_seen = 0
            incomplete_records = 0
            required_headers = {"username", "name", "url_main", "url_user", "exists", "http_status", "error_reason"}
            try:
                with report_path.open("r", encoding="utf-8", newline="") as stream:
                    reader = csv.DictReader(stream)
                    if not reader.fieldnames or not required_headers.issubset(set(reader.fieldnames)):
                        return "failed", None, "Maigret returned a malformed CSV report.", "maigret"
                    for row in reader:
                        site_rows_seen += 1
                        if not isinstance(row, dict) or None in row:
                            incomplete_records += 1
                            continue
                        raw_status = str(row.get("exists") or "").strip().lower()
                        site_name = str(row.get("name") or "").strip()
                        profile_url = str(row.get("url_user") or "").strip()
                        if not site_name or not raw_status:
                            incomplete_records += 1
                            continue
                        if raw_status == "illegal":
                            # Maigret explicitly skipped this site's request.
                            incomplete_records += 1
                            continue
                        if raw_status in ("claimed", "found", "true"):
                            status_value = "found"
                        elif raw_status in ("available", "not_found", "false"):
                            status_value = "not_found"
                            total_sites_checked += 1
                        elif raw_status in ("unknown", "error", "unknown_error"):
                            status_value = "error"
                            total_sites_checked += 1
                            incomplete_records += 1
                        else:
                            incomplete_records += 1
                            continue
                        if raw_status in ("claimed", "found", "true"):
                            total_sites_checked += 1
                            if profile_url:
                                found.append({
                                    "siteName": site_name[:160],
                                    "url": profile_url[:500],
                                    "status": status_value,
                                    "profileData": {},
                                    "tags": [],
                                })
                            else:
                                incomplete_records += 1
            except (OSError, UnicodeError, csv.Error):
                return "failed", None, "Maigret CSV report could not be read.", "maigret"
            if site_rows_seen == 0:
                return "failed", None, "Maigret CSV report contained no site results.", "maigret"
            if code != 0 and total_sites_checked == 0:
                return "failed", None, "Maigret exited unsuccessfully without usable site results.", "maigret"
            if code != 0:
                status = "partial"
                error = "Maigret ended with a non-zero code after producing bounded site results."
            elif incomplete_records:
                status = "partial" if found or total_sites_checked else "failed"
                error = "Maigret returned incomplete, skipped, or unclassified site results."
            else:
                status = "completed"
                error = None
            return status, {"found": found[:300], "totalSitesChecked": total_sites_checked}, error, "maigret"
        if tool == "sherlock":
            code, stdout, stderr, failure = await run_process(
                "/opt/venvs/sherlock/bin/sherlock",
                [args["username"], "--csv", "--timeout", "12", "--no-color", "--local", "--output", str(home / "sherlock.txt")],
                timeout_ms=timeout_ms, max_output_bytes=max_output_bytes, tool_home=home,
            )
            if failure:
                return failure, None, "Sherlock runner " + failure, "sherlock"
            # Sherlock v0.16.2 serializes QueryStatus values such as Claimed,
            # Available, Unknown, and WAF into its CSV exists column. It does
            # not serialize booleans; treating this field as true lost every hit.
            result_path = home / (args["username"] + ".csv")
            if not result_path.is_file():
                return "failed", None, "Sherlock exited without its expected CSV report.", "sherlock"
            import csv
            found: list[dict[str, Any]] = []
            total_sites_checked = 0
            site_rows_seen = 0
            incomplete_records = 0
            required_headers = {"username", "name", "url_main", "url_user", "exists", "http_status", "response_time_s"}
            try:
                with result_path.open("r", encoding="utf-8", newline="") as stream:
                    reader = csv.DictReader(stream)
                    if not reader.fieldnames or not required_headers.issubset(set(reader.fieldnames)):
                        return "failed", None, "Sherlock returned a malformed CSV report.", "sherlock"
                    for row in reader:
                        site_rows_seen += 1
                        if not isinstance(row, dict) or None in row:
                            incomplete_records += 1
                            continue
                        raw_status = str(row.get("exists") or "").strip().lower()
                        site_name = str(row.get("name") or "").strip()
                        profile_url = str(row.get("url_user") or "").strip()
                        if not site_name or not raw_status:
                            incomplete_records += 1
                            continue
                        if raw_status == "illegal":
                            incomplete_records += 1
                            continue
                        if raw_status in ("claimed", "found", "true"):
                            total_sites_checked += 1
                            if profile_url:
                                found.append({"siteName": site_name[:160], "url": profile_url[:500], "status": "found"})
                            else:
                                incomplete_records += 1
                        elif raw_status in ("available", "not_found", "false"):
                            total_sites_checked += 1
                        elif raw_status in ("unknown", "waf", "error", "unknown_error"):
                            total_sites_checked += 1
                            incomplete_records += 1
                        else:
                            incomplete_records += 1
            except (OSError, UnicodeError, csv.Error):
                return "failed", None, "Sherlock CSV report could not be read.", "sherlock"
            if site_rows_seen == 0:
                return "failed", None, "Sherlock CSV report contained no site results.", "sherlock"
            if code != 0 and total_sites_checked == 0:
                return "failed", None, "Sherlock exited unsuccessfully without usable site results.", "sherlock"
            if code != 0:
                status = "partial"
                error = "Sherlock ended with a non-zero code after producing bounded site results."
            elif incomplete_records:
                status = "partial" if found or total_sites_checked else "failed"
                error = "Sherlock returned incomplete, skipped, or unclassified site results."
            else:
                status = "completed"
                error = None
            return status, {
                "found": found[:300],
                "totalSitesChecked": total_sites_checked,
                "incompleteSites": incomplete_records,
            }, error, "sherlock"
        if tool == "theharvester":
            report_base = home / "harvest"
            code, stdout, stderr, failure = await run_process(
                "/opt/venvs/theharvester/bin/theHarvester",
                ["-d", args["domain"], "-b", args["sources"], "-l", "100", "-q", "-f", str(report_base)],
                timeout_ms=timeout_ms, max_output_bytes=max_output_bytes, tool_home=home,
            )
            if failure:
                return failure, None, "theHarvester runner " + failure, "theharvester"
            report_path = Path(str(report_base) + ".json")
            if not report_path.is_file():
                return "failed", None, "theHarvester exited without its expected JSON report.", "theharvester"
            try:
                data = json.loads(report_path.read_text("utf-8"))
            except (OSError, UnicodeError, json.JSONDecodeError):
                return "failed", None, "theHarvester returned an unreadable or malformed JSON report.", "theharvester"
            if not isinstance(data, dict) or not isinstance(data.get("hosts"), list):
                return "failed", None, "theHarvester report did not contain its required hosts array.", "theharvester"
            emails = data.get("emails", [])
            hosts = data["hosts"]
            ips = data.get("ips", [])
            if not isinstance(emails, list) or not isinstance(ips, list):
                return "failed", None, "theHarvester report contained invalid email or IP arrays.", "theharvester"
            if any(not isinstance(item, str) for values in (emails, hosts, ips) for item in values):
                return "failed", None, "theHarvester report contained non-string observations.", "theharvester"
            has_observations = bool(emails or hosts or ips)
            payload = {
                "emails": emails[:100],
                "subdomains": hosts[:200],
                "hosts": hosts[:200],
                "ips": ips[:200],
                "totalFound": len(emails) + len(hosts) + len(ips),
            }
            if code != 0 and not has_observations:
                return "failed", None, "theHarvester exited unsuccessfully without structured result output.", "theharvester"
            if not has_observations:
                # The pinned JSON format records leads, not per-source query
                # outcomes. A zero-hit report alone cannot prove the passive
                # engines completed successfully instead of swallowing errors.
                return "partial", payload, "theHarvester produced an empty report without source-completion evidence; no negative finding is established.", "theharvester"
            return ("completed" if code == 0 else "partial"), payload, None if code == 0 else "theHarvester ended with a non-zero code after producing bounded results.", "theharvester"
    return "unavailable", None, "No CLI executor was registered for the requested tool.", tool


def classify_holehe_result(found: list[Any]) -> tuple[str, str | None]:
    error_count = sum(1 for item in found if isinstance(item, dict) and item.get("error") is True)
    rate_limit_count = sum(1 for item in found if isinstance(item, dict) and item.get("rateLimit") is True)
    if error_count or rate_limit_count:
        return "partial", f"Holehe returned {error_count} service errors and {rate_limit_count} rate-limit events; the scan is incomplete."
    return "completed", None


def classify_spiderfoot_export(scan_status: str, raw_event_count: int, normalized_event_count: int, output_truncated: bool) -> tuple[str, str | None]:
    partial = scan_status != "FINISHED" or raw_event_count > normalized_event_count or output_truncated
    return ("partial", "SpiderFoot scan or bounded export was incomplete.") if partial else ("completed", None)


def spiderfoot_target_for_type(target: str, target_type: str) -> str:
    if target_type == "person":
        return '"' + target.replace('"', " ").strip() + '"'
    return target


MAX_SPIDERFOOT_CONTROL_RESPONSE_BYTES = 16_384
MAX_SPIDERFOOT_RAW_EXPORT_BYTES = 4_000_000


async def read_spiderfoot_response_capped(response: httpx.Response, max_bytes: int) -> tuple[bytes, bool]:
    """Read a decoded HTTP body under a hard memory bound; never buffer arbitrary SpiderFoot JSON."""
    limit = max(1, min(int(max_bytes), MAX_SPIDERFOOT_RAW_EXPORT_BYTES))
    body = bytearray()
    async for chunk in response.aiter_bytes():
        remaining = limit - len(body)
        if remaining <= 0:
            await response.aclose()
            return bytes(body), True
        body.extend(chunk[:remaining])
        if len(chunk) > remaining:
            await response.aclose()
            return bytes(body), True
    return bytes(body), False


async def run_spiderfoot(target: str, target_type: str, profile: str, timeout_ms: int, max_output_bytes: int, request_id: str) -> tuple[str, dict[str, Any] | None, str | None]:
    global spiderfoot_http
    if not spiderfoot_is_healthy() or spiderfoot_http is None:
        return "unavailable", None, spiderfoot_start_error or "SpiderFoot is not ready."
    modules = PROFILE_MODULES.get(profile)
    if not modules:
        return "failed", None, "SpiderFoot profile is not allowlisted."
    if set(modules) - SPIDERFOOT_ALLOWED_MODULES:
        return "failed", None, "SpiderFoot profile requested a module outside the canonical allowlist."
    scan_id: str | None = None
    started = time.monotonic()
    target_value = spiderfoot_target_for_type(target, target_type)
    try:
        async with spiderfoot_http.stream(
            "POST", SPIDERFOOT_BASE_URL + "/startscan",
            data={
                "scanname": "apex-" + request_id[:36],
                "scantarget": target_value,
                "modulelist": ",".join(modules),
                "typelist": "",
                "usecase": "",
            },
            headers={"Accept": "application/json"},
            timeout=10,
        ) as start_response:
            if not start_response.is_success:
                return "failed", None, "SpiderFoot rejected scan startup (HTTP " + str(start_response.status_code) + ")."
            start_body, start_truncated = await read_spiderfoot_response_capped(start_response, MAX_SPIDERFOOT_CONTROL_RESPONSE_BYTES)
            if start_truncated:
                return "failed", None, "SpiderFoot scan startup exceeded its bounded response size."
            try:
                start_data = json.loads(start_body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                return "failed", None, "SpiderFoot returned a malformed scan-creation response."
        if not isinstance(start_data, list) or len(start_data) < 2 or start_data[0] != "SUCCESS":
            return "failed", None, "SpiderFoot returned an invalid scan-creation response."
        scan_id = str(start_data[1])
        deadline = started + timeout_ms / 1000
        status = ""
        while time.monotonic() < deadline:
            async with spiderfoot_http.stream(
                "GET", SPIDERFOOT_BASE_URL + "/scanstatus", params={"id": scan_id}, timeout=5,
            ) as status_response:
                if status_response.is_success:
                    status_body, status_truncated = await read_spiderfoot_response_capped(status_response, MAX_SPIDERFOOT_CONTROL_RESPONSE_BYTES)
                    if status_truncated:
                        raise ValueError("SpiderFoot status response exceeded its bounded size.")
                    try:
                        status_data = json.loads(status_body)
                    except (json.JSONDecodeError, UnicodeDecodeError) as error:
                        raise ValueError("SpiderFoot returned malformed scan status.") from error
                    if isinstance(status_data, list) and len(status_data) >= 6:
                        status = str(status_data[5])
                        if status in ("FINISHED", "ABORTED", "ERROR-FAILED"):
                            break
            await asyncio.sleep(0.75)
        else:
            try:
                await spiderfoot_http.get(SPIDERFOOT_BASE_URL + "/stopscan", params={"id": scan_id}, timeout=3)
            except httpx.HTTPError:
                pass
            return "timeout", None, "SpiderFoot exceeded its scan deadline; the scan was asked to stop."
        if status != "FINISHED":
            return "partial", {"observations": [], "eventsReceived": 0, "partial": True, "scanId": scan_id}, "SpiderFoot ended in status " + status + "."
        async with spiderfoot_http.stream(
            "POST", SPIDERFOOT_BASE_URL + "/scanexportjsonmulti",
            data={"ids": scan_id},
            headers={"Accept": "application/json"},
            timeout=10,
        ) as result_response:
            if not result_response.is_success:
                return "partial", {"observations": [], "eventsReceived": 0, "partial": True, "scanId": scan_id, "targetType": target_type, "profile": profile}, "SpiderFoot scan finished but its result export failed."
            raw_export, export_truncated = await read_spiderfoot_response_capped(result_response, min(MAX_SPIDERFOOT_RAW_EXPORT_BYTES, max_output_bytes * 4))
        if export_truncated:
            return "partial", {"observations": [], "eventsReceived": 0, "partial": True, "scanId": scan_id, "targetType": target_type, "profile": profile}, "SpiderFoot result export exceeded its bounded response size."
        try:
            raw_events = json.loads(raw_export)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return "failed", None, "SpiderFoot returned a malformed event list."
        if not isinstance(raw_events, list):
            return "failed", None, "SpiderFoot returned a malformed event list."
        observations: list[dict[str, Any]] = []
        output_truncated = len(raw_events) > 300
        for event in raw_events[:300]:
            if not isinstance(event, dict):
                continue
            value = str(event.get("data") or "").strip()
            event_type = str(event.get("event_type") or "").strip()
            source_module = str(event.get("module") or "").strip()
            observed_at = str(event.get("last_seen") or "").strip()
            if not value or not event_type or not source_module or not observed_at:
                continue
            source_data = str(event.get("source_data") or "")
            url_match = re.search(r"https?://[^\s\"'<>]+", source_data)
            source_url = ""
            if url_match:
                candidate = url_match.group(0).rstrip(".,);]")
                try:
                    parsed = urlparse(candidate)
                    if parsed.scheme in ("http", "https") and parsed.hostname and len(candidate) <= 500:
                        source_url = candidate
                except ValueError:
                    source_url = ""
            observations.append({
                "scanId": scan_id,
                "targetType": target_type,
                "profile": profile,
                "sourceModule": source_module[:120],
                "eventType": event_type[:120],
                "value": value[:2_000],
                **({"sourceUrl": source_url} if source_url else {}),
                "observedAt": observed_at[:60],
                # SpiderFoot exports do not expose a causal parent event ID in this API.
                # Do not invent one; retain scan/module provenance instead.
            })
            if len(canonical_json(observations)) > max_output_bytes:
                observations.pop()
                output_truncated = True
                break
        tool_status, error = classify_spiderfoot_export(status, len(raw_events), len(observations), output_truncated)
        payload = {"observations": observations, "eventsReceived": len(raw_events), "partial": tool_status == "partial", "scanId": scan_id, "target": target, "targetType": target_type, "profile": profile}
        return tool_status, payload, error
    except asyncio.CancelledError:
        if scan_id:
            try:
                await spiderfoot_http.get(SPIDERFOOT_BASE_URL + "/stopscan", params={"id": scan_id}, timeout=2)
            except Exception:
                pass
        raise
    except Exception:
        if scan_id:
            try:
                await spiderfoot_http.get(SPIDERFOOT_BASE_URL + "/stopscan", params={"id": scan_id}, timeout=2)
            except Exception:
                pass
        return "failed", None, "SpiderFoot execution failed before a complete result could be normalized."


async def perform_tool(
    request: ExecuteRequest,
    *,
    isolation_proof: dict[str, Any] | None = None,
) -> dict[str, Any]:
    args = validate_args(request.tool, request.args)
    initial_proof = isolation_proof if isolation_proof is not None else load_isolation_proof()
    correlation = request.correlation.model_dump(exclude_none=True) if request.correlation else {}

    def unavailable_result() -> dict[str, Any]:
        now = utc_iso()
        return {
            "requestId": request.requestId, "tool": request.tool, "status": "unavailable",
            "toolVersion": None, "result": None,
            "error": "Trusted network-isolation attestation is unavailable or changed before execution.",
            "startedAt": now, "finishedAt": now, "correlation": correlation,
            "executorId": None, "workerImageDigest": None, "egressProxyImageDigest": None,
            "isolationProofIssuedAt": None, "isolationProofExpiresAt": None,
        }

    if not initial_proof:
        return unavailable_result()
    timeout_ms = min(request.timeoutMs, TOOL_TIMEOUT_DEFAULTS[request.tool], MAX_RUNTIME_MS_CAP)
    async with semaphore:
        # Availability can expire or the operator can replace/revoke the signed
        # isolation proof while a request waits for capacity. Revalidate at the
        # actual execution boundary and require the same attested deployment.
        proof = load_isolation_proof()
        if not proof or proof != initial_proof:
            return unavailable_result()
        started_at = utc_iso()
        if request.tool == "spiderfoot":
            status, result, error = await run_spiderfoot(
                args["target"], args["targetType"], args["profile"],
                timeout_ms, request.maxOutputBytes, request.requestId,
            )
            version = TOOL_VERSIONS["spiderfoot"] if spiderfoot_is_healthy() else None
        else:
            status, result, error, version = await run_cli_tool(request.tool, args, timeout_ms, request.maxOutputBytes)
            version = TOOL_VERSIONS.get(request.tool) if status in ("completed", "partial") else version
        finished_at = utc_iso()
        if result is not None and len(canonical_json(result)) > request.maxOutputBytes:
            return {
                "requestId": request.requestId, "tool": request.tool, "status": "failed",
                "toolVersion": version, "result": None, "error": "Result envelope exceeded the output budget.",
                "startedAt": started_at, "finishedAt": finished_at, "correlation": correlation,
                "executorId": (proof or {}).get("executorId"), "workerImageDigest": (proof or {}).get("workerImageDigest"),
                "egressProxyImageDigest": (proof or {}).get("egressProxyImageDigest"),
                "isolationProofIssuedAt": (proof or {}).get("issuedAt"), "isolationProofExpiresAt": (proof or {}).get("expiresAt"),
            }
        return {
            "requestId": request.requestId, "tool": request.tool, "status": status,
            "toolVersion": version, "result": result, "error": error,
            "startedAt": started_at, "finishedAt": finished_at, "correlation": correlation,
            "executorId": (proof or {}).get("executorId"), "workerImageDigest": (proof or {}).get("workerImageDigest"),
            "egressProxyImageDigest": (proof or {}).get("egressProxyImageDigest"),
            "isolationProofIssuedAt": (proof or {}).get("issuedAt"), "isolationProofExpiresAt": (proof or {}).get("expiresAt"),
        }


async def require_authenticated_request(request: Request, authorization: str | None) -> None:
    if not TOKEN or authorization != "Bearer " + TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized worker request.")
    # Body signatures are verified by /v1/execute against the exact canonical
    # bytes emitted by the API client. GET endpoints are protected by bearer auth.


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Tool processes share the container UID but never receive the API HMAC token.
    # Mark this process non-dumpable so same-UID subprocesses cannot read its
    # /proc/<pid>/environ or attach via ptrace. Failure means no network tools start.
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(4, 0, 0, 0, 0) != 0:  # PR_SET_DUMPABLE=4
        raise RuntimeError("Could not protect worker process from same-UID inspection.")
    os.umask(0o077)
    await initialize_cli_tool_readiness()
    await start_spiderfoot()
    yield
    await stop_spiderfoot()


app = FastAPI(title="Apex Python OSINT Worker", version="1.0.0", lifespan=lifespan)


@app.get("/livez")
async def livez() -> dict[str, str]:
    return {"status": "alive"}


@app.get("/healthz")
async def healthz() -> JSONResponse:
    tools, versions = resolve_worker_tools()
    isolation = load_isolation_proof()
    healthy = bool(isolation and TOKEN and tools)
    body = {
        "status": "ok" if healthy else "unavailable",
        "isolationProofValid": isolation is not None,
        "availableTools": tools if isolation else [],
        "toolVersions": versions if isolation else {},
    }
    return JSONResponse(body, status_code=200 if healthy else 503, headers={"Cache-Control": "no-store"})


@app.get("/v1/attestation")
async def attestation(request: Request, authorization: str | None = Header(default=None)) -> JSONResponse:
    await require_authenticated_request(request, authorization)
    proof = load_isolation_proof()
    tools, versions = resolve_worker_tools()
    if not proof or not TOKEN:
        raise HTTPException(status_code=503, detail="Trusted network-isolation attestation is unavailable.")
    if not tools:
        raise HTTPException(status_code=503, detail="No executable OSINT tools are healthy.")
    expires = min(
        datetime.fromisoformat(str(proof["expiresAt"]).replace("Z", "+00:00")),
        utcnow() + timedelta(minutes=10),
    )
    payload = {
        "state": "attested",
        "executorId": str(proof.get("executorId", "apex-python-osint-worker"))[:160],
        "networkNamespace": REQUIRED_NETWORK_NAMESPACE,
        "egressBroker": REQUIRED_EGRESS_BROKER,
        "filesystemMode": "ephemeral-isolated",
        "maxOutputBytes": MAX_OUTPUT_BYTES_CAP,
        "maxRuntimeMs": MAX_RUNTIME_MS_CAP,
        "allowedCapabilities": ["network_osint"],
        "availableTools": tools,
        "toolVersions": versions,
        "workerImageDigest": str(proof.get("workerImageDigest", "")),
        "egressProxyImageDigest": str(proof.get("egressProxyImageDigest", "")),
        "isolationProofIssuedAt": str(proof.get("issuedAt", "")),
        "isolationProofExpiresAt": str(proof.get("expiresAt", "")),
        "issuedAt": utc_iso(),
        "expiresAt": utc_iso(expires),
    }
    return JSONResponse(signed_envelope(payload), headers={"Cache-Control": "no-store"})


def _prune_request_state() -> None:
    now = time.monotonic()
    for table in (seen_request_ids, cancelled_request_ids):
        expired = [key for key, expiry in table.items() if expiry <= now]
        for key in expired:
            table.pop(key, None)
        while len(table) > MAX_TRACKED_REQUEST_IDS:
            oldest = min(table, key=table.get)
            table.pop(oldest, None)


def claim_request_id(request_id: str) -> bool:
    _prune_request_state()
    if request_id in seen_request_ids:
        return False
    seen_request_ids[request_id] = time.monotonic() + REQUEST_REPLAY_WINDOW_SECONDS
    return True


def consume_cancel_request(request_id: str) -> bool:
    _prune_request_state()
    expiry = cancelled_request_ids.pop(request_id, None)
    return expiry is not None and expiry > time.monotonic()


async def request_cancellation(request_id: str) -> str:
    _prune_request_state()
    task = active_requests.get(request_id)
    if task is not None and not task.done():
        task.cancel()
        try:
            await asyncio.wait_for(asyncio.shield(task), timeout=5.0)
        except asyncio.TimeoutError:
            return "cancellation_timeout"
        except asyncio.CancelledError:
            return "cancelled"
        return "cancelled"
    if request_id in seen_request_ids:
        return "not_running"
    cancelled_request_ids[request_id] = time.monotonic() + REQUEST_REPLAY_WINDOW_SECONDS
    return "cancel_reserved"


async def _verify_signed_body(request: Request, *, max_bytes: int) -> bytes:
    raw_body = await request.body()
    if len(raw_body) > max_bytes:
        raise HTTPException(status_code=413, detail="Worker request exceeds its input bound.")
    signature = request.headers.get("x-apex-request-signature", "")
    if not re.fullmatch(r"[0-9a-fA-F]{64}", signature):
        raise HTTPException(status_code=401, detail="Missing request signature.")
    expected = hmac.new(TOKEN.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature.lower()):
        raise HTTPException(status_code=401, detail="Invalid request signature.")
    return raw_body


class CancelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requestId: str = Field(min_length=16, max_length=80)
    requestedAt: str


@app.post("/v1/cancel")
async def cancel(request: Request, authorization: str | None = Header(default=None)) -> JSONResponse:
    await require_authenticated_request(request, authorization)
    raw_body = await _verify_signed_body(request, max_bytes=4_096)
    try:
        data = CancelRequest.model_validate(json.loads(raw_body))
        requested_at = datetime.fromisoformat(data.requestedAt.replace("Z", "+00:00"))
        if abs((utcnow() - requested_at).total_seconds()) > 120:
            raise HTTPException(status_code=400, detail="Cancellation timestamp is outside the accepted window.")
        status = await request_cancellation(data.requestId)
        return JSONResponse(signed_envelope({"requestId": data.requestId, "status": status}), headers={"Cache-Control": "no-store"})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cancellation request.")


@app.post("/v1/execute")
async def execute(request: Request, authorization: str | None = Header(default=None)) -> JSONResponse:
    await require_authenticated_request(request, authorization)
    raw_body = await _verify_signed_body(request, max_bytes=64_000)
    try:
        request_data = ExecuteRequest.model_validate(json.loads(raw_body))
        proof = load_isolation_proof()
        if not proof:
            raise HTTPException(status_code=503, detail="Trusted network-isolation attestation is unavailable.")
        tools, _ = resolve_worker_tools()
        if request_data.tool not in tools:
            raise HTTPException(status_code=503, detail="Requested tool is not healthy and available.")
        requested_at = datetime.fromisoformat(request_data.requestedAt.replace("Z", "+00:00"))
        if abs((utcnow() - requested_at).total_seconds()) > 120:
            raise HTTPException(status_code=400, detail="Request timestamp is outside the accepted window.")
        if not claim_request_id(request_data.requestId):
            raise HTTPException(status_code=409, detail="Duplicate or replayed worker request ID.")
        if consume_cancel_request(request_data.requestId):
            now = utc_iso()
            return JSONResponse(signed_envelope({
                "requestId": request_data.requestId, "tool": request_data.tool, "status": "cancelled",
                "toolVersion": None, "result": None, "error": "Request was cancelled before execution.",
                "startedAt": now, "finishedAt": now, "correlation": request_data.correlation.model_dump(exclude_none=True) if request_data.correlation else {},
                "executorId": proof.get("executorId"), "workerImageDigest": proof.get("workerImageDigest"),
                "egressProxyImageDigest": proof.get("egressProxyImageDigest"),
                "isolationProofIssuedAt": proof.get("issuedAt"), "isolationProofExpiresAt": proof.get("expiresAt"),
            }), headers={"Cache-Control": "no-store"})
        task = asyncio.current_task()
        if task is None:
            raise HTTPException(status_code=500, detail="Worker task context is unavailable.")
        active_requests[request_data.requestId] = task
        try:
            result = await perform_tool(request_data, isolation_proof=proof)
        except asyncio.CancelledError:
            now = utc_iso()
            result = {
                "requestId": request_data.requestId, "tool": request_data.tool, "status": "cancelled",
                "toolVersion": None, "result": None, "error": "Execution was cancelled and worker cleanup completed.",
                "startedAt": now, "finishedAt": utc_iso(),
                "correlation": request_data.correlation.model_dump(exclude_none=True) if request_data.correlation else {},
                "executorId": proof.get("executorId"), "workerImageDigest": proof.get("workerImageDigest"),
                "egressProxyImageDigest": proof.get("egressProxyImageDigest"),
                "isolationProofIssuedAt": proof.get("issuedAt"), "isolationProofExpiresAt": proof.get("expiresAt"),
            }
        finally:
            if active_requests.get(request_data.requestId) is task:
                active_requests.pop(request_data.requestId, None)
        return JSONResponse(signed_envelope(result), headers={"Cache-Control": "no-store"})
    except HTTPException:
        raise
    except asyncio.CancelledError:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)[:300])
    except Exception:
        raise HTTPException(status_code=500, detail="Canonical OSINT worker execution failed.")
