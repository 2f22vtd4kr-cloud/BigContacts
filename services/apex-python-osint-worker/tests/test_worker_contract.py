from __future__ import annotations

import asyncio
import httpx
import importlib.util
import base64
import hashlib
import os
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
_ATTESTOR_SPEC = importlib.util.spec_from_file_location("apex_worker_attestor", REPO_ROOT / "scripts" / "attest-python-osint-worker.py")
if _ATTESTOR_SPEC is None or _ATTESTOR_SPEC.loader is None:
    raise RuntimeError("Could not load the deployment attestor for contract tests.")
attestor = importlib.util.module_from_spec(_ATTESTOR_SPEC)
sys.modules[_ATTESTOR_SPEC.name] = attestor
_ATTESTOR_SPEC.loader.exec_module(attestor)

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def now_iso(offset: timedelta = timedelta()) -> str:
    return (datetime.now(timezone.utc) + offset).isoformat(timespec="seconds").replace("+00:00", "Z")


def isolation_envelope(private_key: Ed25519PrivateKey, payload: dict) -> dict:
    return {
        "payload": payload,
        "signature": base64.b64encode(private_key.sign(app.canonical_json(payload))).decode("ascii"),
    }


class AttestorCIDRTests(unittest.TestCase):
    def _cluster_resources(self) -> dict[tuple[str, ...], dict]:
        return {
            ("get", "nodes"): {"items": [{"spec": {"podCIDR": "10.244.1.0/24"}}]},
            ("get", "pods", "--all-namespaces"): {"items": [
                {"metadata": {"labels": {"app": "apex-python-osint-worker"}}, "spec": {"hostNetwork": False}, "status": {"podIP": "10.244.1.10"}},
                {"metadata": {"labels": {"app": "apex-osint-egress-proxy"}}, "spec": {"hostNetwork": False}, "status": {"podIP": "10.244.1.11"}},
                {"metadata": {"labels": {"app": "kube-dns"}}, "spec": {"hostNetwork": False}, "status": {"podIP": "10.244.1.12"}},
            ]},
            ("get", "services", "--all-namespaces"): {"items": [
                {"metadata": {"namespace": "default", "name": "kubernetes"}, "spec": {"clusterIP": "10.96.0.1", "clusterIPs": ["10.96.0.1"], "ports": [{"port": 443}]}},
                {"metadata": {"namespace": "kube-system", "name": "kube-dns"}, "spec": {"clusterIP": "10.96.0.10", "clusterIPs": ["10.96.0.10"], "ports": [{"port": 53}]}},
            ]},
        }

    def test_live_node_pod_service_ranges_are_cross_checked_and_known_listener_is_probed(self) -> None:
        with patch.dict(os.environ, {"APEX_K8S_POD_CIDRS": "10.244.0.0/16", "APEX_K8S_SERVICE_CIDRS": "10.96.0.0/12"}):
            with patch.object(attestor, "kubectl_json", side_effect=lambda *args: self._cluster_resources()[tuple(args)]):
                pod_cidrs, service_cidrs, probe_ips = attestor.verify_cluster_cidr_configuration()
        self.assertEqual(pod_cidrs, {"10.244.0.0/16"})
        self.assertEqual(service_cidrs, {"10.96.0.0/12"})
        self.assertEqual(probe_ips, ["10.96.0.1"])

    def test_missing_or_mismatched_pod_ranges_fail_closed(self) -> None:
        with patch.dict(os.environ, {"APEX_K8S_POD_CIDRS": "", "APEX_K8S_SERVICE_CIDRS": "10.96.0.0/12"}):
            with self.assertRaises(RuntimeError):
                attestor.verify_cluster_cidr_configuration()
        with patch.dict(os.environ, {"APEX_K8S_POD_CIDRS": "10.245.0.0/16", "APEX_K8S_SERVICE_CIDRS": "10.96.0.0/12"}):
            with patch.object(attestor, "kubectl_json", side_effect=lambda *args: self._cluster_resources()[tuple(args)]):
                with self.assertRaises(RuntimeError):
                    attestor.verify_cluster_cidr_configuration()

    def test_proxy_policy_requires_exact_cluster_cidr_exceptions(self) -> None:
        policy = {
            "podSelector": {"matchLabels": {"app": "apex-osint-egress-proxy"}},
            "policyTypes": ["Egress"],
            "egress": [
                {
                    "to": [{"namespaceSelector": {"matchLabels": {"kubernetes.io/metadata.name": "kube-system"}}, "podSelector": {"matchLabels": {"k8s-app": "kube-dns"}}}],
                    "ports": [{"protocol": "UDP", "port": 53}, {"protocol": "TCP", "port": 53}],
                },
                {
                    "to": [
                        {"ipBlock": {"cidr": "0.0.0.0/0", "except": sorted(attestor.V4_REQUIRED_EXCEPTIONS)}},
                        {"ipBlock": {"cidr": "::/0", "except": sorted(attestor.V6_REQUIRED_EXCEPTIONS)}},
                    ],
                    "ports": [{"protocol": "TCP", "port": 80}, {"protocol": "TCP", "port": 443}],
                },
            ],
        }
        with self.assertRaises(RuntimeError):
            attestor.verify_proxy_egress(policy, {"100.120.0.0/16"})
        policy["egress"][1]["to"][0]["ipBlock"]["except"].append("100.120.0.0/16")
        attestor.verify_proxy_egress(policy, {"100.120.0.0/16"})


