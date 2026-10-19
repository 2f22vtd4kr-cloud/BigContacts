#!/usr/bin/env python3
"""Verify live Kubernetes enforcement and publish a short-lived signed worker proof.

This utility is an operator/deployment-controller tool. Do not run it inside the
OSINT worker Pod: the worker only receives the public verification key.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

ROOT = Path(__file__).resolve().parents[2]
DEPLOYMENT = ROOT / "deployment" / "apex-python-osint-worker"
REQUIRED_POLICIES = {
    "apex-osint-worker-ingress",
    "apex-osint-worker-egress",
    "apex-osint-proxy-ingress",
    "apex-osint-proxy-egress",
}
NETWORK_NAMESPACE = "kubernetes-egress-policy-apex-osint-v1"
EGRESS_BROKER = "apex-public-egress-proxy-v1"
V4_REQUIRED_EXCEPTIONS = {
    "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
    "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24",
    "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24",
    "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
}
V6_REQUIRED_EXCEPTIONS = {"::/128", "::1/128", "::ffff:0:0/96", "64:ff9b::/96", "fc00::/7", "fe80::/10", "ff00::/8", "2001:db8::/32"}


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")


def kubectl_json(*args: str) -> dict[str, Any]:
    completed = subprocess.run(["kubectl", *args, "-o", "json"], check=True, capture_output=True, text=True, timeout=30)
    value = json.loads(completed.stdout)
    if not isinstance(value, dict):
        raise RuntimeError("Kubernetes returned a non-object resource.")
    return value


def matches_labels(actual: Any, expected: dict[str, str]) -> bool:
    return isinstance(actual, dict) and all(actual.get(k) == v for k, v in expected.items())


def peer_matches(peer: dict[str, Any], namespace: str, pod_labels: dict[str, str]) -> bool:
    return (
        matches_labels(peer.get("namespaceSelector", {}).get("matchLabels"), {"kubernetes.io/metadata.name": namespace})
        and matches_labels(peer.get("podSelector", {}).get("matchLabels"), pod_labels)
        and "ipBlock" not in peer
    )


def ports_match(ports: Any, expected: set[tuple[str, int]]) -> bool:
    if not isinstance(ports, list):
        return False
    normalized = set()
    for item in ports:
        if not isinstance(item, dict):
            return False
        protocol = str(item.get("protocol", "TCP"))
        port = item.get("port")
        if not isinstance(port, int):
            return False
        normalized.add((protocol, port))
    return normalized == expected


def get_single_peer(rule: dict[str, Any]) -> dict[str, Any] | None:
    to = rule.get("to")
    return to[0] if isinstance(to, list) and len(to) == 1 and isinstance(to[0], dict) else None


def verify_peer_policy(spec: dict[str, Any], *, direction: str, pod_labels: dict[str, str],
                       peer_namespace: str, peer_labels: dict[str, str], ports: set[tuple[str, int]]) -> None:
    if not matches_labels(spec.get("podSelector", {}).get("matchLabels"), pod_labels):
        raise RuntimeError("Policy podSelector did not match the expected workload.")
    if set(spec.get("policyTypes", [])) != {direction.capitalize()}:
        raise RuntimeError("Policy enabled an unexpected traffic direction.")
    rules = spec.get(direction.lower())
    if not isinstance(rules, list) or len(rules) != 1 or not isinstance(rules[0], dict):
        raise RuntimeError("Policy must contain exactly one narrowly scoped rule.")
    rule = rules[0]
    peers = rule.get("from" if direction == "Ingress" else "to")
    if not isinstance(peers, list) or len(peers) != 1 or not isinstance(peers[0], dict):
        raise RuntimeError("Policy peer list is not narrow.")
    if not peer_matches(peers[0], peer_namespace, peer_labels):
        raise RuntimeError("Policy peer selectors did not match the expected peer.")
    if not ports_match(rule.get("ports"), ports):
        raise RuntimeError("Policy ports did not exactly match the required protocol/port set.")


def verify_dns_rule(rule: dict[str, Any], namespace: str) -> bool:
    peer = get_single_peer(rule)
    return (
        peer is not None
        and peer_matches(peer, namespace, {"k8s-app": "kube-dns"})
        and ports_match(rule.get("ports"), {("UDP", 53), ("TCP", 53)})
    )


def verify_worker_egress(spec: dict[str, Any], namespace: str) -> None:
    if not matches_labels(spec.get("podSelector", {}).get("matchLabels"), {"app": "apex-python-osint-worker"}):
        raise RuntimeError("Worker egress policy selector mismatch.")
    if set(spec.get("policyTypes", [])) != {"Egress"}:
        raise RuntimeError("Worker egress policy types are wrong.")
    rules = spec.get("egress")
    if not isinstance(rules, list) or len(rules) != 2:
        raise RuntimeError("Worker must have exactly DNS and proxy egress rules.")
    dns = next((rule for rule in rules if isinstance(rule, dict) and verify_dns_rule(rule, "kube-system")), None)
    proxy = next((rule for rule in rules if isinstance(rule, dict) and ports_match(rule.get("ports"), {("TCP", 3128)})), None)
    if dns is None or proxy is None:
        raise RuntimeError("Worker egress must be limited to cluster DNS plus the proxy port.")
    peer = get_single_peer(proxy)
    if not peer_matches(peer or {}, namespace, {"app": "apex-osint-egress-proxy"}):
        raise RuntimeError("Worker is not restricted to the dedicated egress proxy.")


def verify_proxy_egress(spec: dict[str, Any]) -> None:
    if not matches_labels(spec.get("podSelector", {}).get("matchLabels"), {"app": "apex-osint-egress-proxy"}):
        raise RuntimeError("Proxy egress policy selector mismatch.")
    if set(spec.get("policyTypes", [])) != {"Egress"}:
        raise RuntimeError("Proxy egress policy types are wrong.")
    rules = spec.get("egress")
    if not isinstance(rules, list) or len(rules) != 2:
        raise RuntimeError("Proxy must have exactly DNS and public-web egress rules.")
    dns = next((rule for rule in rules if isinstance(rule, dict) and verify_dns_rule(rule, "kube-system")), None)
    web = next((rule for rule in rules if isinstance(rule, dict) and ports_match(rule.get("ports"), {("TCP", 80), ("TCP", 443)})), None)
    if dns is None or web is None:
        raise RuntimeError("Proxy egress must be restricted to DNS plus web ports 80/443.")
    peers = web.get("to")
    if not isinstance(peers, list) or len(peers) != 2:
        raise RuntimeError("Proxy must have separate IPv4 and IPv6 public-egress blocks.")
    blocks = {item.get("ipBlock", {}).get("cidr"): set(item.get("ipBlock", {}).get("except", [])) for item in peers if isinstance(item, dict) and isinstance(item.get("ipBlock"), dict)}
    if "0.0.0.0/0" not in blocks or "::/0" not in blocks:
        raise RuntimeError("Proxy must explicitly constrain IPv4 and IPv6 egress.")
    if not V4_REQUIRED_EXCEPTIONS.issubset(blocks["0.0.0.0/0"]) or not V6_REQUIRED_EXCEPTIONS.issubset(blocks["::/0"]):
        raise RuntimeError("Proxy network policy is missing reserved/private destinations from its deny list.")


def verify_network_policies(namespace: str) -> None:
    policies = {
        name: kubectl_json("get", "networkpolicy", name, "-n", namespace)["spec"]
        for name in REQUIRED_POLICIES
    }
    verify_peer_policy(
        policies["apex-osint-worker-ingress"], direction="Ingress",
        pod_labels={"app": "apex-python-osint-worker"}, peer_namespace=namespace,
        peer_labels={"app": "apex-api-server"}, ports={("TCP", 8080)},
    )
    verify_worker_egress(policies["apex-osint-worker-egress"], namespace)
    verify_peer_policy(
        policies["apex-osint-proxy-ingress"], direction="Ingress",
        pod_labels={"app": "apex-osint-egress-proxy"}, peer_namespace=namespace,
        peer_labels={"app": "apex-python-osint-worker"}, ports={("TCP", 3128)},
    )
    verify_proxy_egress(policies["apex-osint-proxy-egress"])


def verify_live_egress(namespace: str) -> None:
    # Each test runs inside an actual worker replica with its real NetworkPolicies
    # and environment. Never attest based only on resource existence.
    direct_probe = (
        "import socket,sys; s=socket.socket(); s.settimeout(2); "
        "try_connect=None; "
        "exec('try:\\n s.connect((\'1.1.1.1\',443)); try_connect=True\\n"
        "except OSError:\\n try_connect=False'); "
        "print('DIRECT_ALLOWED' if try_connect else 'DIRECT_BLOCKED'); "
        "sys.exit(42 if try_connect else 0)"
    )
    run_probe(namespace, direct_probe, "DIRECT_BLOCKED")
    proxy_probe = (
        "import httpx,sys; r=httpx.get('https://example.com',timeout=8); "
        "print('PUBLIC_PROXY_OK' if r.status_code < 500 else 'PUBLIC_PROXY_FAIL'); "
        "sys.exit(0 if r.status_code < 500 else 43)"
    )
    run_probe(namespace, proxy_probe, "PUBLIC_PROXY_OK")
    metadata_probe = (
        "import httpx,sys; "
        "exec('try:\\n r=httpx.get(\'http://169.254.169.254/latest/meta-data/\',timeout=4); "
        "blocked=(r.status_code >= 400)\\nexcept Exception:\\n blocked=True'); "
        "print('METADATA_BLOCKED' if blocked else 'METADATA_ALLOWED'); "
        "sys.exit(0 if blocked else 44)"
    )
    run_probe(namespace, metadata_probe, "METADATA_BLOCKED")


def run_probe(namespace: str, code: str, expected: str) -> None:
    completed = subprocess.run(
        ["kubectl", "exec", "-n", namespace, "deploy/apex-python-osint-worker", "-c", "worker", "--", "/usr/local/bin/python", "-c", code],
        capture_output=True, text=True, timeout=20,
    )
    if completed.returncode != 0 or expected not in completed.stdout.splitlines():
        raise RuntimeError("Live egress probe failed: expected " + expected + ".")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--namespace", default="apex-system")
    parser.add_argument("--secret-name", default="apex-python-isolation-attestation")
    parser.add_argument("--proof-hours", type=int, default=6, choices=range(1, 7))
    parser.add_argument("--skip-live-egress-tests", action="store_true", help="Only for offline manifest/unit tests; NEVER use for a production attestation.")
    args = parser.parse_args()

    private_key_b64 = os.environ.get("APEX_PYTHON_ISOLATION_ATTESTATION_PRIVATE_KEY_B64", "").strip()
    if not private_key_b64:
        raise RuntimeError("APEX_PYTHON_ISOLATION_ATTESTATION_PRIVATE_KEY_B64 is required in the operator/deployment environment.")
    private_key_raw = base64.b64decode(private_key_b64, validate=True)
    private_key = Ed25519PrivateKey.from_private_bytes(private_key_raw)

    expected_config = (DEPLOYMENT / "squid.conf").read_text("utf-8")
    config_resource = kubectl_json("get", "configmap", "apex-osint-egress-proxy-config", "-n", args.namespace)
    live_config = config_resource.get("data", {}).get("squid.conf")
    if live_config != expected_config:
        raise RuntimeError("Live squid ConfigMap does not exactly match the reviewed source file.")
    proxy_hash = hashlib.sha256(expected_config.encode("utf-8")).hexdigest()
    worker_deployment = kubectl_json("get", "deployment", "apex-python-osint-worker", "-n", args.namespace)
    containers = worker_deployment.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
    image = next((c.get("image", "") for c in containers if c.get("name") == "worker"), "")
    if "@sha256:" not in image:
        raise RuntimeError("Worker image must be deployed by immutable sha256 digest before attestation.")
    if args.namespace != "apex-system":
        raise RuntimeError("The checked-in peer selectors target apex-system; edit and review selectors before attesting another namespace.")

    verify_network_policies(args.namespace)
    if not args.skip_live_egress_tests:
        verify_live_egress(args.namespace)
    now = datetime.now(timezone.utc)
    payload = {
        "executorId": "k8s/" + args.namespace + "/apex-python-osint-worker",
        "policyContractVersion": NETWORK_NAMESPACE,
        "networkNamespace": NETWORK_NAMESPACE,
        "egressBroker": EGRESS_BROKER,
        "verifiedNetworkPolicies": sorted(REQUIRED_POLICIES),
        "proxyConfigSha256": proxy_hash,
        "workerImageDigest": image.split("@", 1)[1] if image.split("@", 1)[1].startswith("sha256:") else "",
        "namespace": args.namespace,
        "issuedAt": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "expiresAt": (now + timedelta(hours=args.proof_hours)).isoformat(timespec="seconds").replace("+00:00", "Z"),
    }
    envelope = {"payload": payload, "signature": base64.b64encode(private_key.sign(canonical_json(payload))).decode("ascii")}
    encoded = json.dumps(envelope, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n"
    with tempfile.TemporaryDirectory(prefix="apex-isolation-proof-") as tmp:
        path = Path(tmp) / "isolation-attestation.json"
        path.write_text(encoded, encoding="utf-8")
        path.chmod(0o600)
        if not args.skip_live_egress_tests:
            applied = subprocess.run(
                ["kubectl", "create", "secret", "generic", args.secret_name, "-n", args.namespace,
                 "--from-file=isolation-attestation.json=" + str(path), "--dry-run=client", "-o", "yaml"],
                check=True, capture_output=True, text=True, timeout=30,
            )
            subprocess.run(["kubectl", "apply", "-f", "-"], input=applied.stdout, check=True, capture_output=True, text=True, timeout=30)
        else:
            sys.stdout.write(encoded)
    print("OSINT isolation proof created; expires at " + payload["expiresAt"] + ".")
    print("Private signing key and worker token were not printed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print("OSINT isolation attestation refused: " + str(error)[:300], file=sys.stderr)
        raise SystemExit(2)
