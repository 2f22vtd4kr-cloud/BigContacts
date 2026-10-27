# Apex Atlas first-card recovery — sequential audit (2026-10-27)

Status: **IN PROGRESS**. This is the live audit for the attempt to obtain the first real, source-backed company card through the canonical Atlas run path. Do not treat this document as evidence of a successful run until a database/API/UI read verifies a persisted card.

## Mission and invariants

- Complete one canonical run through the normal Atlas launch/control/research/card projection path; no synthetic cards, no direct database insertion to fake a result, no hardcoded target outcome.
- A successful, source-attributed public web search may create a **review-only company lead card** from the real organization name and source evidence, even if later Boss/Right Hand control or deeper research fails. The card must disclose whether its source is only a search result or a fetched page.
- Keep the two product card classes distinct: company/business and person/HNWI. A partial person/role lead is not automatically an HNWI.
- Preserve the model-owned Investigator/control architecture, canonical job ownership, provenance, evidence lineage, cancellation and admission safeguards.
- Discovery must be source-diverse and objective-driven. Companies House is one registry among many, not the default for every objective. Source choice remains model-led using the capability registry and available providers.
- A card must communicate source, claim/evidence tier, why it appears, connections, confidence/unknowns, and next verification needs. Generic corporate contact routes and distinctive but public professional/intermediary routes must be visibly distinguished.
- Collect only public, relevant professional/business contact routes. Do not infer wealth or relationships; do not surface private personal numbers from incidental spa/casino records or non-public intimate details.
- Audit exact prompts, model-visible outputs, tool calls/results, provider errors, source URLs and public source-backed data, decisions with concise rationale, DB/evidence IDs, fixes and test outcomes. Never record provider secrets or private hidden chain-of-thought. Record model-visible content and concise decision summaries instead.

## 1. Incoming audit evidence — prior 11 runs

The user supplied the following run summary. It is treated as supplied audit evidence, not independently re-verified in this attempt.

1. `5351b367-3c09-4b00-90a7-939e7420299d`: standard, targetCount=3; phase 1 began with Boss `openai/gpt-oss-120b`, Investigator-1 and Right Hand; Midwest family-owned manufacturing focus; searches/pages executed; repeat visit blocked; unfinished phase 1, zero cards.
2. `3141ca7f-c70e-4784-ba0f-0980f5f1d348`: deep, one target; Boss failed `CONTROL_PROVIDER_RATE_LIMIT`; fail-closed, zero cards.
3. `faf61c58-0c35-49c2-a5ea-b48c3ef7c720`: retry; Boss unavailable after bounded same-role fallback; zero cards.
4. `b23e99f5-b6ef-4bd7-8244-4415ec9e4d02`: restart attempt; API restart lacked Bash-inherited `DATABASE_URL`; infrastructure/setup failure, zero cards.
5. `a627345c-69e7-4a38-bfe4-d4166b7a0bce`: deep, one target; credential fallback loaded, reached phase 3; Boss failed `CONTROL_PROVIDER_RATE_LIMIT`; zero cards.
6. `c460f3d8-f4e5-42f3-81d8-804d399f02cf`: source fallback edit not bundled into `dist/index.mjs`; invalid Llama fallbacks removed after catalog inspection; build/deployment-state failure, zero cards.
7. `2732ccf2-02cc-4c7c-a34b-3202713b9169`: discovery completed and phase 3 began; dedicated Right Hand credential unavailable; fail-closed, zero cards.
8. `ca6b1209-20a8-416e-9d48-2975b2fad9cc`: Boss and Right Hand completed; Investigator-1 quota exhausted; Boss reassigned to Investigator-2, whose token capacity was also exhausted; breaker parked case, zero cards.
9. `91d2892c-e905-422a-9092-7994a445d7c4`: repeated Investigator token-capacity exhaustion; one-reassignment limit stopped recovery; zero cards.
10. `2ce7b7ba-ff6b-4448-8269-c53d2bde4b40`: productive discovery using Investigator capabilities 1, 2, 7, 8, 20b; Companies House searches, filings/directory fetches and parse recovery; next Boss control turn failed `CONTROL_PROVIDER_RATE_LIMIT`; zero cards.
11. `a71c261d-d6a1-4255-9084-4351c93c166a`: live searches, page fetches, registry attempts, parse recovery and Investigator-7 evidence accumulation; failed closed in phase 3 with `CONTROL_PROVIDER_RATE_LIMIT`; zero cards.

Supplied totals: 11 canonical runs; 10 deep recovery runs; real research activity and Companies House evidence activity; no synthetic/directly inserted cards; zero confirmed naturally admitted cards. Primary reported blocker: repeated Groq token/rate limits at Investigator and Boss/Right Hand turns. Five cards in `audits/apex-atlas-live-run-sequential-audit-2026-10-27.md` are from a separate earlier sequence and are excluded.

## 2. Repository/runtime identification