class WorkerArgumentValidationTests(unittest.TestCase):
    def test_holehe_email_is_normalized_and_unknown_fields_are_rejected(self) -> None:
        self.assertEqual(app.validate_args("holehe", {"email": "  Alice@example.com "}), {"email": "alice@example.com"})
        with self.assertRaises(ValueError):
            app.validate_args("holehe", {"email": "alice@example.com", "url": "https://example.com"})

    def test_username_tools_reject_command_injection_and_empty_targets(self) -> None:
        self.assertEqual(app.validate_args("maigret", {"username": "@alice.dev"}), {"username": "alice.dev"})
        for username in ("a", "alice;id", "$(id)", "../alice", "alice\nwhoami"):
            with self.subTest(username=username), self.assertRaises(ValueError):
                app.validate_args("sherlock", {"username": username})

    def test_harvester_sources_are_passive_allowlisted_sources_only(self) -> None:
        result = app.validate_args("theharvester", {"domain": "https://sub.example.com/path", "sources": "bing,crtsh"})
        self.assertEqual(result, {"domain": "sub.example.com", "sources": "bing,crtsh"})
        with self.assertRaises(ValueError):
            app.validate_args("theharvester", {"domain": "example.com", "sources": "bing,linkedin"})
        with self.assertRaises(ValueError):
            app.validate_args("theharvester", {"domain": "127.0.0.1", "sources": "bing"})

    def test_spiderfoot_accepts_public_targets_and_allowlisted_profiles(self) -> None:
        self.assertEqual(
            app.validate_args("spiderfoot", {"target": "1.1.1.1", "targetType": "ip", "profile": "domain-infrastructure"}),
            {"target": "1.1.1.1", "targetType": "ip", "profile": "domain-infrastructure"},
        )
        with self.assertRaises(ValueError):
            app.validate_args("spiderfoot", {"target": "127.0.0.1", "targetType": "ip", "profile": "domain-infrastructure"})
        with self.assertRaises(ValueError):
            app.validate_args("spiderfoot", {"target": "example.com", "targetType": "domain", "profile": "darkweb"})
        with self.assertRaises(ValueError):
            app.validate_args("spiderfoot", {"target": "localhost", "targetType": "domain", "profile": "identity-expansion"})

    def test_profiles_never_enable_unreviewed_sensitive_module_families(self) -> None:
        for profile, modules in app.PROFILE_MODULES.items():
            self.assertLessEqual(set(modules), app.SPIDERFOOT_ALLOWED_MODULES, profile)
            lowered = " ".join(modules).lower()
            self.assertNotRegex(lowered, r"darkweb|tor|breach|credential|password|pastebin")
        self.assertIn("sfp_dnsresolve", app.PROFILE_MODULES["domain-infrastructure"])


class IsolationProofTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="apex-worker-test-")
        self.addCleanup(self.temp.cleanup)
        self.proof_path = Path(self.temp.name) / "isolation-attestation.json"
        self.private_key = Ed25519PrivateKey.generate()
        public_key = self.private_key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        self.payload = {
            "executorId": "test/k8s/apex-worker",
            "policyContractVersion": app.REQUIRED_NETWORK_NAMESPACE,
            "networkNamespace": app.REQUIRED_NETWORK_NAMESPACE,
            "egressBroker": app.REQUIRED_EGRESS_BROKER,
            "verifiedNetworkPolicies": [
                "apex-osint-worker-ingress",
                "apex-osint-worker-egress",
                "apex-osint-proxy-ingress",
                "apex-osint-proxy-egress",
            ],
            "proxyConfigSha256": "f" * 64,
            "workerImageDigest": "sha256:" + "a" * 64,
            "egressProxyImageDigest": "sha256:" + "b" * 64,
            "verifiedPodCIDRs": ["10.244.0.0/16"],
            "verifiedServiceCIDRs": ["10.96.0.0/12"],
            "namespace": "apex-system",
            "publicWorkerHostname": "osint-worker.test.example.com",
            "issuedAt": now_iso(),
            "expiresAt": now_iso(timedelta(hours=2)),
        }
        self.proof_path.write_text(json.dumps(isolation_envelope(self.private_key, self.payload)), encoding="utf-8")
        self.key_patch = patch.object(app, "ISOLATION_PUBLIC_KEY_B64", base64.b64encode(public_key).decode("ascii"))
        self.path_patch = patch.object(app, "ISOLATION_PROOF_PATH", self.proof_path)
        self.hash_patch = patch.object(app, "sha256_file", return_value="f" * 64)
        self.env_patch = patch.dict(os.environ, {"APEX_PYTHON_WORKER_IMAGE_DIGEST": "sha256:" + "a" * 64, "APEX_PYTHON_EGRESS_PROXY_IMAGE_DIGEST": "sha256:" + "b" * 64})
        self.env_patch.start()
        self.addCleanup(self.env_patch.stop)
        self.key_patch.start()
        self.path_patch.start()
        self.hash_patch.start()
        self.addCleanup(self.key_patch.stop)
        self.addCleanup(self.path_patch.stop)
        self.addCleanup(self.hash_patch.stop)

    def test_valid_deployment_signed_proof_is_accepted(self) -> None:
        self.assertEqual(app.load_isolation_proof(), self.payload)

    def test_missing_cluster_cidr_proof_is_rejected(self) -> None:
        missing = dict(self.payload)
        missing.pop("verifiedPodCIDRs")
        self.proof_path.write_text(json.dumps(isolation_envelope(self.private_key, missing)), encoding="utf-8")
        self.assertIsNone(app.load_isolation_proof())

    def test_tampered_or_expired_proof_is_rejected(self) -> None:
        envelope = isolation_envelope(self.private_key, self.payload)
        envelope["payload"]["egressBroker"] = "untrusted-proxy"
        self.proof_path.write_text(json.dumps(envelope), encoding="utf-8")
        self.assertIsNone(app.load_isolation_proof())

        expired = {**self.payload, "issuedAt": now_iso(timedelta(hours=-3)), "expiresAt": now_iso(timedelta(hours=-1))}
        self.proof_path.write_text(json.dumps(isolation_envelope(self.private_key, expired)), encoding="utf-8")
        self.assertIsNone(app.load_isolation_proof())

    def test_proxy_hash_and_policy_set_are_part_of_attestation(self) -> None:
        wrong_hash = {**self.payload, "proxyConfigSha256": "0" * 64}
        self.proof_path.write_text(json.dumps(isolation_envelope(self.private_key, wrong_hash)), encoding="utf-8")
        self.assertIsNone(app.load_isolation_proof())

        wrong_policy = {**self.payload, "verifiedNetworkPolicies": ["apex-osint-worker-egress"]}
        self.proof_path.write_text(json.dumps(isolation_envelope(self.private_key, wrong_policy)), encoding="utf-8")
        self.assertIsNone(app.load_isolation_proof())


class SpiderFootTargetProjectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_spiderfoot_events_do_not_duplicate_target_on_each_observation(self) -> None:
        raw_target = "person@example.test"
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/startscan"):
                return httpx.Response(200, json=["SUCCESS", "scan-1"])
            if request.url.path.endswith("/scanstatus"):
                return httpx.Response(200, json=["scan-1", "", "", "", "", "FINISHED"])
            if request.url.path.endswith("/scanexportjsonmulti"):
                return httpx.Response(200, json=[{
                    "data": raw_target, "event_type": "EMAILADDR", "module": "sfp_test",
                    "last_seen": "2026-10-19T10:00:00Z", "source_data": "https://source.example.test/report",
                }])
            return httpx.Response(404, json={"error": "not found"})

        previous_client = app.spiderfoot_http
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            try:
                app.spiderfoot_http = client
                with patch.object(app, "spiderfoot_is_healthy", return_value=True):
                    status, payload, _error = await app.run_spiderfoot(
                        raw_target, "email", "contact-adjacent", 5_000, 100_000, "test-request",
                    )
            finally:
                app.spiderfoot_http = previous_client
        self.assertEqual(status, "completed")
        self.assertIsNotNone(payload)
        self.assertEqual(len(payload["observations"]), 1)
        observation = payload["observations"][0]
        self.assertNotIn("target", observation)
        self.assertEqual(observation["value"], raw_target)
        self.assertEqual(payload["target"], raw_target)


class SpiderFootHttpOutputBoundsTests(unittest.IsolatedAsyncioTestCase):
    async def test_spiderfoot_http_body_is_capped_before_json_parsing(self) -> None:
        async def handler(_request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=b'{"events":"' + (b"x" * 10_000) + b'"}')

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            async with client.stream("GET", "https://spiderfoot.test/export") as response:
                body, truncated = await app.read_spiderfoot_response_capped(response, 512)
        self.assertTrue(truncated)
        self.assertLessEqual(len(body), 512)
        self.assertTrue(body.startswith(b'{"events":'))

    async def test_spiderfoot_http_body_at_budget_is_not_misreported_as_truncated(self) -> None:
        expected = b'{"status":"FINISHED"}'
        async def handler(_request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=expected)

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            async with client.stream("GET", "https://spiderfoot.test/status") as response:
                body, truncated = await app.read_spiderfoot_response_capped(response, len(expected))
        self.assertFalse(truncated)
        self.assertEqual(body, expected)


