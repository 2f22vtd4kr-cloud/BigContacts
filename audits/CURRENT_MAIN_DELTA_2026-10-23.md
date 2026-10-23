# Current-main delta to repository line audit — 2026-10-23

## Snapshot identity

- Audited baseline of the existing line-audit artifacts: `f53dbd1fd246cea2162b4f14e16badd60c4542d4`.
- Current `main` verified from GitHub: `4e476ea3147a3f9ade4f650a221ab636a89c9e3f`, merge commit for PR #728.
- Baseline tree: 3,436 tree entries including directories; 3,349 tracked blobs.
- Current-main tree at the verified SHA: 3,438 tree entries including directories; 3,351 tracked blobs.
- Net tree delta: two added source files. PR #728 modifies 21 existing paths and adds `artifacts/api-server/src/src/lib/durable-discovery-projection.ts` plus its test. The audit report, manifest, findings JSON, runner, and workflow currently live on the audit branch and are not part of the current-main tree.

The original report and CSV manifest remain valid only for their stated baseline. Do not call them a completed audit of current main. This delta document supplements, but does not rewrite, the baseline scan counts.

## PR #728 delta

PR: https://github.com/2f22vtd4kr-cloud/BigContacts/pull/728  
Head: `fd4c6e5cab4948b5c48b1b3249aedcaf8e3ea5f1`  
Merge: `4e476ea3147a3f9ade4f650a221ab636a89c9e3f`

The merged change adds URL-atomic compaction, omission accounting, exact public URL rehydration from immutable `research_case_events`, source-card projection in `GET /api/dashboard/research-leads`, and conditional specialist-OSINT instructions. The rehydration helper uses the shared URL privacy policy and enforces exact accepted-scope matching when rebuilding a discovery URL inventory.

Targeted code paths inspected for this delta:
- `artifacts/api-server/src/src/lib/agentic-web-research-core.ts` and its tests: partial findings parsing, non-terminal findings, URL-safe prompt context.
- `artifacts/api-server/src/src/lib/atlas-control-decision.ts` and its tests: pinned lead inventory, prompt omission accounting, control context.
- `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`: trajectory persistence, source-backed findings, discovery checkpoint callback.
- `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`: evidence-gated partial person/organization materialization and reconciliation.
- `artifacts/api-server/src/src/lib/durable-discovery-projection.ts` and its tests: URL-atomic bounded projections and exact URL rehydration.
- `artifacts/api-server/src/src/routes/dashboard.ts`, `artifacts/api-server/src/src/test/dashboard-signal-projection.test.ts`, and `artifacts/apex-finder/src/pages/dashboard.tsx`: source cards derived from durable event records, distinct from persisted entity cards and explicitly labelled not HNWI evidence.
- `artifacts/api-server/src/src/lib/model-prompt-audit.ts` and tests: contact redaction and private/visible destination policy.
- `artifacts/api-server/src/src/lib/url-privacy.ts`, `artifacts/api-server/src/src/lib/apex-bureau-orientation.ts`, and related URL/prompt contract tests.

This is targeted semantic review of important paths, not a claim that all 23 changed files or every current-main source line have received human semantic review. The remaining PR #728 delta files and all unaffected first-party paths must continue through the path-by-path inventory.

## Research-to-card incident reconstruction

The chronological audit event E038 in `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-21_FRESH_REPLIT_IMPORT_RUN_02.md` records job `81a955bf-f44f-4faf-a39a-e2bcffbc5014`, discovery case 2, source revision `03f9f7398799a2c510781eacfed71c5beebd8258`:

- Discovery summary: 8 searches, 4 visits, 24 trajectory entries, 2 runs, 0 findings.
- Investigator actions used: 12 of 20; target-stage budget was not reached.
- Discovery health: four successfully fetched pages and 32 unfetched search-lead URLs.
- Admissions, materializations, evidence rows, and dashboard review candidates: all zero.
- The Boss/Right-hand stop rationale said all leads were fetched or exhausted even though the structured inventory still showed 32 unfetched URLs.
- The audit reports that the visible trace did not establish a qualifying named person with role and ownership clue co-bound in a fetched source. It does not show that a valid finding was lost in a database transaction.

The strongest supported diagnosis is a discovery/control/finding-generation failure in that run, not proven transaction data loss. The strict person-qualification boundary correctly prevented unsupported promotion. PR #728 adds source cards projected from durable discovery records, but this has not been validated by a new Replit run in this audit.