- Repository: `2f22vtd4kr-cloud/BigContacts`, default branch `main`.
- A user-editable Replit app titled `BigContacts` was found at `https://replit.com/@hadserolkijuhte/BigContacts`; its last reported update was 2026-07-23. Its connection to the current repository, branch/commit, runtime secrets, database and deployed version is **not yet verified**.
- A task to inspect/sync the workspace, repair canonical behavior, run the canonical flow and verify the first card was submitted to the Replit agent. The task is asynchronous; no success is claimed from submission alone.
- Work branch created: `apex-atlas-first-card-2026-10-27`, based on the then-current `main`. This audit file is intentionally visible in the repository and is not intended for an ignored/private location.

## 3. Code inspection — verified facts

### Canonical launch and reconciliation

- The canonical HTTP launch is `POST /api/ingest/atlas-run` in `artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts`.
- The launch starts `runCanonicalAtlasPipeline` under `withProviderScope`, responds asynchronously with a job ID, and in its `finally` path calls `reconcileOrganizationReviewCardsForJob(jobId)` and `reconcilePersonReviewCardsForJob(jobId)`.
- Organization and person review-card reconciliation is in `artifacts/api-server/src/src/lib/research-lead-card-reconciliation.ts`. The code intentionally creates review-only `Corporation` cards for supported organization-name leads and `PersonCandidate` cards for supported person/role leads; those states do not imply wealth/HNWI status.
- The reconciliation code checks exact job ownership and source URLs, records `researchSessions` and `researchEvidence`, and invalidates entity/dashboard caches after writes. It is not supposed to manufacture a target from no evidence.
- `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts` has checkpoint-based materialization for explicit model findings, plus terminal reconciliation of durable case events. Projection errors can be logged and deferred, so a durable event is not itself proof a card was materialized.

### Concrete potential failure boundary found during inspection

- Organization reconciliation builds candidate names from model findings, typed registry `companyLeads`, page-identity metadata, and (for search results) a source-domain label.
- It then requires a matching source URL and an exact-name span in the corresponding observation text before persisting the review card.
- Search-result URLs from aggregators/search endpoints are deliberately excluded from claim-grade evidence. A result set can therefore contain successful web activity while producing no card if the event payload lacks the exact source-attributed company name/snippet shape that reconciliation expects, if URLs are absent/mismatched, or if ownership/terminal reconciliation fails.
- This is a hypothesis for the zero-card outcome, **not yet the proven root cause** for the 11 supplied runs. The run event payloads and DB write logs must be inspected before attributing causality.
- The distinction between a search-result lead and fetched-source evidence is valuable and should remain explicit; the fix should correct evidence capture/projection, not weaken provenance into arbitrary URL/name admission.

### Discovery source diversity

- The canonical system exposes a registry/capability catalog and model-owned action selection. Companies House should be one available source rather than a fixed first move. The audit must capture the actual selected action/query and the reason it matched the objective.
- The supplied runs show repeated Companies House use, but this alone does not prove a deterministic Companies House bias. The actual prompts, model outputs, capability availability and tool-selection trajectory are needed to distinguish prompt bias, source-selection policy, runtime availability, and model preference.

## 4. Live attempt log

| Time (UTC) | Event | Result |
|---|---|---|
| 2026-10-27 | Read current canonical launch/reconciliation source files from GitHub. | Verified canonical route and review-only card reconciliation code. |
| 2026-10-27 | Located existing Replit app `BigContacts`. | App exists; current workspace/repo/runtime binding remains unverified. |
| 2026-10-27 | Submitted a Replit Agent task to inspect/sync current main, correct source diversity and review-card persistence, test and run canonical launch. | Asynchronous update submitted; not yet verified. |
| 2026-10-27 | Created this visible audit on branch `apex-atlas-first-card-2026-10-27`. | Branch exists; audit records current state and unknowns. |

## 5. Success criteria — all required

- [ ] Establish which source tree/commit is actually running; build/deploy current source rather than stale `dist/index.mjs`.
- [ ] Confirm required database and Redis configuration without printing credentials; verify Redis URL permissions/connection safely.
- [ ] Run one canonical launch through the same path the UI uses; record job ID and exact launch options.
- [ ] Capture model-visible prompts/outputs and concise decision summaries; record actual selected search provider, query, result URLs/snippets, page fetches, registry choices and provider error classes.
- [ ] Observe at least one genuine successful web search with attributable public organization name and source URL.
- [ ] Verify the review-only company card and its evidence/session rows exist in the canonical database and are reachable through the normal dashboard/entity API and UI read path.
- [ ] Verify card type, source URLs, evidence hierarchy, limitations and non-fabricated fields.
- [ ] Run relevant unit/contract/static checks and record exact results.
- [ ] Update this audit with every correction and result. Do not mark success until every success criterion above is satisfied.

## 6. Credentials and audit hygiene

Credentials supplied in the conversation are intentionally not copied into this public audit. Use only environment variables or the app's secret manager; log presence/availability and redacted provider error metadata, never raw secret values. Public-source text/contact information may be logged when it is relevant to the review card and lawfully public; avoid recording irrelevant personal or intimate data. Model-visible prompts and outputs are auditable; private hidden chain-of-thought is not recorded.

## 7. Findings and next actions

