# Apex canonical Python OSINT worker integration

**Status (2026-10-30):** worker adapters and fail-closed per-turn model exposure are integrated in the repository; live worker deployment and signed attestation are not verified.

## Architecture path

The canonical public action mapping is:

| Investigator action | Worker tool | Output semantics |
|---|---|---|
| `footprint_username_sherlock` | Sherlock | Account candidates; not person identity proof |
| `footprint_username_maigret` | Maigret | Account candidates; not person identity proof |
| `footprint_spiderfoot` | SpiderFoot | Normalized observations and source URLs as leads |
| `footprint_email` | Holehe | Per-platform observations; not account-ownership proof |
| `harvest_domain` | theHarvester | Email/domain/host/IP leads; independently verify before admission |

The Investigator still chooses among available capabilities from the target, hypothesis, evidence gap and expected information gain. The API's model action gate, strict/JSON-object parse path and prompt capability list all read the same dynamically refreshed, signed worker availability. The action dispatcher sends each invocation through the worker client. Deterministic validation, resource budgets, cancellation, provenance, durable trajectory emission and evidence admission remain Apex responsibilities.

The worker returns signed, bounded envelopes, not truth claims. Each invocation carries a request UUID and available job/case/Investigator-turn correlation. The durable trajectory stores action, request ID, upstream tool/version, execution state/timestamps, executor ID, worker/proxy image digests, isolation-proof issue/expiry, and correlation. SpiderFoot additionally retains a bounded normalized observation set with scan ID, target/type/profile, event/source module, timestamp, value and sanitized source URL. Its upstream export does not expose reliable parent-event IDs; the adapter does not fabricate lineage.

Search results, profiles, platform hits, SpiderFoot events, domains, hosts, IPs and emails remain leads/observations. They are not admitted as evidence or promoted to canonical Atlas identity/contact records by these adapters. Source URLs must be independently fetched; later promotion still follows the established evidence gateway and source-backed identity/contact rules.

## Security and failure contract

- The API has no local subprocess fallback. Missing worker configuration or API-side immutable worker/proxy digest pins, invalid/expired signed proof, missing tools, mismatched image identity, invalid response signature, response/request mismatch or malformed success payload fails closed. The API requires the attested digests to match its independently operator-pinned values.
- The worker uses fixed argument vectors with no shell interpolation, a non-root read-only-root-filesystem pod, dropped capabilities, seccomp, no Kubernetes API token, bounded CPU/memory/process counts, output limits, timeouts and process-group termination.
- The API's abort path sends an authenticated, signed cancellation request. The worker terminates the active route task so subprocess cleanup kills its process group, and asks SpiderFoot to stop the scan. Request IDs are replay-guarded for a bounded window. Process-local cancellation/replay state is why the worker deployment is singleton until a shared task-control contract is designed and reviewed.
- The operator-only Ed25519 private key remains outside the worker. The attestor checks the four live NetworkPolicies, pinned running image references and image IDs, Squid ConfigMap hash, public TLS ingress, direct egress denial to public/private IPv4, public/private IPv6 and metadata addresses, public-proxy reachability, redirected metadata blocking, and a signed HTTP CONNECT denial test against the live `default/kubernetes` Service on port 443 (a known listener, so a missing listener cannot produce a false pass). It requires operator-supplied `APEX_K8S_POD_CIDRS` and `APEX_K8S_SERVICE_CIDRS`, cross-checks them against live Node PodCIDRs, Pod IPs and Service ClusterIPs, requires exact CIDR exclusions in the deployed proxy NetworkPolicy, and signs those verified ranges into the proof. The worker trusts only the separately mounted public key and compares the attested worker and proxy digests with its deployment environment.
- Squid CONNECT is not content inspection. Safety depends on the restrictive worker egress policy, the proxy's address/port rules, DNS behavior and actual cluster enforcement. The attestor's runtime probes are a necessary deployment proof, not replaceable by static YAML checks.

## Required operator steps before enabling tools

1. Build and publish both images from the reviewed SHA, then replace every deployment image/tag/digest placeholder with actual immutable `@sha256:` references and the exact matching worker environment digest values.
2. Configure actual Pod and Service CIDRs from authoritative cluster configuration in `APEX_K8S_POD_CIDRS` and `APEX_K8S_SERVICE_CIDRS` (comma-separated for multiple ranges), and add every exact CIDR to the corresponding IPv4/IPv6 `except` list in the proxy NetworkPolicy. The attestor refuses to sign if declarations do not cover live Node/Pod/Service addresses or if the deployed policy omits a CIDR. Configure the real TLS ingress hostname/secret, ensure installed ingress-controller labels match the reviewed policy, deploy the four NetworkPolicies, and configure API worker URL/token plus `APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST` and `APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST` from the exact deployed image IDs. These API-side pins are required trust anchors; missing or mismatched values keep every worker capability unavailable. Never expose the token in logs.
3. From the target cluster, run `scripts/attest-python-osint-worker.py` **without** `--skip-live-egress-tests`, with both CIDR environment variables set. It must verify live NetworkPolicies, running image identities, actual Pod/Service CIDR coverage, direct-egress denial (including IPv6/private/metadata destinations), public HTTPS through the proxy, an actual redirect that attempts metadata access, and that Squid cannot establish CONNECT to the live Kubernetes API Service IP before issuing the signed proof.
4. Confirm the worker's signed attestation names each available tool and returns pinned tool versions and immutable worker/proxy digests. A 202/job-accepted response, package installation, container build or healthy endpoint alone is not proof of execution.
5. Re-run relevant workflows and the repository's five-consecutive-complete-Apex-audit gate on the exact reviewed source SHA. A skipped/cancelled/incomplete audit is not a pass. Do not enable any capability if a required check or live proof fails.

## Known limits and honest acceptance

This repository-only change cannot prove a deployed image exists, that Kubernetes NetworkPolicies are enforced by the actual CNI, that the target cluster CIDRs are blocked, or that the worker has a valid live attestation. Cluster CIDRs remain explicit operator inputs; this patch does not guess or bake in another environment's ranges. Deployment YAML still contains placeholders and no operator-controlled production proof was created here. The current build pins tool releases/versions but does not yet lock every transitive dependency and base-image digest; release artifact reproducibility needs a separate registry/lockfile pass. The worker workflow builds but does not publish images.

No Replit access or new live Apex run is part of this work. The checked-in 19 October run report records an accepted launch but no complete post-launch reconciliation; the separate fresh-project report records an iteration-ceiling failure with zero findings/admissions/cards. Neither establishes successful non-AI worker execution or absence of public information.
