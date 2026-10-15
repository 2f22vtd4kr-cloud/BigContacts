# Apex Atlas — Current Verified Status

**Updated:** 2026-10-15 (UTC)  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Source revision inspected for this snapshot:** `778d56401a2f059366d73c32b68b221d3a7f8ab3`  
**Release state:** **NOT LIVE-ACCEPTED — latest audit blocked before launch; zero cards in latest executed investigation**

This is a dated status snapshot, not a substitute for checking current `main`, GitHub Actions, or the newest audit file before acting. Source and persisted run evidence outrank any stale handoff note.

## Latest audit attempt — Run 04 blocked before launch

Run 04 (`audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_04.md`) is the newest audit attempt, but it is **BLOCKED_BEFORE_LAUNCH**, not a research run. Replit reported `timed out waiting for run environment to rebuild` before `cd ../.. && bash scripts/replit-boot.sh` began; `/api/healthz` returned 502 and the available API log timestamp predates the attempt. No API process, Atlas job, model request, web search, visit, finding, evidence, admission, or card was produced. This is not a confirmed Apex application-code failure: the canonical boot command did not execute. Replit's recorded safe action is `Cmd/Ctrl+K` → `Restart compute`, then retry the existing API Server workflow once. Do not repeatedly restart the workflow against the same unrestarted compute.

The Run 04 audit file begins at source revision `7902670e338b76db3295e062a431af02727af26c`. Replit then committed the expanded model request/response audit logger in `62aa49959ea20bc3bc27b05f19730d01a1a7a695`, preceded by audit/config notes in `b329b5ad56a32d90e6f1bbe17211a4388c5cd2bb`. The logger is configured in both `.replit` and `artifacts/api-server/.replit-artifact/artifact.toml` to write to Run 04. Its focused test passed 6/6 and Replit reports typecheck/build success, but the platform timeout happened before the process executed the updated code, so no logged model request proves runtime operation yet.

## Latest user-operated live investigation (last run that actually executed)

The newest live-run audit in the repository as of this update is [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_03.md](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_03.md).

- Canonical job: `8eb7c47b-dc94-46d6-a851-133104a6a806`.
- Terminal state: `failed` / `incomplete`, phase 3/4, stopped at the 20-Investigator-iteration ceiling.
- Recorded totals: 8 successful web-search actions, 1 successful page visit, 0 findings, 0 admissions/inserts, and 0 cards.
- Count-quality note: the audit turn list currently itemizes six successful provider search requests, although its summary says eight. Do not manufacture the two missing actions; reconcile them from durable trajectory rows if available.
- The only successfully fetched page identified in the turn-by-turn log was a GrowthCap private-equity-firms article. It did not produce a named target or target-attributable contact.
- The Investigator then spent many turns on a malformed registry-action contract, scope guard blocks, an empty search result, and OpenCorporates authentication failures. A phrase-aligned 'Wisconsin Secretary of State business entity search …' query was rejected by the old source-class matcher before any provider call.
- The post-run database check found no entities, assets, relationships, contact evidence, research evidence/sessions, or research-run events beyond the preserved case/event trace.

**Why no card was created:** the latest run did not produce an evidence-backed candidate that crossed admission. That is upstream of card creation. This run does **not** establish that the downstream card renderer or persistence layer is broken. The immediate release blocker remains that the research trajectory is not generating admissible source-grounded findings.

## Code changes since Run 03 / Run 04 instrumentation

Commits on `main` following the failed live run:

- `adc43994` — added phrase-aware matching for multi-word source classes, with regression coverage keeping required subject and geography checks intact. This is deterministic compatibility normalization at the scope-validation boundary, **not** a scripted research route; the Investigator still chooses its query, tool, pivot, and stopping decision. Run 03 ended before this source fix was loaded, so live validation is still required.
- `83dd3634` — hid credential-gated registry choices from direct and parallel Investigator schema fields when not configured; made OpenCorporates fail locally without a token and kept raw provider response bodies out of exceptions.
- `411d9f95` — restored the canonical `AGENTIC_ACTION_SCHEMA` contract required by repository architecture checks while retaining dynamic available-registry enums.
- `40a243d0` — corrected OpenCorporates authentication to the documented `api_token` query parameter, rather than the initially assumed header. Its regression test checks the official transport contract and that raw response bodies are not persisted in the thrown error.
- `b329b5ad` and `62aa4995` — Replit expanded audit tracing for visible outbound model messages, structured response/schema/tool definitions, status/usage and transport failures; audit redaction omits credential-shaped values and hidden reasoning/`thought` fields. Run 04 has not exercised this logger live because the platform never started the API command.
- `778d5640` — restored the capability guidance prompt under its 1,000-character budget and aligned regression tests/diagnostic wording with the more specific unsupported-registry error.

