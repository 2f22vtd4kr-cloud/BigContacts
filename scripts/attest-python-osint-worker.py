#!/usr/bin/env python3
"""Verify live Kubernetes enforcement and publish a short-lived signed worker proof.

This utility is an operator/deployment-controller tool. Do not run it inside the
OSINT worker Pod: the worker only receives the public verification key.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import ipaddress
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

ROOT = Path(__file__).resolve().parents[1]
DEPLOYMENT = ROOT / "deployment" / "apex-python-osint-worker"
REQUIRED_POLICIES = {
    "apex-osint-worker-ingress",
    "apex-osint-worker-egress",
    "apex-osint-proxy-ingress",
    "apex-osint-proxy-egress",
}
NETWORK_NAMESPACE = "kubernetes-egress-policy-apex-osint-v2"
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


def parse_cluster_cidrs(variable: str) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    raw = os.environ.get(variable, "").strip()
    values = [item.strip() for item in raw.split(",") if item.strip()]
    if not values:
        raise RuntimeError(variable + " must declare actual cluster CIDRs before a proof can be issued.")
    networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
    for value in values:
        try:
            network = ipaddress.ip_network(value, strict=True)
        except ValueError as error:
            raise RuntimeError(variable + " contains an invalid CIDR.") from error
        if network.prefixlen == 0:
            raise RuntimeError(variable + " cannot contain a default-route CIDR.")
        networks.append(network)
    return networks


def verify_cluster_cidr_configuration() -> tuple[set[str], set[str], list[str]]:
    """Cross-check operator-provided ranges against live Node, Pod and Service addresses."""
    configured_pods = parse_cluster_cidrs("APEX_K8S_POD_CIDRS")
    configured_services = parse_cluster_cidrs("APEX_K8S_SERVICE_CIDRS")

    node_items = kubectl_json("get", "nodes").get("items", [])
    live_node_cidrs: set[ipaddress.IPv4Network | ipaddress.IPv6Network] = set()
    for node in node_items:
        spec = node.get("spec", {}) if isinstance(node, dict) else {}
        values = spec.get("podCIDRs") or ([spec.get("podCIDR")] if spec.get("podCIDR") else [])
        for value in values:
            live_node_cidrs.add(ipaddress.ip_network(str(value), strict=True))
    if not live_node_cidrs:
        raise RuntimeError("Live Node PodCIDRs could not be established.")
    if any(not any(actual.version == declared.version and actual.subnet_of(declared) for declared in configured_pods) for actual in live_node_cidrs):
        raise RuntimeError("APEX_K8S_POD_CIDRS does not cover every live Node PodCIDR.")

    pod_items = kubectl_json("get", "pods", "--all-namespaces").get("items", [])
    live_pod_ips: set[ipaddress.IPv4Address | ipaddress.IPv6Address] = set()
    for pod in pod_items:
        if not isinstance(pod, dict):
            continue
        metadata = pod.get("metadata", {})
        spec = pod.get("spec", {})
        status = pod.get("status", {})
        values = status.get("podIPs") or ([status.get("podIP")] if status.get("podIP") else [])
        for value in values:
            try:
                address = ipaddress.ip_address(str(value))
            except ValueError as error:
                raise RuntimeError("A live Pod reported an invalid IP address.") from error
            live_pod_ips.add(address)
            if not spec.get("hostNetwork", False) and not any(address.version == declared.version and address in declared for declared in configured_pods):
                raise RuntimeError("APEX_K8S_POD_CIDRS does not cover every live Pod IP.")
    if not live_pod_ips:
        raise RuntimeError("Live Pod IP addresses could not be established.")

    service_items = kubectl_json("get", "services", "--all-namespaces").get("items", [])
    live_service_ips: set[ipaddress.IPv4Address | ipaddress.IPv6Address] = set()
    kubernetes_api_ips: set[str] = set()
    for service in service_items:
        metadata = service.get("metadata", {}) if isinstance(service, dict) else {}
        spec = service.get("spec", {}) if isinstance(service, dict) else {}
        values = spec.get("clusterIPs") or ([spec.get("clusterIP")] if spec.get("clusterIP") else [])
        service_ips: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
        for value in values:
            if not value or str(value).lower() == "none":
                continue
            try:
                address = ipaddress.ip_address(str(value))
            except ValueError as error:
                raise RuntimeError("A live Service reported an invalid ClusterIP.") from error
            service_ips.append(address)
            live_service_ips.add(address)
            if not any(address.version == declared.version and address in declared for declared in configured_services):
                raise RuntimeError("APEX_K8S_SERVICE_CIDRS does not cover every live Service ClusterIP.")
        if (
            isinstance(metadata, dict)
            and metadata.get("namespace") == "default"
            and metadata.get("name") == "kubernetes"
            and any(isinstance(port, dict) and port.get("port") == 443 for port in spec.get("ports", []))
        ):
            kubernetes_api_ips.update(str(address) for address in service_ips)
    if not live_service_ips:
        raise RuntimeError("Live Service ClusterIPs could not be established.")
    if not kubernetes_api_ips:
        raise RuntimeError("The live default/kubernetes Service on port 443 could not be found for an active proxy-path egress probe.")

    # Port 443 on the live Kubernetes API Service is known to be listening.
    # A failed CONNECT to an arbitrary Pod IP would be a false positive if that Pod
    # simply had no listener; this probe distinguishes deny/error from a successful tunnel.
    probe_ips = sorted(kubernetes_api_ips)[:2]
    return ({str(item) for item in configured_pods}, {str(item) for item in configured_services}, probe_ips)


def verify_proxy_egress(spec: dict[str, Any], required_cluster_cidrs: set[str]) -> None:
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
    for cidr in required_cluster_cidrs:
        network = ipaddress.ip_network(cidr, strict=True)
        parent = "0.0.0.0/0" if network.version == 4 else "::/0"
        if cidr not in blocks[parent]:
            raise RuntimeError("Proxy NetworkPolicy must explicitly exclude live cluster CIDR " + cidr + ".")


def verify_network_policies(namespace: str, cluster_cidrs: set[str]) -> None:
    policies = {
        name: kubectl_json("get", "networkpolicy", name, "-n", namespace)["spec"]
        for name in REQUIRED_POLICIES
    }
    verify_peer_policy(
        policies["apex-osint-worker-ingress"], direction="Ingress",
        pod_labels={"app": "apex-python-osint-worker"}, peer_namespace="ingress-nginx",
        peer_labels={"app.kubernetes.io/name": "ingress-nginx"}, ports={("TCP", 8080)},
    )
    verify_worker_egress(policies["apex-osint-worker-egress"], namespace)
    verify_peer_policy(
        policies["apex-osint-proxy-ingress"], direction="Ingress",
        pod_labels={"app": "apex-osint-egress-proxy"}, peer_namespace=namespace,
        peer_labels={"app": "apex-python-osint-worker"}, ports={("TCP", 3128)},
    )
    verify_proxy_egress(policies["apex-osint-proxy-egress"], cluster_cidrs)


def verify_live_egress(namespace: str, cluster_probe_ips: list[str]) -> None:
    # Each test runs inside an actual worker replica with its real NetworkPolicies
    # and environment. Never attest based only on resource existence.
    direct_probe = (
        "import socket,sys; s=socket.socket(); s.settimeout(2); "
        "rc=s.connect_ex(('1.1.1.1',443)); "
        "print('DIRECT_BLOCKED' if rc != 0 else 'DIRECT_ALLOWED'); "
        "sys.exit(0 if rc != 0 else 42)"
    )
    run_probe(namespace, direct_probe, "DIRECT_BLOCKED")
    internal_and_ipv6_probe = """import socket,sys
