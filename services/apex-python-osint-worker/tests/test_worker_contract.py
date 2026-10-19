from __future__ import annotations

import asyncio
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

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def now_iso(offset: timedelta = timedelta()) -> str:
    return (datetime.now(timezone.utc) + offset).isoformat(timespec="seconds").replace("+00:00", "Z")


def isolation_envelope(private_key: Ed25519PrivateKey, payload: dict) -> dict:
    return {
        "payload": payload,
        "signature": base64.b64encode(private_key.sign(app.canonical_json(payload))).decode("ascii"),
    }


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