1. Verify the current Replit workspace and runtime are actually based on the current canonical repository. If not, align the workspace with `main` without overwriting unrelated user work.
2. Inspect one supplied run's durable `research_cases` / `research_case_events` and logs to identify why real search activity did not produce an organization review card.
3. Add a regression test using a real-shaped successful search observation (company name + snippet + result URL) and a provider/control failure after that observation. Expected: a source-backed, explicitly review-only company card persists; no HNWI is inferred.
4. Ensure discovery prompt and action availability favor objective-relevant source diversity, with no unconditional Companies House-first sequence. Keep strategy model-owned.
5. Fix only the proven code/config/build/runtime causes, run tests, then launch and verify the first real card end-to-end.


## 8. Code correction made on the work branch

### Confirmed projection gap

The canonical checkpoint path `materializePartialOrganizationLeadCards` previously gathered only `observedUrls` and only accepted `visit` / `browser_fetch` observations. That means an Investigator finding grounded in a successful web-search result could not become a partial company card at the checkpoint, even if the search result had a real source URL and the exact company name in the search observation. This is a confirmed limitation of the checkpoint path. It is **not yet proven to be the sole cause of zero cards in all 11 supplied runs**, because the prior run payloads have not yet been inspected.

The separate terminal reconciler can recognize search-result leads, but it depends on the exact durable event payload, result URL eligibility, source-name binding and terminal ownership. It is not equivalent to a checkpoint that preserves a grounded company lead immediately after a successful search.

### Change set

Branch: `apex-atlas-first-card-2026-10-27`

- Modified `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`:
  - Checkpoint projection now reads successful `web_search`, `parallel_web_search`, `registry_search`, and `parallel_registry_search` results from `leadUrls`; fetched pages continue to use `observedUrls`.
  - It still requires the exact company name to occur in the actual observation text and the cited URL to be claim-grade and to match the finding's source URL. No card is created from a finding alone.
  - Search-only support is labelled `search_result_lead` / `unverified_search_result`, receives lower confidence/freshness, and explicitly says the underlying page, ownership, materiality, wealth and person route remain unverified.
  - If a fetched source supports the same claim, the support is upgraded to `fetched_source` rather than downgraded.
  - Existing job/case ownership checks, serializable transaction, review status, evidence/session writes, identity collision guard and cache invalidation remain in place.
- Added a regression contract in `artifacts/api-server/src/src/test/research-lead-card-reconciliation.test.ts` to require search-result lead handling and evidence-tier separation.

### Verification state

- [ ] CI/build/test results for this branch.
- [ ] Run against the current deployed/runtime workspace.
- [ ] Inspect a real search trajectory and confirm the finding name, observation snippet and lead URL bind exactly.
- [ ] Confirm database entity/evidence/session IDs and normal API/UI visibility.

No card has yet been verified from this code change. Do not treat the change or the test assertion as proof of successful runtime behavior.


## 9. Source-selection correction and CI status

Updated `artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` on this branch:
- Versioned the institutional prompt contract as `2026-10-27.1`.
- Added source-selection guidance based on expected information gain, subject jurisdiction and objective anchors, not registry availability.
- Explicitly states that Companies House is UK/Great Britain-specific and is not a substitute for US state Secretary-of-State filings.
- For unanchored local/sector/opportunity discovery, ordinary web search is often a higher-value first action; a registry can still be first when the task has a matching jurisdiction/entity/identifier/filing hypothesis.
- Kept the strategy model-led: no fixed source/provider sequence and no forced use of every source class.

Added a regression contract in `artifacts/api-server/src/src/test/research-lead-card-reconciliation.test.ts` to guard the source-selection rule and the one-search company-lead projection.

### CI for earlier revision (commit `0b1d9ce7a6a44632ff0c080c2f988a5f35e5b87f`)

- Apex API Build: passed, including workspace typecheck, API build, lead-card regression tests, provenance tests, discovery pivot tests, Boss/Right-hand control tests and canonical race/continuation tests. Run ID: 40515463050.
- Apex Prompt Architecture Audit: passed. Run ID: 40515463002.
- Apex Research Quality Contracts: passed. Run ID: 40515463159.
- Discovery static check: passed. Run ID: 40515463070.
- Netlify deploy preview for the PR: success. This preview does not prove that the API/database run is live.
- Full consecutive codebase audits were still in progress at the time of this entry. A later source-selection change has been committed since this CI run and requires its own green checks.

### Runtime limitation remains

The editable Replit app lookup reports `BigContacts`, last updated 2026-07-23. Its publish-status check reports `found=false` (no published deployment). Two Replit Agent update requests were submitted asking it to sync to this branch, rebuild from source, check configuration, launch one canonical run, and verify the normal database/API/UI path. The connector returned an asynchronous `updating` state but subsequent status queries returned no textual progress; the app's last-updated timestamp did not change. Therefore this is not evidence that the workspace was synced or that a run occurred.

No actual run job ID, search query/provider response, database entity ID, evidence ID, or UI-visible card has been verified by this attempt so far. The first-card objective remains open.
