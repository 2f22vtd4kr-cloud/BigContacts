from __future__ import annotations

import asyncio
import base64
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
REQUIRED_NETWORK_NAMESPACE = "kubernetes-egress-policy-apex-osint-v1"
REQUIRED_EGRESS_BROKER = "apex-public-egress-proxy-v1"
MAX_ATTESTATION_PROOF_AGE_MS = 7 * 24 * 60 * 60 * 1000
MAX_OUTPUT_BYTES_CAP = 1_000_000
MAX_RUNTIME_MS_CAP = 120_000
MAX_TOOL_CONCURRENCY = max(1, min(4, int(os.getenv("APEX_OSINT_MAX_CONCURRENCY", "2"))))
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
        required_policies = {
            "apex-osint-worker-ingress",
            "apex-osint-worker-egress",
            "apex-osint-proxy-ingress",
            "apex-osint-proxy-egress",
        }
        if set(payload.get("verifiedNetworkPolicies", [])) != required_policies:
            return None
        if payload.get("proxyConfigSha256") != os.getenv("APEX_EGRESS_PROXY_CONFIG_SHA256", ""):
            return None
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", str(payload.get("workerImageDigest", ""))):
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
        if executable.is_file():
            if tool == "spiderfoot" and not spiderfoot_is_healthy():
                continue
            tools.append(tool)
            versions[tool] = TOOL_VERSIONS[tool]
    return tools, versions


def spiderfoot_is_healthy() -> bool:
    return spiderfoot_process is not None and spiderfoot_process.returncode is None and spiderfoot_start_error is None


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
            str(binary), str(source), "-l", "127.0.0.1:5001", "-q",
            stdin=asyncio.subprocess.DEVNULL, stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL, env=env, cwd="/opt/tools/spiderfoot",
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


class ExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requestId: str = Field(min_length=16, max_length=80)
    tool: Literal["holehe", "maigret", "sherlock", "theharvester", "spiderfoot"]
    args: dict[str, Any]
    timeoutMs: int = Field(ge=1000, le=MAX_RUNTIME_MS_CAP)
    maxOutputBytes: int = Field(ge=1024, le=MAX_OUTPUT_BYTES_CAP)
    requestedAt: str

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
    if process.returncode is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
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
    process: asyncio.subprocess.Process | None = None
    try:
        process = await asyncio.create_subprocess_exec(
            executable, *args, cwd=str(tool_home), env=env,
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
            {wait_task, overflow_task}, timeout=timeout_ms / 1000,
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
        stdout, stderr = await asyncio.gather(stdout_task, stderr_task)
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
            found = result.get("found", [])
            if not isinstance(found, list):
                found = []
            checked = len(found)
            positives = sum(1 for item in found if isinstance(item, dict) and item.get("exists") is True)
            return "completed", {"found": found[:250], "totalChecked": checked, "totalFound": positives}, None, "holehe"
        if tool == "maigret":
            report_dir = home / "reports"
            code, stdout, stderr, failure = await run_process(
                "/opt/venvs/maigret/bin/maigret",
                [args["username"], "--json", "ndjson", "--folderoutput", str(report_dir), "--timeout", "8", "--no-progressbar", "--top-sites", "150", "--no-color"],
                timeout_ms=timeout_ms, max_output_bytes=max_output_bytes, tool_home=home,
            )
            if failure:
                return failure, None, "Maigret runner " + failure, "maigret"
            report_path = report_dir / (args["username"] + "_ndjson.json")
            if not report_path.is_file() and code != 0:
                return "failed", None, "Maigret exited without a structured report.", "maigret"
            raw_report = report_path.read_text("utf-8", errors="replace") if report_path.is_file() else ""
            records: list[dict[str, Any]] = []
            try:
                decoded = json.loads(raw_report)
                if isinstance(decoded, list):
                    records = [item for item in decoded if isinstance(item, dict)]
                elif isinstance(decoded, dict):
                    records = [decoded]
            except json.JSONDecodeError:
                for line in raw_report.splitlines():
                    try:
                        item = json.loads(line)
                        if isinstance(item, dict):
                            records.append(item)
                    except json.JSONDecodeError:
                        continue
            found = []
            for item in records[:300]:
                raw_status = str(item.get("status") or item.get("status_value") or "").lower()
                status_value = (
                    "found" if raw_status in ("claimed", "found", "true")
                    else "not_found" if raw_status in ("available", "not_found", "false")
                    else "error" if raw_status in ("error", "unknown_error")
                    else "unknown"
                )
                profile_url = str(item.get("url") or item.get("profile_url") or "")
                found.append({
                    "siteName": str(item.get("site") or item.get("site_name") or item.get("name") or "")[:160],
                    "url": profile_url[:500],
                    "status": status_value,
                    "profileData": item.get("metadata") if isinstance(item.get("metadata"), dict) else {},
                    "tags": item.get("tags") if isinstance(item.get("tags"), list) else [],
                })
            return ("completed" if code == 0 else "partial"), {"found": found, "totalSitesChecked": len(found)}, None if code == 0 else "Maigret ended with a non-zero code after producing bounded results.", "maigret"
        if tool == "sherlock":
            output_file = home / "sherlock.csv"
            code, stdout, stderr, failure = await run_process(
                "/opt/venvs/sherlock/bin/sherlock",
                [args["username"], "--csv", "--timeout", "12", "--no-color", "--local", "--output", str(home / "sherlock.txt")],
                timeout_ms=timeout_ms, max_output_bytes=max_output_bytes, tool_home=home,
            )
            if failure:
                return failure, None, "Sherlock runner " + failure, "sherlock"
            result_path = home / (args["username"] + ".csv")
            if not result_path.exists():
                result_path = output_file
            found: list[dict[str, Any]] = []
            # --csv writes a local CSV file. Read only the fields the adapter owns.
            if result_path.exists():
                import csv
                try:
                    with result_path.open("r", encoding="utf-8", newline="") as stream:
                        for row in csv.DictReader(stream):
                            exists = str(row.get("exists", "")).lower() == "true"
                            if exists and row.get("url_user"):
                                found.append({"siteName": str(row.get("name", ""))[:160], "url": str(row["url_user"])[:500]})
                except (OSError, csv.Error):
                    pass
            if not found:
                for line in stdout.decode("utf-8", errors="replace").splitlines():
                    match = re.match(r"^\s*\[\+\]\s+(.+?):\s+(https?://\S+)\s*$", line)
                    if match:
                        found.append({"siteName": match.group(1)[:160], "url": match.group(2)[:500]})
            if code != 0 and not found:
                return "failed", None, "Sherlock exited without a verified profile output.", "sherlock"
            return ("completed" if code == 0 else "partial"), {"found": found[:300], "totalSitesChecked": max(len(found), len(stdout.decode("utf-8", errors="ignore").splitlines()))}, None if code == 0 else "Sherlock ended with a non-zero code after producing bounded results.", "sherlock"
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
            try:
                data = json.loads(report_path.read_text("utf-8")) if report_path.exists() else {}
            except (OSError, json.JSONDecodeError):
                data = {}
            emails = data.get("emails", []) if isinstance(data, dict) else []
            hosts = data.get("hosts", []) if isinstance(data, dict) else []
            ips = data.get("ips", []) if isinstance(data, dict) else []
            if code != 0 and not any((emails, hosts, ips)):
                return "failed", None, "theHarvester exited without structured result output.", "theharvester"
            return ("completed" if code == 0 else "partial"), {
                "emails": emails[:100] if isinstance(emails, list) else [],
                "subdomains": hosts[:200] if isinstance(hosts, list) else [],
                "hosts": hosts[:200] if isinstance(hosts, list) else [],
                "ips": ips[:200] if isinstance(ips, list) else [],
                "totalFound": sum(len(value) for value in (emails, hosts, ips) if isinstance(value, list)),
            }, None if code == 0 else "theHarvester ended with a non-zero code after producing bounded results.", "theharvester"
    return "unavailable", None, "No CLI executor was registered for the requested tool.", tool


def spiderfoot_target_for_type(target: str, target_type: str) -> str:
    if target_type == "person":
        return '"' + target.replace('"', " ").strip() + '"'
    return target


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
        start_response = await spiderfoot_http.post(
            SPIDERFOOT_BASE_URL + "/startscan",
            data={
                "scanname": "apex-" + request_id[:36],
                "scantarget": target_value,
                "modulelist": ",".join(modules),
                "typelist": "",
                "usecase": "",
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        if not start_response.is_success:
            return "failed", None, "SpiderFoot rejected scan startup (HTTP " + str(start_response.status_code) + ")."
        start_data = start_response.json()
        if not isinstance(start_data, list) or len(start_data) < 2 or start_data[0] != "SUCCESS":
            return "failed", None, "SpiderFoot returned an invalid scan-creation response."
        scan_id = str(start_data[1])
        deadline = started + timeout_ms / 1000
        status = ""
        while time.monotonic() < deadline:
            response = await spiderfoot_http.get(
                SPIDERFOOT_BASE_URL + "/scanstatus", params={"id": scan_id}, timeout=5,
            )
            if response.is_success:
                status_data = response.json()
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
        result_response = await spiderfoot_http.post(
            SPIDERFOOT_BASE_URL + "/scanexportjsonmulti",
            data={"ids": scan_id},
            headers={"Accept": "application/json"},
            timeout=10,
        )
        if not result_response.is_success:
            return "partial", {"observations": [], "eventsReceived": 0, "partial": True, "scanId": scan_id}, "SpiderFoot scan finished but its result export failed."
        raw_events = result_response.json()
        if not isinstance(raw_events, list):
            return "failed", None, "SpiderFoot returned a malformed event list."
        observations: list[dict[str, Any]] = []
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
                "target": target,
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
                break
        payload = {"observations": observations, "eventsReceived": len(raw_events), "partial": len(raw_events) > len(observations), "scanId": scan_id}
        return ("partial" if status != "FINISHED" else "completed"), payload, None
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


async def perform_tool(request: ExecuteRequest) -> dict[str, Any]:
    args = validate_args(request.tool, request.args)
    timeout_ms = min(request.timeoutMs, TOOL_TIMEOUT_DEFAULTS[request.tool], MAX_RUNTIME_MS_CAP)
    async with semaphore:
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
                "startedAt": started_at, "finishedAt": finished_at,
            }
        return {
            "requestId": request.requestId, "tool": request.tool, "status": status,
            "toolVersion": version, "result": result, "error": error,
            "startedAt": started_at, "finishedAt": finished_at,
        }


async def require_authenticated_request(request: Request, authorization: str | None) -> None:
    if not TOKEN or authorization != "Bearer " + TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized worker request.")
    # Body signatures are verified by /v1/execute against the exact canonical
    # bytes emitted by the API client. GET endpoints are protected by bearer auth.


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await start_spiderfoot()
    yield
    await stop_spiderfoot()


app = FastAPI(title="Apex Python OSINT Worker", version="1.0.0", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    tools, versions = resolve_worker_tools()
    isolation = load_isolation_proof()
    return {
        "status": "ok" if isolation and TOKEN else "unavailable",
        "isolationProofValid": isolation is not None,
        "availableTools": tools if isolation else [],
        "toolVersions": versions if isolation else {},
    }


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
        "expiresAt": utc_iso(expires),
    }
    return JSONResponse(signed_envelope(payload), headers={"Cache-Control": "no-store"})


@app.post("/v1/execute")
async def execute(request: Request, authorization: str | None = Header(default=None)) -> JSONResponse:
    await require_authenticated_request(request, authorization)
    raw_body = await request.body()
    if len(raw_body) > 64_000:
        raise HTTPException(status_code=413, detail="Request body exceeds the worker input bound.")
    signature = request.headers.get("x-apex-request-signature", "")
    if not re.fullmatch(r"[0-9a-fA-F]{64}", signature):
        raise HTTPException(status_code=401, detail="Missing request signature.")
    expected = hmac.new(TOKEN.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature.lower()):
        raise HTTPException(status_code=401, detail="Invalid request signature.")
    if not load_isolation_proof():
        raise HTTPException(status_code=503, detail="Trusted network-isolation attestation is unavailable.")
    try:
        body = json.loads(raw_body)
        request_data = ExecuteRequest.model_validate(body)
        tools, _ = resolve_worker_tools()
        if request_data.tool not in tools:
            raise HTTPException(status_code=503, detail="Requested tool is not healthy and available.")
        # Reject stale requests without logging the target or raw input body.
        requested_at = datetime.fromisoformat(request_data.requestedAt.replace("Z", "+00:00"))
        if abs((utcnow() - requested_at).total_seconds()) > 120:
            raise HTTPException(status_code=400, detail="Request timestamp is outside the accepted window.")
        result = await perform_tool(request_data)
        return JSONResponse(signed_envelope(result), headers={"Cache-Control": "no-store"})
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)[:300])
    except asyncio.CancelledError:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Canonical OSINT worker execution failed.")