class ProcessLimitsTests(unittest.IsolatedAsyncioTestCase):
    async def test_process_output_is_bounded(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apex-limit-test-") as temp:
            code, stdout, _stderr, failure = await app.run_process(
                "/usr/bin/printf", ["0123456789"], timeout_ms=2_000,
                max_output_bytes=5, tool_home=Path(temp),
            )
        self.assertEqual(failure, "output_limit")
        self.assertLessEqual(len(stdout), 5)

    async def test_process_timeout_terminates_the_process_group(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apex-timeout-test-") as temp:
            _code, stdout, _stderr, failure = await app.run_process(
                "/usr/bin/sleep", ["5"], timeout_ms=100,
                max_output_bytes=1_024, tool_home=Path(temp),
            )
        self.assertEqual(failure, "timeout")
        self.assertEqual(stdout, b"")

    async def test_process_output_drain_deadline_kills_descendants_after_parent_exits(self) -> None:
        import sys
        import time
        with tempfile.TemporaryDirectory(prefix="apex-pipe-drain-test-") as temp:
            started = time.monotonic()
            _code, stdout, _stderr, failure = await app.run_process(
                sys.executable,
                ["-c", "import subprocess,sys; subprocess.Popen([sys.executable,'-c','import time; time.sleep(30)']); print('done')"],
                timeout_ms=700, max_output_bytes=1_024, tool_home=Path(temp),
            )
            elapsed = time.monotonic() - started
        self.assertEqual(failure, "timeout")
        self.assertEqual(stdout, b"")
        self.assertLess(elapsed, 3.0)

class CliResultIntegrityTests(unittest.IsolatedAsyncioTestCase):
    async def invoke(
        self,
        tool: str,
        args: dict,
        *,
        artifact=None,
        code: int = 0,
        stdout: bytes = b"",
    ):
        async def fake_run_process(*_args, **kwargs):
            if artifact is not None:
                artifact(Path(kwargs["tool_home"]))
            return code, stdout, b"", None

        with patch.object(app, "run_process", side_effect=fake_run_process):
            return await app.run_cli_tool(
                tool, args, timeout_ms=5_000, max_output_bytes=1_000_000,
            )

    async def test_holehe_malformed_stdout_is_not_an_empty_success(self) -> None:
        status, result, _error, _version = await self.invoke(
            "holehe", {"email": "person@example.org"}, stdout=b"not-json",
        )
        self.assertEqual(status, "failed")
        self.assertIsNone(result)

    async def test_holehe_structured_empty_result_can_complete(self) -> None:
        status, result, error, _version = await self.invoke(
            "holehe",
            {"email": "person@example.org"},
            stdout=b'{"found":[],"totalChecked":0,"totalFound":0}',
        )
        self.assertEqual((status, error), ("completed", None))
        self.assertEqual(result["found"], [])

    async def test_maigret_v066_report_path_and_nested_status_are_normalized(self) -> None:
        record = {
            "sitename": "GitHub",
            "status": {
                "username": "testuser",
                "site_name": "GitHub",
                "url": "https://github.com/testuser",
                "status": "Claimed",
                "ids": {},
                "tags": ["social"],
            },
            "url_user": "https://github.com/testuser",
            "tags": ["social"],
            "ids_data": {"bio": "Public profile"},
        }

        def artifact(home: Path) -> None:
            reports = home / "reports"
            reports.mkdir()
            (reports / "report_testuser_ndjson.json").write_text(
                json.dumps(record) + "\n", encoding="utf-8",
            )

        status, result, error, _version = await self.invoke(
            "maigret", {"username": "testuser"}, artifact=artifact,
        )
        self.assertEqual((status, error), ("completed", None))
        self.assertEqual(result["found"][0]["siteName"], "GitHub")
        self.assertEqual(result["found"][0]["url"], "https://github.com/testuser")
        self.assertEqual(result["found"][0]["status"], "found")
        self.assertEqual(result["found"][0]["profileData"], {"bio": "Public profile"})

    async def test_maigret_existing_empty_report_is_a_valid_zero_hit_result(self) -> None:
        def artifact(home: Path) -> None:
            reports = home / "reports"
            reports.mkdir()
            (reports / "report_testuser_ndjson.json").write_text("", encoding="utf-8")

        status, result, error, _version = await self.invoke(
            "maigret", {"username": "testuser"}, artifact=artifact,
        )
        self.assertEqual((status, error), ("completed", None))
        self.assertEqual(result["found"], [])

    async def test_maigret_missing_or_malformed_report_is_failure_even_with_exit_zero(self) -> None:
        status, result, _error, _version = await self.invoke(
            "maigret", {"username": "testuser"},
        )
        self.assertEqual(status, "failed")
        self.assertIsNone(result)

        def malformed(home: Path) -> None:
            reports = home / "reports"
            reports.mkdir()
            (reports / "report_testuser_ndjson.json").write_text(
                "{definitely-not-json}\n", encoding="utf-8",
            )

        status, result, _error, _version = await self.invoke(
            "maigret", {"username": "testuser"}, artifact=malformed,
        )
        self.assertEqual(status, "failed")
        self.assertIsNone(result)

    async def test_sherlock_missing_csv_is_failure_even_with_exit_zero(self) -> None:
        status, result, _error, _version = await self.invoke(
            "sherlock", {"username": "testuser"},
        )
        self.assertEqual(status, "failed")
        self.assertIsNone(result)

    async def test_sherlock_header_only_csv_is_a_valid_zero_hit_result(self) -> None:
        def artifact(home: Path) -> None:
            (home / "testuser.csv").write_text(
                "username,name,url_main,url_user,exists,http_status,response_time_s\n",
                encoding="utf-8",
            )

        status, result, error, _version = await self.invoke(
            "sherlock", {"username": "testuser"}, artifact=artifact,
        )
        self.assertEqual((status, error), ("completed", None))
        self.assertEqual(result["found"], [])

    async def test_theharvester_missing_or_malformed_report_is_failure_even_with_exit_zero(self) -> None:
        status, result, _error, _version = await self.invoke(
            "theharvester", {"domain": "example.org", "sources": "bing"},
        )
        self.assertEqual(status, "failed")
        self.assertIsNone(result)

        def malformed(home: Path) -> None:
            (home / "harvest.json").write_text("{bad-json", encoding="utf-8")

        status, result, _error, _version = await self.invoke(
            "theharvester",
            {"domain": "example.org", "sources": "bing"},
            artifact=malformed,
        )
        self.assertEqual(status, "failed")
        self.assertIsNone(result)

    async def test_theharvester_structured_empty_report_can_complete(self) -> None:
        def artifact(home: Path) -> None:
            (home / "harvest.json").write_text(
                json.dumps({"hosts": [], "shodan": []}), encoding="utf-8",
            )

        status, result, error, _version = await self.invoke(
            "theharvester",
            {"domain": "example.org", "sources": "bing"},
            artifact=artifact,
        )
        self.assertEqual((status, error), ("completed", None))
        self.assertEqual(result["hosts"], [])
        self.assertEqual(result["emails"], [])
        self.assertEqual(result["ips"], [])


class ToolResultStatusTests(unittest.TestCase):
    def test_holehe_partial_errors_are_not_promoted_to_completed(self) -> None:
        status, error = app.classify_holehe_result([
            {"name": "provider-a", "exists": True},
            {"name": "provider-b", "error": True},
            {"name": "provider-c", "rateLimit": True},
        ])
        self.assertEqual(status, "partial")
        self.assertIn("1 service errors", error or "")
        self.assertIn("1 rate-limit events", error or "")

    def test_empty_holehe_scan_can_complete_without_claiming_negative_evidence(self) -> None:
        self.assertEqual(app.classify_holehe_result([]), ("completed", None))

    def test_spiderfoot_truncation_and_unfinished_scan_are_partial(self) -> None:
        self.assertEqual(app.classify_spiderfoot_export("FINISHED", 10, 8, False)[0], "partial")
        self.assertEqual(app.classify_spiderfoot_export("FINISHED", 10, 10, True)[0], "partial")
        self.assertEqual(app.classify_spiderfoot_export("RUNNING", 10, 10, False)[0], "partial")
        self.assertEqual(app.classify_spiderfoot_export("FINISHED", 10, 10, False), ("completed", None))


class RequestLifecycleTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        app.active_requests.clear()
        app.seen_request_ids.clear()
        app.cancelled_request_ids.clear()

    async def test_duplicate_request_ids_are_rejected_and_pre_cancel_is_reserved(self) -> None:
        request_id = "request-id-12345678"
        self.assertTrue(app.claim_request_id(request_id))
        self.assertFalse(app.claim_request_id(request_id))
        app.seen_request_ids.clear()
        self.assertEqual(await app.request_cancellation(request_id), "cancel_reserved")
        self.assertTrue(app.consume_cancel_request(request_id))
        self.assertFalse(app.consume_cancel_request(request_id))

    async def test_cancellation_requests_terminate_the_active_task(self) -> None:
        request_id = "request-id-cancel-1234"
        task = asyncio.create_task(asyncio.Event().wait())
        app.active_requests[request_id] = task
        self.assertEqual(await app.request_cancellation(request_id), "cancelled")
        self.assertTrue(task.cancelled())
        app.active_requests.pop(request_id, None)


if __name__ == "__main__":
    unittest.main()

    unittest.main()
