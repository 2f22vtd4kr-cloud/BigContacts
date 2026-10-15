# Apex Atlas — Current Verified Status

**Updated:** 2026-10-15 (UTC)  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Source revision inspected for this snapshot:** `40a243d05f8d315f4a7c8446f18f0514fecd6f94`  
**Release state:** **NOT LIVE-ACCEPTED — zero cards in the latest run**

This is a dated status snapshot, not a substitute for checking current `main`, GitHub Actions, or the newest audit file before acting. Source and persisted run evidence outrank any stale handoff note.

## Latest user-operated live run

The newest live-run audit in the repository as of this update is [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_03.md](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_03.md).

- Canonical job: `8eb7c47b-dc94-46d6-a851-133104a6a806`.
- Terminal state: `failed` / `incomplete`, phase 3/4, stopped at the 20-Investigator-iteration ceiling.
- Recorded totals: 8 successful web-search actions, 1 successful page visit, 0 findings, 0 admissions/inserts, and 0 cards.
- Count-quality note: the audit turn list currently itemizes six successful provider search requests, although its summary says eight. Do not manufacture the two missing actions; reconcile them from durable trajectory rows if available.
- The only successfully fetched page identified in the turn-by-turn log was a GrowthCap private-equity-firms article. It did not produce a named target or target-attributable contact.
- The Investigator then spent many turns on a malformed registry-action contract, scope guard blocks, an empty search result, and OpenCorporates authentication failures. A phrase-aligned 'Wisconsin Secretary of State business entity search …' query was rejected by the old source-class matcher before any provider call.
- The post-run database check found no entities, assets, relationships, contact evidence, research evidence/sessions, or research-run events beyond the preserved case/event trace.

**Why no card was created:** the latest run did not produce an evidence-backed candidate that crossed admission. That is upstream of card creation. This run does **not** establish that the downstream card renderer or persistence layer is broken. The immediate release blocker remains that the research trajectory is not generating admissible source-grounded findings.

## Code changes since Run 03

Commits on `main` following the failed live run:

- `adc43994` — added phrase-aware matching for multi-word source classes, with regression coverage keeping required subject and geography checks intact. This is deterministic compatibility normalization at the scope-validation boundary, **not** a scripted research route; the Investigator still chooses its query, tool, pivot, and stopping decision. Run 03 ended before this source fix was loaded, so live validation is still required.
- `83dd3634` — hid credential-gated registry choices from direct and parallel Investigator schema fields when not configured; made OpenCorporates fail locally without a token and kept raw provider response bodies out of exceptions.
- `411d9f95` — restored the canonical `AGENTIC_ACTION_SCHEMA` contract required by repository architecture checks while retaining dynamic available-registry enums.
- `40a243d0` — corrected OpenCorporates authentication to the documented `api_token` query parameter, rather than the initially assumed header. Its regression test checks the official transport contract and that raw response bodies are not persisted in the thrown error.

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