## Current-main CI evidence at the snapshot

These successful GitHub Actions runs are all pinned to exact main SHA `4e476ea3147a3f9ade4f650a221ab636a89c9e3f`:

- [Apex API Build](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39945779818)
- [Atlas CI](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39945779824)
- [Apex Python OSINT Worker](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39945779837)
- [apex-discovery-static-check](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39945779829)
- [Apex frontend five-condition gate](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39945779934)
- [Five Consecutive Full Code Audits](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39945779803)

These runs demonstrate CI validation of the exact snapshot, not live provider readiness or successful Replit acceptance.

## Unresolved findings and constraints

1. **P1 conditional deployment risk:** active API routing still intentionally omits operator authentication. Public reachability through the actual deployment edge was not verified. Resolve before untrusted exposure; integrate the desk/login contract rather than mounting middleware blindly.
2. **P1 prompt-audit configuration:** at the snapshot, root `.replit` and `artifact.toml` still opt into prompt capture and visible tracked-file output. The writer redacts contact values in visible files, but the configuration is unnecessarily permissive. A separate remediation PR has been opened to route development capture to ignored `.local/audits/`, disable contact-data inclusion, and disable visible-file capture.
3. **P1 partial discovery:** source cards are derived from persisted case/event state; named person/organization entity cards still require source-backed findings. A new Replit run is needed to verify actual dashboard visibility and persistence after reload.
4. **P2 schema lifecycle:** `scripts/post-merge.sh` performs a raw Drizzle push, turns failure into a warning, and continues through further checks. The explicit initializer performs hardening/migrations and invariant checks. The post-merge behavior and 20-second Replit timeout remain unresolved.
5. **P2 API auth and route reachability:** `routes/extended-osint.ts` appears outside the canonical aggregator; determine retirement intent before changing it.
6. **P2 legacy adapters:** some provider adapters use direct `fetch()` rather than shared governed transport. Canonical reachability must be established before migration.
7. **Python OSINT:** implementation and dispatch code exist, including SpiderFoot, but deployment templates still contain placeholder image digests. No live worker attestation or authorized call was performed; the tool must remain unavailable unless the runtime attestation gate passes.

## Critical/high static-hit triage

- `SEC-DYNAMIC-EVAL` matches in `canonical-job-lock.ts` and `job-queue.ts` are calls to Redis `eval()` with constant Lua scripts implementing atomic owner/lease/status transitions. The sampled locations are not JavaScript `eval()` or `new Function()`; this rule is a false positive for code execution. Continue reviewing Lua arguments, key ownership, and the associated lock/queue tests as a separate correctness/security boundary.
- `SEC-DYNAMIC-EVAL` in `scripts/check-canonical-job-lock-boundary.mjs` matches a source-contract guard that asserts the expected Redis Lua path; it is not a runtime evaluator.
- `OPS-TRACKED-CONTACT-AUDIT` in `.replit` and `artifact.toml` is a real configuration concern at SHA `4e476ea...`; the two test-file hits are assertions about that configuration, not evidence of a data leak. PR #732 changes both configurations to keep prompt capture private under ignored `.local/audits/`, disable contact-data inclusion, and disable visible-file capture. It remains unmerged pending the exact-head audit workflows.

## Audit coverage statement

The original baseline scan covers 3,349 blobs: 3,217 readable text files line-scanned and 132 binary/non-UTF-8 assets inventoried. It reports 79 targeted semantic-review paths, 1,046 non-documentation paths classified automated-only, and 2,092 documentation/historical paths not independently fact-checked. Those categories and line counts are for baseline `f53dbd1...`, not current main.

Current main contains 3,351 blobs. A refreshed automated line-by-line inventory, manifest, and findings artifact for exact current-main SHA `4e476ea3147a3f9ade4f650a221ab636a89c9e3f` has now completed on the audit branch: 3,219 readable text files, 558,536 text lines, 132 binary/non-UTF-8 assets, 2,270 pattern hits, 18 critical/high pattern hits, zero parser/syntax findings, and zero unreadable paths. The current-main audit artifacts are not yet merged to `main`. This refresh does not close the semantic-review gap; systematic semantic review of all applicable first-party paths remains required. No Replit run was launched.