OpenCorporates requires an API token. If neither `OPENCORPORATES_API_TOKEN` nor `OPENCORPORATES_API_KEY` is configured, the registry is omitted from the model's available-registry choices and an invalid selection fails locally without network I/O. This optional credential is not part of the mandatory Replit preflight list.

## Verification snapshot

At code revision `411d9f95bc6a7aec4783be9e234d8c9513a1a20b`, the following GitHub Actions results were verified as successful:

- Atlas CI: passed, including 1,361 tests passed and 17 skipped in the main API suite, plus a separate 18-test contract suite.
- Apex API Build: passed.
- Apex frontend five-condition gate: passed.
- Discovery static check: passed.
- Five-consecutive-full-code-audits workflow: Audit 1 passed; Audit 2 was still running at the last observation. The workflow had **not** completed all five.

The OpenCorporates transport correction then created source revision `40a243d05f8d315f4a7c8446f18f0514fecd6f94`. At its initial post-push snapshot (2026-10-15T13:50:19Z), the discovery static check had passed; Atlas CI, API Build and the frontend gate were running; the new five-audit workflow was pending. These are historical snapshots. Always re-query current branch HEAD and Actions before claiming current CI status.

## Architecture law for the next agent

Apex is model-led ReAct, not deterministic enrichment:

- Groq Boss owns case direction and Investigator capability selection.
- Groq Right-hand provides independent bounded oversight.
- The selected Groq Investigator owns the research trajectory: questions, searches, retrieval, source selection, pivots, disproof, revisits, and stopping.
- Deterministic code may validate schema, tool authorization/capability availability, SSRF, geography/subject/source constraints from an accepted Boss direction, evidence provenance, identity, persistence, cancellation, budgets, and terminal state. It must not secretly prescribe an itinerary or replace model reasoning with query templates.
- Search-result snippets and registry records are leads, not claim-grade evidence. Admissions/cards require actual source observations, attribution, and durable evidence.
- Do not weaken admission rules, synthesize evidence/cards, rotate credentials silently, or call an iteration-limit failure a quota failure.

## Required next verification

1. Re-read actual `main` HEAD and workflow statuses; do not assume the above snapshot is current.
2. Ensure Replit/workspace is synchronized to that HEAD and the API has restarted so the committed phrase matcher and registry capability schema are active.
3. Run a fresh canonical UI-equivalent Replit audit; do not force a target or scripted itinerary.
4. Inspect every Investigator turn and reconcile action/search/fetch counts from durable trajectory rows.
5. Require evidence of successful page retrieval, source-grounded finding(s), persisted admission/entity and evidence rows, and the corresponding card. Until all of that is present, report live research as failed/incomplete.

## Follow-up verification — after documentation reconciliation

At the next status check, the documentation-updated HEAD was `e1e0f4dd7fce171fd00590f053e896cd6f460178`. On that HEAD, Atlas CI completed successfully (15/15 jobs), the frontend five-condition gate passed, and the discovery static check passed. Apex API Build completed successfully on the code revision `40a243d05f8d315f4a7c8446f18f0514fecd6f94`; the subsequent commits changed documentation only. The five-consecutive-full-code-audits workflow remained in Audit 1, with 14 of 19 steps complete and no failure observed; older runs triggered by earlier documentation pushes were cancelled, so no five-green certification exists. These observations are themselves time-bound; re-check current HEAD and Actions before another run.


## Current GitHub Actions snapshot — corrective test/documentation commit

On source revision `778d56401a2f059366d73c32b68b221d3a7f8ab3`, frontend five-condition and discovery static gates passed, and API Build passed. However, Atlas CI and Audit 1 failed on the newly added registry-recovery test because it still expected `explicit configured "registry" ID`; the runtime intentionally emits the required `supported "registry" ID` wording and dynamically lists available registries. This follow-up commit updates that one assertion and retains the fail-closed parser behavior. **CI status on the resulting HEAD is pending re-verification**: re-query Atlas CI, API Build where triggered, frontend/static gates and the five-audit workflow. Do not count skipped/cancelled audits as passes.

## What blocks the next Replit launch

The remaining Run 04 blocker is at the Replit compute/run-environment layer, before application boot. A repository source change cannot prove or repair a command that the platform did not start. Once compute has been restarted, retry the existing managed API Server workflow once, require fresh logs that begin with `[replit-boot]`, and confirm `GET /api/healthz` returns 200 before launching the UI-equivalent Atlas job. Then preserve the request-audit evidence and trace real search → fetched page → source-grounded finding → durable admission → card. Do not start the research job while the API is unhealthy.