targets = [
    ("169.254.169.254", 80, socket.AF_INET),
    ("10.0.0.1", 443, socket.AF_INET),
    ("192.168.0.1", 443, socket.AF_INET),
    ("2606:4700:4700::1111", 443, socket.AF_INET6),
    ("fc00::1", 443, socket.AF_INET6),
    ("fd00:ec2::254", 80, socket.AF_INET6),
]
reachable = []
for host, port, family in targets:
    try:
        with socket.socket(family, socket.SOCK_STREAM) as sock:
            sock.settimeout(2)
            if sock.connect_ex((host, port)) == 0:
                reachable.append(host)
    except OSError:
        pass
print("INTERNAL_AND_IPV6_DIRECT_BLOCKED" if not reachable else "INTERNAL_AND_IPV6_DIRECT_ALLOWED " + ",".join(reachable))
sys.exit(0 if not reachable else 45)
"""
    run_probe(namespace, internal_and_ipv6_probe, "INTERNAL_AND_IPV6_DIRECT_BLOCKED")
    proxy_probe = (
        "import httpx,sys; r=httpx.get('https://example.com',timeout=8); "
        "print('PUBLIC_PROXY_OK' if r.status_code < 500 else 'PUBLIC_PROXY_FAIL'); "
        "sys.exit(0 if r.status_code < 500 else 43)"
    )
    run_probe(namespace, proxy_probe, "PUBLIC_PROXY_OK")
    metadata_probe = (
        "import httpx,sys; r=httpx.get('http://169.254.169.254/latest/meta-data/',timeout=4); "
        "blocked=r.status_code >= 400; "
        "print('METADATA_BLOCKED' if blocked else 'METADATA_ALLOWED'); "
        "sys.exit(0 if blocked else 44)"
    )
    run_probe(namespace, metadata_probe, "METADATA_BLOCKED")
    redirect_probe = (
        "import http.server,httpx,sys,threading\n"
        "class Handler(http.server.BaseHTTPRequestHandler):\n"
        "    def do_GET(self):\n"
        "        self.send_response(302)\n"
        "        self.send_header('Location','http://169.254.169.254/latest/meta-data/')\n"
        "        self.end_headers()\n"
        "    def log_message(self,*args): pass\n"
        "server=http.server.HTTPServer(('127.0.0.1',0),Handler)\n"
        "thread=threading.Thread(target=server.serve_forever,daemon=True)\n"
        "thread.start()\n"
        "try:\n"
        "    try:\n"
        "        response=httpx.get('http://127.0.0.1:' + str(server.server_port) + '/redirect',timeout=8,follow_redirects=True)\n"
        "        blocked=response.status_code >= 400\n"
        "    except httpx.HTTPError:\n"
        "        blocked=True\n"
        "    print('REDIRECT_TO_METADATA_BLOCKED' if blocked else 'REDIRECT_TO_METADATA_ALLOWED')\n"
        "    sys.exit(0 if blocked else 48)\n"
        "finally:\n"
        "    server.shutdown()\n"
    )
    run_probe(namespace, redirect_probe, "REDIRECT_TO_METADATA_BLOCKED")
    if not cluster_probe_ips:
        raise RuntimeError("No live cluster Pod/Service IPs were collected for proxy-path egress verification.")
    target_json = json.dumps(cluster_probe_ips[:2])
    cluster_proxy_probe = (
        "import concurrent.futures,json,os,socket,sys,urllib.parse\n"
        f"targets=json.loads({target_json!r})\n"
        "raw_proxy=os.getenv('HTTPS_PROXY') or os.getenv('https_proxy') or os.getenv('HTTP_PROXY') or os.getenv('http_proxy') or ''\n"
        "proxy=urllib.parse.urlparse(raw_proxy)\n"
        "if proxy.scheme != 'http' or not proxy.hostname or not proxy.port: sys.exit(47)\n"
        "def blocked(ip):\n"
        "    authority = '[' + ip + ']:443' if ':' in ip else ip + ':443'\n"
        "    try:\n"
        "        with socket.create_connection((proxy.hostname, proxy.port), timeout=4) as conn:\n"
        "            conn.settimeout(17)\n"
        "            conn.sendall(('CONNECT ' + authority + ' HTTP/1.1\\r\\nHost: ' + authority + '\\r\\nProxy-Connection: close\\r\\n\\r\\n').encode())\n"
        "            line = conn.recv(512).split(b'\\r\\n', 1)[0].decode('latin-1', errors='replace')\n"
        "            fields = line.split()\n"
        "            return ip, len(fields) >= 2 and fields[1].isdigit() and int(fields[1]) in (403, 502, 503, 504)\n"
        "    except OSError:\n"
        "        return ip, False\n"
        "with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:\n"
        "    results = list(pool.map(blocked, targets))\n"
        "allowed = [ip for ip, denied in results if not denied]\n"
        "print('PROXY_CLUSTER_DESTINATIONS_BLOCKED' if targets and not allowed else 'PROXY_CLUSTER_DESTINATIONS_ALLOWED ' + ','.join(allowed))\n"
        "sys.exit(0 if targets and not allowed else 46)\n"
    )
    run_probe(namespace, cluster_proxy_probe, "PROXY_CLUSTER_DESTINATIONS_BLOCKED")


def run_probe(namespace: str, code: str, expected: str) -> None:
    completed = subprocess.run(
        ["kubectl", "exec", "-n", namespace, "deploy/apex-python-osint-worker", "-c", "worker", "--", "/opt/venvs/worker-api/bin/python", "-c", code],
        capture_output=True, text=True, timeout=20,
    )
    if completed.returncode != 0 or expected not in completed.stdout.splitlines():
        raise RuntimeError("Live egress probe failed: expected " + expected + ".")


def verify_running_image(namespace: str, deployment_name: str, pod_selector: str, container_name: str) -> str:
    deployment = kubectl_json("get", "deployment", deployment_name, "-n", namespace)
    spec = deployment.get("spec", {})
    template_spec = spec.get("template", {}).get("spec", {})
    containers = template_spec.get("containers", [])
    container = next((item for item in containers if item.get("name") == container_name), None)
    image = str(container.get("image", "")) if isinstance(container, dict) else ""
    if "@sha256:" not in image:
        raise RuntimeError(deployment_name + " must use an immutable sha256-pinned image.")
    digest = image.split("@", 1)[1]
    desired = int(spec.get("replicas", 1))
    status = deployment.get("status", {})
    if int(status.get("readyReplicas", 0)) < desired or int(status.get("updatedReplicas", 0)) < desired:
        raise RuntimeError(deployment_name + " does not have all desired replicas ready.")
    pods = kubectl_json("get", "pods", "-n", namespace, "-l", pod_selector)
    items = pods.get("items", [])
    ready_image_ids = []
    for pod in items:
        pod_status = pod.get("status", {})
        containers_status = pod_status.get("containerStatuses", [])
        entry = next((item for item in containers_status if item.get("name") == container_name), None)
        if entry and entry.get("ready") is True:
            ready_image_ids.append(str(entry.get("imageID", "")))
    if len(ready_image_ids) < desired:
        raise RuntimeError(deployment_name + " ready Pod image identities could not be established.")
    if any(digest not in image_id for image_id in ready_image_ids):
        raise RuntimeError(deployment_name + " is running a Pod image digest different from its immutable Deployment template.")
    return digest


def verify_published_ingress(namespace: str) -> str:
    ingress = kubectl_json("get", "ingress", "apex-python-osint-worker", "-n", namespace)
    spec = ingress.get("spec", {})
    if spec.get("ingressClassName") != "nginx":
        raise RuntimeError("Worker ingress does not use the reviewed NGINX ingress class.")
    rules = spec.get("rules", [])
    hosts = {str(rule.get("host", "")).strip().lower() for rule in rules if isinstance(rule, dict)}
    hosts.discard("")
    if len(hosts) != 1:
        raise RuntimeError("Worker ingress must publish exactly one HTTPS hostname.")
    host = next(iter(hosts))
    if host.endswith(".example.com") or host == "example.com" or "." not in host:
        raise RuntimeError("Replace the worker Ingress example hostname with the actual worker DNS name.")
    tls = spec.get("tls", [])
    matches = [item for item in tls if isinstance(item, dict) and host in item.get("hosts", [])]
    if len(matches) != 1 or not matches[0].get("secretName"):
        raise RuntimeError("Worker Ingress must have one TLS secret covering the published hostname.")
    tls_secret = str(matches[0]["secretName"])
    completed = subprocess.run(
        ["kubectl", "get", "secret", tls_secret, "-n", namespace, "-o", "name"],
        check=True, capture_output=True, text=True, timeout=20,
    )
    if completed.stdout.strip() != "secret/" + tls_secret:
        raise RuntimeError("The worker TLS secret could not be confirmed without reading its contents.")
    try:
        with urllib.request.urlopen("https://" + host + "/livez", timeout=8) as response:
            if response.status != 200 or response.read(1_024).strip() != b'{"status":"alive"}':
                raise RuntimeError("Worker TLS endpoint /livez did not return the expected healthy response.")
    except (urllib.error.URLError, TimeoutError) as error:
        raise RuntimeError("Worker TLS endpoint /livez could not be verified over HTTPS.") from error
    return host


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--namespace", default="apex-system")
    parser.add_argument("--secret-name", default="apex-python-isolation-attestation")
    parser.add_argument("--proof-hours", type=int, default=6, choices=range(1, 7))
    parser.add_argument("--skip-live-egress-tests", action="store_true", help="Refuse to issue a signed proof when live egress tests are skipped.")
    args = parser.parse_args()
    if args.skip_live_egress_tests:
        parser.error("--skip-live-egress-tests cannot issue or print a signed worker attestation; live egress checks are mandatory.")

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
    if args.namespace != "apex-system":
        raise RuntimeError("The checked-in worker/proxy selectors target apex-system; review selectors before attesting another namespace.")

    worker_digest = verify_running_image(
        args.namespace, "apex-python-osint-worker",
        "app=apex-python-osint-worker", "worker",
    )
    proxy_digest = verify_running_image(
        args.namespace, "apex-osint-egress-proxy",
        "app=apex-osint-egress-proxy", "squid",
    )
    worker_deployment = kubectl_json("get", "deployment", "apex-python-osint-worker", "-n", args.namespace)
    worker_containers = worker_deployment.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
    worker_container = next((item for item in worker_containers if item.get("name") == "worker"), {})
    env_values = {item.get("name"): item.get("value") for item in worker_container.get("env", []) if isinstance(item, dict)}
    if env_values.get("APEX_PYTHON_WORKER_IMAGE_DIGEST") != worker_digest:
        raise RuntimeError("Worker environment digest does not match the immutable running image.")
    if env_values.get("APEX_PYTHON_EGRESS_PROXY_IMAGE_DIGEST") != proxy_digest:
        raise RuntimeError("Worker environment proxy digest does not match the immutable running proxy image.")
    published_host = verify_published_ingress(args.namespace)
    pod_cidrs, service_cidrs, cluster_probe_ips = verify_cluster_cidr_configuration()
    verify_network_policies(args.namespace, pod_cidrs | service_cidrs)
    verify_live_egress(args.namespace, cluster_probe_ips)
    now = datetime.now(timezone.utc)
    payload = {
        "executorId": "k8s/" + args.namespace + "/apex-python-osint-worker",
        "policyContractVersion": NETWORK_NAMESPACE,
        "networkNamespace": NETWORK_NAMESPACE,
        "egressBroker": EGRESS_BROKER,
        "verifiedNetworkPolicies": sorted(REQUIRED_POLICIES),
        "proxyConfigSha256": proxy_hash,
        "workerImageDigest": worker_digest,
        "egressProxyImageDigest": proxy_digest,
        "verifiedPodCIDRs": sorted(pod_cidrs),
        "verifiedServiceCIDRs": sorted(service_cidrs),
        "publicWorkerHostname": published_host,
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
        applied = subprocess.run(
            ["kubectl", "create", "secret", "generic", args.secret_name, "-n", args.namespace,
             "--from-file=isolation-attestation.json=" + str(path), "--dry-run=client", "-o", "yaml"],
            check=True, capture_output=True, text=True, timeout=30,
        )
        subprocess.run(["kubectl", "apply", "-f", "-"], input=applied.stdout, check=True, capture_output=True, text=True, timeout=30)
    print("OSINT isolation proof created; expires at " + payload["expiresAt"] + ".")
    print("Private signing key and worker token were not printed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print("OSINT isolation attestation refused: " + str(error)[:300], file=sys.stderr)
        raise SystemExit(2)
