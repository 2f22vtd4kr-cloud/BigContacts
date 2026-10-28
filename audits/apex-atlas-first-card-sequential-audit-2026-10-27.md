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


## 10. Full-audit failure and correction

The full API audit workflows completed Audit 1 and failed in the isolated test-file step; Audits 2–5 were skipped as designed. Both failed on the same pre-existing assertion in `groq-investigator-runtime-contract.test.ts`: the test expected the phrase “topic/company terms,” while the actual scope-recovery prompt says “topic terms and company terms.” The runtime prompt still preserves the intended rule and the failure was a literal wording mismatch, not a provider/runtime failure.

Changed that assertion to match the existing prompt wording without changing prompt behavior. This correction is now committed on the work branch and has its own fresh CI run pending. References: Five Consecutive Full Code Audits run 40515463160; Five Green Complete Codebase Audit run 40515463170. Both Audit 1 failures were otherwise after successful install, architecture contracts, typecheck/build, DB schema setup and live smoke API test.


## 11. Follow-up verification: prompt budget regression found and corrected

Timestamp: 2026-10-27, during the follow-up CI cycle.

- PR #759 remained open/unmerged. Head before this correction: `3aa72741ce290a03b15a4eee03b954047fcafd0e`.
- API build/typecheck passed, but the focused API regression suite failed in `agentic-web-research-core.test.ts` across prompt-contract cases. The generated prompt was falling through to the last-resort emergency tier; this dropped useful guidance and durable URL/source context from the prompt under test.
- Diagnosis: the compact output contract had grown too large and duplicated detailed discovery admission rules already represented in separate compact guidance. The emergency prompt budget could therefore overflow, forcing a lower fallback tier.
- Correction: shortened the emergency output contract while retaining the complete JSON envelope, exact source URL binding, the low-confidence one-search company-review-card rule, the fetched-page requirement for stronger business claims, and the stricter fetched-source person lead rule. This is a prompt-budget correction, not a scripted discovery sequence and not a promotion bypass.
- Regression test wording for source-selection guidance was aligned with the current prompt contract. Retrieval-limit wording was kept in the compact prompt, including PDF handling and the rule that failed extraction is unobserved.
- Latest code commit at the time of this entry: `3c84216d26bcfd656f47f2564a9d44b7ca52f5c1`.
- CI for this commit was still running when this entry was written. The latest API build and full audit must be checked before proceeding.

Runtime remains unverified: no canonical launch job ID, actual search response, persisted card/entity/evidence ID, or normal API read-back has yet been observed. Do not claim the first-card objective is met until all of those are recorded.


## 12. First-card recovery: source admission, prompt budget, and Groq call-budget fixes

Timestamp: 2026-10-27, follow-up implementation pass. Current PR #759 head at entry time: `257ff6742a9b1f09719e1422306ec82da0de6114`; further CI-fix commits followed.

### New diagnosis from code inspection

- The Investigator prompt required a search action to emit a partial organization finding. Canonical checkpointing correctly did nothing when the finding list was empty, even if the underlying search observation had useful result titles and URLs. This left card creation dependent on the model successfully serializing a finding before a subsequent Boss/Right-hand failure.
- Terminal organization reconciliation also had a fallback that derived a purported company label from the result URL hostname. That was not a reliable target-company identity and conflicted with the no-inference contract; a publisher/source domain is not necessarily the company being researched.
- The Right-hand implementation declared numbered Groq key slots but selected only the first configured credential. Boss could walk a long configured key list on a single control decision, and Investigator capability registration covered only six total Groq slots despite seven numbered Investigator capabilities being supplied for configuration.
- The compact discovery targetability gate was 3,437 characters before the next fallback sections. Repeated long policy prose increased prompt pressure and made emergency-tier degradation more likely. Boss control was allowed up to 1,536 completion tokens for a small structured control decision.

### Changes made on the recovery branch

- Added bounded deterministic extraction of a low-confidence company review lead from the search provider's **exact returned title and exact returned HTTPS result URL**, only after a successful web/parallel-web search. It uses business-like title markers, rejects obvious headline-like titles, caps each search batch at three such leads, and records explicitly that the page was not fetched and ownership, wealth, people, and contact conclusions are unverified. The Investigator still owns query choice, hypotheses, and the research trajectory; this is evidence admission from observed output, not a scripted search sequence.
- Removed hostname-to-company-name inference from terminal reconciliation. A URL alone no longer supplies a company identity. Explicit fetched-page identity metadata and exact model/registry leads remain available under their existing source-binding gates.
- Shortened the discovery targetability prompt while preserving the active Boss scope/geography, no registry-first rule, materiality/realistic-route checks, language flexibility, no-placeholder/no-invention rule, and explicit source-stage dependencies.
- Retained the case objective in the emergency prompt tier and aligned the compact output-contract test with the current exact wording.
- Registered all seven numbered Investigator credential slots and added a quota-identity test for them. This fixes the registry's prior off-by-two coverage; actual runtime credentials still must exist in the deployment environment.
- Made Right-hand credential fallback use distinct configured keys after explicit request-quota or authentication failure, deduplicating identical key values as one quota pool and capping outbound chat requests per control decision. Token-window/model-specific limits still allow same-role model recovery. Added a regression test for a distinct secondary credential after a hard request-quota response.
- Bounded Boss credential fallback to the selected key plus at most two distinct fallbacks per control decision, deduplicating identical keys. Reduced Boss control completion allowance from 1,536 to 1,024 tokens for its compact JSON decision.

### Verification and remaining uncertainty

- The source-neutral discovery static check and prompt-architecture audit passed on intermediate commits.
- One CI run initially failed because the roadmap static checker still required exactly five numbered Investigator suffixes; the checker was updated to require seven. Another run exposed missing literal discovery-quality markers after prompt compaction; those phrases were restored compactly.
- Latest code/CI must still be checked after the newest commits. These are code changes, not evidence of a successful live run.
- No canonical launch job ID, real provider result, persisted company-card entity ID, evidence-row ID, or normal API/UI read-back has yet been observed in this recovery pass. The first-card objective remains open until those are captured. Do not count source-domain labels, fabricated records, test fixtures, or cards from the separately excluded earlier run sequence.
- Groq quota caveat: different API keys only provide independent capacity if the provider accounts/projects actually have independent quotas. The code now deduplicates identical secrets and bounds retries, but no claim is made that key rotation can overcome a shared organization/project/model quota.


## 14. Emergency prompt syntax repair — 2026-10-28, 03:40 UTC

- Commit `d1ae7ea6a422a2858ffabae9634c6990684ee10c` repairs a TypeScript syntax regression introduced while shortening `shortestDiscoveryGate`: the discovery-mode ternary had ended with a semicolon instead of the `: ""` false branch.
- This syntax issue explains why the Python OSINT worker and API build were failing on the immediately preceding state; do not treat the earlier test failures as semantic-only until a fresh workflow validates compilation and focused assertions.
- Current latest verified source commit: `d1ae7ea6a422a2858ffabae9634c6990684ee10c`. A workflow lookup for this SHA returned no PR-triggered runs yet. The most recent observed run set on the prior SHA `f9becaefa25a45527b267000bc40cf64a3540303` had API Build, Research Quality Contracts, Python OSINT Worker and Five Green Complete Codebase Audit failed; Prompt Architecture Audit and static discovery check passed; Five Consecutive Full Code Audits was cancelled.
- No canonical run ID, naturally returned web result, persisted company card/evidence ID, deployment SHA, or normal API/UI read-back has been verified. Do not report task success until those artifacts exist.


## 15. Fresh CI exposed a second emergency-prompt syntax defect — 2026-10-28, 03:46 UTC

- Fresh workflows did run on the prior branch head `ade8370adda77f673220ee4731dc011fe70aa653`: API Build run `40627573642`, Research Quality Contracts `40627573745`, Five Green Complete Codebase Audit `40627573669`, Python OSINT Worker `40627573722`, and Five Consecutive Full Code Audits `40627573741` all failed; Prompt Architecture Audit `40627573792` and discovery static check `40627573678` passed.
- The exact compiler failure is not a provider/runtime issue: `agentic-web-research-core.ts` around line 4672 contained two stale orphaned ternary branches after the newly shortened `shortestDiscoveryGate` and `shortestAdmission` expressions. The earlier repair fixed the first malformed ternary but did not remove those duplicate old branches. Build reported esbuild `Unexpected "?"`; TypeScript reported `TS1128: Declaration or statement expected` at lines 4672, 4673, 4675 and 4676.
- Removed only those two orphaned stale expressions, preserving the current compact prompt expressions and all surrounding prompt tiers. Source fix commit: `c3be44c3e0c4d4b2e1ec0cf60616a60abe28f69c`.
- This is a second syntax repair and further proof that earlier claims of the prompt compiling were premature. Fresh CI for `c3be44c` must be checked; no compile/test success is claimed yet.
- Runtime identity remains unresolved: Vercel has no BigContacts project/deployments under the currently connected team; the known Replit BigContacts app has not been updated since 2026-07-23 and the Replit agent returned an empty response to a non-mutating runtime identity question. The PR's Netlify deploy preview is a frontend preview, not proof of the canonical API/database runtime. Do not launch through a guessed preview or local CI database and call it production success.
- No canonical live run, model decision trace, real web result, persisted company card, evidence ID, or normal API/UI read-back has been observed. Acceptance remains blocked.


## 16. Typecheck uncovered an unbound durable-URL inventory variable — 2026-10-28, 03:51 UTC

- After removing the stale ternary branches, TypeScript progressed past parsing and found a separate compile error at `agentic-web-research-core.ts:4787`: `pinnedInventoryCandidate` was referenced in the absolute-minimum prompt budget calculation but never declared in that scope. This was introduced during the earlier emergency prompt compaction and was masked by syntax failures.
- Added a local binding from the existing safe `extractPinnedDurableUrlInventory(input.durableUrlInventory)` helper immediately before the existing budget check. This preserves the current exact-URL/lead-only safety behavior and does not reconstruct URLs or mandate action order.
- Source commit: `34ccb3149c96ca53d9ab470bffa99bd733248f2f`. CI on the prior source commit `c3be44c` exposed this typecheck failure; fresh checks on `34ccb31` are required. No positive compile result is claimed yet.
- The runtime and first-card acceptance gates remain unsatisfied: the known Replit app has no published deployment and has not provided runtime identity evidence; Vercel has no matching project/deployment under the connected account/team. The Replit agent has been asked to establish exact source/runtime identity before any canonical launch; its update is asynchronous. Do not treat this request as completion.


## 17. Emergency prompt budget still dropped durable context; compacted the absolute-minimum tier — 2026-10-28, 03:56 UTC

- Source commit `34ccb3149c96ca53d9ab470bffa99bd733248f2f` compiled and passed TypeScript typecheck plus the registry/lead-card and strict-provenance/provider-cache focused suites. API Build then failed the discovery pivot-scope regression suite: 12 failed / 182 passed. Failures clustered around the absolute-minimum Investigator prompt losing prior trajectory, fetched-source URL/text, lead counts, blocked-action feedback, and expected output-contract context when the richer prompt tiers exceeded the provider budget.
- Root cause in the actual composed prompt: the last-resort tier declared a short `absoluteMinimumDiscoveryContext` but accidentally inserted the much longer `shortestDiscoveryGate` and `shortestAdmission` instead. This consumed the space reserved for the durable latest trajectory and fetched-source observation. This was a real prompt-context loss, not merely a stale test assertion.
- Corrected the last-resort tier to use the compact absolute-minimum discovery context and include the essential target-scoped independent corroboration/falsification/contact-route requirement there; the complete compact output contract still contains the search-only company review-card rule, strict fetched-source person rule, exact URL binding, source-neutral selection and PDF retrieval limits. Source commit: `73dad9e1d084a9088ecbdbf0ad2d41d3401db9ea`.
- Fresh API Build/quality/contract checks on `73dad9e` are pending. No claim is made that the prompt tests pass until the next run completes.
- Deployment/runtime facts remain unchanged: the repository README identifies the canonical API/desk and Replit boot command, but the connected Replit app has not updated since 2026-07-23 and has no published deployment; Vercel lists no matching project. The Replit Agent update request has not yielded inspectable runtime evidence. No live run/card/evidence/read-back has been produced.


## 18. Second prompt-contract test pass exposed missing emergency observation reserve — 2026-10-28, 04:04 UTC

- The `73dad9e` build compiled and passed workspace typecheck, registry/lead-card tests, strict provenance/provider-cache tests, and source-neutral static checks, but the discovery pivot-scope suite still failed 10 tests (184 passed). The returned prompt was taking the compact tier that nearly filled its character budget, leaving no room for `appendEmergencyObservationContext` to add the latest trajectory/fetched page/blocked-action feedback. This was an actual context-loss defect, not a test-only wording issue.
- Added a 1,000-character reserve before returning the compact tier whenever durable trajectory, fetched source, carried search, or current observation exists. Shortened the absolute-minimum scope text and output contract while preserving the full top-level JSON field list, exact fetched-URL binding, search-only company review admission, stricter fetched-source person admission, source-neutral choice, and PDF retrieval constraints. Added conditional non-binding lead follow-up guidance when real unvisited leads exist. Source commit: `da7e46ba32fee3133d6eb69750ba1419365186b3`.
- New CI is pending. The prior failures included lost latest fetched-source text/URL, durable lead inventory, current blocked-action feedback, the source-class wording, and a required output-contract marker. All must pass on the next run before declaring prompt recovery complete.
- No runtime acceptance evidence exists yet. The only connected Replit app remains stale/unpublished; the separate GitHub Actions runtime proof is an isolated fallback with a temporary PostgreSQL/Redis database, not the user's persistent Replit runtime. No real deployment has been verified, and no run/card/evidence IDs or normal persistent-API read-back have been observed.


## 19. Tightened canonical proof to require a company card, not a person-card substitute — 2026-10-28, 04:10 UTC

- Reviewed the isolated canonical runtime proof workflow before relying on it. Its earlier acceptance allowed a `PersonCandidate` review card to pass, which would not satisfy this task's explicit company-card requirement.
- Changed `.github/workflows/apex-canonical-runtime-proof.yml` acceptance to require a `partial_review` lead whose entity type is exactly `Corporation`, with a real HTTPS source URL, and an exact same-ID/name/type match in both `/api/dashboard/research-leads` and `/api/entities`. The strict active Atlas lock-release check remains. Workflow source commit: `205c8e0c81c69e1ad05650cb82721a67d76a2f45`.
- This workflow still runs only when the intentional trigger file is pushed to canonical `main` (or by manual dispatch); the connected GitHub tools do not expose a workflow-dispatch action. A merge of PR #759 would trigger it because the PR changes `scripts/live-batch-trigger.md`, but only after the required CI and audit gates are green. This isolated run uses temporary PostgreSQL/Redis and cannot substitute for the user's persistent Replit runtime.
- No run/card/evidence IDs exist yet. The normal Replit deployment remains unverified/unavailable through the connected tools: only one stale BigContacts workspace is listed, it has no published deployment, and its agent has not returned inspectable runtime details.

## 20. Further compacted last-resort prompt after 10 context-contract failures — 2026-10-28, 04:18 UTC

- The da7e46b API Build run passed compilation, workspace typecheck, lead-card tests, strict provenance/cache tests and static discovery checks, but the pivot-scope suite still failed 10/194 tests. The failures now show the absolute-minimum prompt still exhausted its available character budget before carrying the fetched-source summary/latest trajectory, and its shortened admission/PDF wording did not retain some required literal semantic anchors.
- Further reduced the last-resort base budget: objective/scope excerpt caps reduced, available-action rendering compacted, provider/scope/registry narration shortened, and the absolute-minimum output contract tightened while explicitly retaining the complete JSON envelope, company review-card admission, exact source URL binding, strict person evidence requirements, DISCOVERY LEAD HANDOFF CONTRACT, and the explicit PDF guidance phrases. The discovery gate now explicitly retains source-class flexibility and the Investigator's action-choice authority.
- Source commit: b2abfd44dbb1daebc6a9fd23975f487fe9d4811a. Fresh CI is pending. Do not claim the prompt compaction is repaired until the focused suite passes without dropped trajectory/evidence context.
- The real deployment blocker remains separate from code correctness: Replit lists only the stale, unpublished BigContacts workspace; Vercel lists no matching project. No persistent runtime access, live run, company card, evidence ID, or normal persistent-API read-back has been established.

## 21. Final-tier output contract restored after source review — 2026-10-28, 04:24 UTC

- During review of commit b2abfd4 before its CI completed, found that the shortened absolute-minimum prompt list had inadvertently omitted the mandatory output-contract section when the base parts were rearranged. That would have violated the required structured response schema even if the context tests passed.
- Restored the complete compact output contract in the absolute-minimum base, explicitly retained the visit/browser_fetch fetched-company rule, and corrected two string joins to use real newline separators rather than literal backslash-n text. This is a necessary correctness fix, not a test relaxation.
- Source commit: d8395c9ff755bb17348356831ca747d616471678. Fresh compile and prompt regression tests must validate this exact revision.
- No canonical deployed runtime or persisted company card has been verified. The isolated CI proof remains gated on green checks and merge to main; it does not use the persistent Replit database.

## 22. Root cause isolated: emergency compactor moved the source header into the truncation middle — 2026-10-28, 04:34 UTC

- The d8395c9 run compiled and passed the broad static suite, workspace typecheck, lead-card tests, and strict provenance/cache tests, but the discovery prompt suite still failed 9/194. Reading the exact assertion diff exposed the concrete bug: the composed prompt retained the fetched PDF URL and end-of-page fact, plus the latest search record, but the compactor dropped the literal “LAST SUCCESSFUL FETCHED SOURCE” header. The header sat between the latest-record summary and current observation, where middle compaction removed it. Other missing contract phrases were from the same over-compacted fallback tier.
- Changed the emergency observation compactor to put the bounded fetched-source envelope (including its exact URL and marker) at the start and the latest action/guard feedback at the end before URL-safe middle compaction. Reduced the bounded source/trajectory excerpts slightly so both ends can survive together. This preserves source provenance and current control feedback without trusting observed text as instructions.
- Source commit: 7b54f850f87335b7bd7ce5e0c35f63099cb8992c. Fresh CI must confirm the fetched-source sentinel, exact URL, latest trajectory, source-neutral provider/action choice, and full output contract all survive.
- Runtime acceptance remains unproven: no active Replit deployment is exposed by the connected tools, and the isolated runtime proof has not yet been run on main.

## 23. Emergency fallback contracts aligned across tiers; source-preservation assertion updated — 2026-10-28, 04:42 UTC

- The exact failure diff from run 40628953898 showed the last-resort tier retained the fetched page text and exact URL but omitted the standalone source marker because the observation compactor clipped the marker from the middle. The 7b54f85 compactor change addresses that root cause by moving the compact fetched-source envelope to the front and latest action/guard feedback to the end.
- Further aligned the last-resort tier with existing prompt-contract requirements: restored the spaced available-action list and explicit provider contract, added the exact non-binding lead-follow-up text when in-scope leads exist, preserved the target-scoped corroboration/falsification/contact-route rule, and restored the exact PDF guidance phrase across compact retrieval tiers. The compact output contract now explicitly preserves all top-level fields, search-only Corporation admission, exact URL binding, fetched-company distinction, strict person evidence, official-source vs aggregator distinctions, and unattributed-contact prohibition.
- Updated the source-level regression assertion to reflect the intentional current observation + fetched-source-summary input to buildEmergencyPriorTrajectoryObservation; the assertion still requires that the helper and appendEmergencyObservationContext path remain wired.
- Source commit: 56a871d1a2e7fdcb3874c649c3c42700ec484fc6; test commit: f39bd43e84e0fd8503dbbabad678a5427b47b079. Fresh CI is pending; do not claim the 9 failing prompt assertions are repaired until the latest run passes.
- No deployed Replit runtime, canonical live run, company card, or evidence read-back has been established.

## 24. Final three prompt failures narrowed to source/trajectory ordering and tail budget — 2026-10-28, 04:52 UTC

- The f39bd43 run reduced the discovery prompt suite from 9 failures to 3/194. The exact remaining failures were: fetched-page end fact sentinel clipped out of the compact emergency observation, the exact discovery targetability-gate marker missing, and the latest turn-17 trajectory marker clipped out.
- Updated emergency composition to place the compact fetched-source envelope first and the latest trajectory record last, with the redundant current observation capped at 120 characters when a fetched-source envelope is present. This makes the source marker/URL and fact excerpt occupy the head while the latest action/blocked feedback occupies the tail; the complete durable source observation remains stored. Updated the discovery gate wording to preserve the targetability marker in the absolute-minimum tier.
- Source commit: 1de292720b3e0ad14b9c91aad508ed81fb557179. Regression assertion commit: f3475beafdbe891aef850ced3518d403380f1f2d. New CI must pass the exact end-fact and latest-turn assertions before proceeding.
- No live deployment, canonical run, company card, evidence ID, or persistent API read-back has been observed.

## 25. Preserved fetched-page end facts and explicit latest-turn marker — 2026-10-28, 05:04 UTC

- The f3475be run reduced the focused discovery suite to three failures (191 passed): the end-of-page fact sentinel, the latest-trajectory label in a highly compacted prompt, and the corresponding turn-17 marker. The exact output showed the source URL and page tail were present, but the 180-character excerpt cut off the sentinel's beginning; the latest record's marker was in the middle and was clipped by URL-safe compaction.
- The emergency source envelope now retains a compact beginning excerpt and a separate end excerpt (where the source's last factual text lives), with a 300-character source observation budget. The redundant current observation is capped at 60 characters when the durable source envelope is included; the latest record's observation is compacted to 100 characters. The prior-record builder appends an explicit latest-turn marker at the tail so it survives compaction.
- Source commit: e334565c18149d5561d741e41ade7905b8d2f812. Regression assertion commit: 4ffe3e78c14ea506fc07853b5aa5a4dc8ab92dd4. New CI must confirm all three remaining assertions pass.
- No live run/card/evidence IDs or persistent deployment read-back exist yet.

## 26. Final prompt regressions isolated to raw source-tail clipping and carried-search turn loss — 2026-10-28, 05:12 UTC

- The 4ffe3e7 run still had three failures. The raw page text was being compacted twice: its last 300 characters were first passed through the general observation compactor, whose omission marker clipped the beginning of FACT_AT_END_SENTINEL; the resulting observationTail could not restore text already discarded. Also, the emergency record summary contained only the latest blocked action (turn 18), so the preceding successful search (turn 17) and its lead URLs were not labeled at the tail. One compact discovery tier still lacked the exact targetability-gate marker.
- Changed the source envelope to take its beginning and last 220 characters directly from the raw durable observation, with URL-safe compaction on the tail only. The latest emergency trajectory now includes both the current action and a compact carried-successful-search record, and the builder appends the last explicit trajectory-turn marker at the tail. Added the targetability marker to the remaining compact discovery tier. This preserves the actual source fact, successful-search URL(s), and blocked-action feedback without promoting snippets into verified claims.
- Source commit: d4e44d6b0e72d6c5e7de3b87b589f06e1c1ffb77. Regression assertion commit: 3cb3f49b7b0600ff42f447cdd84f37ba20a6f10e. Fresh CI is pending; do not proceed until these exact assertions pass.
- Runtime remains blocked by missing persistent Replit deployment access; no card/evidence IDs or normal persistent API read-back exist.

## 27. Corrected the last remaining targetability marker location — 2026-10-28, 05:18 UTC

- The 3cb3f49 run had not yet been verified green; the preceding 4ffe3e7 run's exact diff showed the absolute-minimum fallback still used the old “DISCOVERY PROGRESS GATE” label even though the shorter intermediate tier had the new targetability label. Added “DISCOVERY TARGETABILITY GATE” to the actual absolute-minimum context as well.
- Source commit: 513a686f4765530aea174eadac743f78014fd46e. The next run must verify the raw source-tail excerpt preserves FACT_AT_END_SENTINEL and the carried successful search record preserves its turn-17 label and lead URL, in addition to the targetability marker.
- No live deployment or persistent card/evidence read-back has been produced.

## 28. Source-tail token crowding and carried-search label corrected — 2026-10-28, 05:30 UTC

- The 513a686 run remained at 3 failures. The raw source excerpt did contain the end-of-page fact, but repeated URLs embedded in the source text caused the URL-safe compactor to compress the tail again, clipping the final characters of FACT_AT_END_SENTINEL. The targetability wording was present but the absolute-minimum gate did not include the exact “People—not companies or executive prestige—are targets” contract. The final blocked-action tier preserved the successful search record but labeled it only “LAST SUCCESSFUL SEARCH,” so the turn-17 trajectory assertion did not match.
- Redacted inline URLs from the compact page excerpt (the exact source URL is separately retained atomically in observedUrls), then preserved the raw 220-character tail excerpt; made the absolute-minimum targetability gate explicit; and added the exact latest-trajectory turn label to carried successful-search records in both rich and smallest emergency tails.
- Source commit: 69685e398026ce679f2e60772fdb35b94af1d6cb. Fresh CI pending. No deployed runtime, card/evidence IDs, or persistent API read-back yet.

## 29. Preserved the complete factual tail before URL-safe whole-prompt compaction — 2026-10-28, 05:44 UTC

- The 69685e3 run still failed the fact-sentinel assertion. Its source excerpt included repeated URLs in the tail; URL-safe compaction then shortened the tail inside the source envelope even though the exact source URL was separately retained. The same run's remaining discovery-contract assertion required the literal “ownership/equity/control/investment clue” phrase in the absolute-minimum tier.
- Reordered the compact source envelope so its raw URL-redacted end-of-page excerpt is first, followed by the exact observed URL array, then a short source head and metadata. The last 160 raw characters preserve the full synthetic fact sentinel and surrounding sentence; URLs are removed from excerpt text because the exact source URL remains separately and atomically recorded. Added the exact ownership/equity/control/investment gate to the absolute-minimum discovery context.
- Source commit: e1417535c9bb58d55c5fb1d219009b38146d84cd. Fresh CI pending. The carried successful search label must also pass on this revision.
- No persistent deployment/run/card/evidence read-back exists yet.

## 30. Corrected newest-turn vs carried-search label ordering — 2026-10-28, 05:58 UTC

- The preceding 69685e3 run still failed the final tail sentinel because URL-safe compaction was applied to a tail that contained repeated inline URLs; it also required the explicit ownership/equity/control/investment clue wording in the absolute-minimum tier. Commit e141753 then moved to a raw URL-redacted source tail and added the clue wording; the follow-up 60ec682 commit corrected the newest-turn/carried-search label ordering.
- The latest-turn assertion is distinct from the carried-search assertion: in the test case, turn 17 is the newest blocked action and turn 16 is the previous successful search. The emergency summary previously ended with the carried-search turn label. Reordered emergency trajectory summaries so the newest action is the final marker, while the shortest prompt tail now labels the carried search separately and appends the newest action's turn marker after it.
- Source commit: e1417535c9bb58d55c5fb1d219009b38146d84cd; follow-up source commit: 60ec682ce351913385975ef796dc65aa653501ce. CI for the latest revision is pending. No live run/card/evidence read-back exists yet.

## 31. Two remaining prompt assertions: literal seniority guard and latest-turn/lead URL co-retention — 2026-10-28, 06:12 UTC

- The 60ec682 run passed build, workspace typecheck, lead-card regressions, and strict provenance/cache tests; only two pivot-scope assertions remained (192/194 passed). The first required the literal “Do not infer wealth from seniority alone” phrase in the absolute-minimum context. The second required the newest blocked action's turn 17 and the preceding successful search's exact lead URLs to survive together at the tail; the carried search was turn 16 and must not be mislabeled as the newest action.
- Added the exact seniority guard. Both the normal and shortest record-tail builders now append a compact terminal label for the newest action together with the prior successful-search lead URLs, while labeling the prior search separately. The emergency observation record ordering similarly ends with the newest action's turn marker.
- Source commit: a5f74c574be5cd2f5eabda41aef15d482501b914. Fresh CI pending.
- No deployed runtime, canonical live run, card/evidence IDs, or normal persistent API read-back has been verified.

## 32. Latest CI caught an out-of-scope prompt budget variable; corrected, canonical hosting rechecked — 2026-10-28, 06:28 UTC

- Latest CI at source commit `a5f74c574be5cd2f5eabda41aef15d482501b914` did not pass: API Build, Research Quality Contracts, Python OSINT Worker typecheck, and Five Green Codebase Audit failed on TypeScript `TS2304: Cannot find name 'leadUrlCount'` in the shortest emergency prompt tail. The bug was an out-of-scope function parameter reference in the carried-search URL compactor, not a runtime result.
- Corrected that call to use a bounded explicit two-URL sample in the no-argument shortest emergency-tail builder. Source commit: `9fbabefa5afe9ae7e5f8f4106412e836eb2839de`. Current CI for that source commit is running: API Build run 40634644652, Research Quality Contracts 40634644694, Python OSINT Worker 40634644733, Five Green Codebase Audit 40634644735, and Five Consecutive Full Code Audits 40634644738. The static discovery check (40634644731) and prompt architecture audit (40634644789) have passed; other required checks are not yet green.
- Rechecked Vercel after the user approved the available team connection. Vercel still exposes only team `komarovychpetro-3830's projects`, with no linked Git projects, no project matching `2f22vtd4kr-cloud/BigContacts`, no Apex project, and zero deployments. Thus there is no verified Vercel deployment to launch; do not create a speculative Vercel project or claim Vercel is the canonical host.
- The repository README identifies `main` as the canonical working/integration branch. The discovered Replit app `BigContacts` (`https://replit.com/@hadserolkijuhte/BigContacts`) reports `found=false` for publish status and was last updated 2026-07-23. It is not a verified live runtime for the current PR branch. Replit inspection request returned no response. The current PR branch is not yet shown deployed to that app.
- Consequently, step 1 is still pending CI confirmation. Step 2 is not satisfied: the actual live canonical deployment/runtime remains unidentified. No canonical launch, single-query trace, persisted company card, evidence ID, or normal API/UI read-back exists. Do not treat a CI job, source assertion, or an unpublished Replit workspace as a real research run.

## 32. CI and deployment status after Vercel access approval — 2026-10-28, 08:08 UTC

- The latest tracked source commit is `9fbabefa5afe9ae7e5f8f4106412e836eb2839de`. Current checks:
  - Apex Research Quality Contracts run `40634644694`: passed.
  - Apex Python OSINT Worker run `40634644733`: passed.
  - apex-discovery-static-check run `40634644731`: passed.
  - Apex Prompt Architecture Audit run `40634644789`: passed.
  - Apex API Build run `40634644652`: failed at “Run discovery pivot-scope regression tests.”
  - Five Green Complete Codebase Audit run `40634644735`: failed at “Every API test file, isolated.”
  - Five Consecutive Full Code Audits run `40634644738`: cancelled.
- The API Build failure is not a compiler failure based on the failed-step name: build reached the discovery pivot-scope regression tests. The current branch therefore does not satisfy step 1; inspect the exact assertion failures and fix them before claiming verification.
- After the user approved Vercel team access, rechecked the connection. It still exposes only team `team_A2ZxrJwBh2CZdhvfn12qxfk2` (`komarovychpetro-3830's projects`), with zero linked Git projects, zero matching BigContacts/Apex projects, and zero deployments. No additional Vercel team is visible, so another approval link for that same team would not address the gap.
- Replit connector sees app `BigContacts` at `https://replit.com/@hadserolkijuhte/BigContacts`, last updated 2026-07-23; its publish status reported `found=false`. It is not evidence of a live deployment of this PR branch. Replit's app inspection request did not return a response.
- Current blocker is explicit: identify the actual canonical deployment/team/runtime (repository README points to Replit as the previous runtime, but the discovered app is unpublished and stale), fix the two CI audit failures, then launch via the real canonical UI/API/job path. No new canonical run ID, company card ID, evidence ID, DB write, or normal API/UI read-back has been observed. Do not treat these CI checks as a live run.


## 33. Recovery resumed: current-head CI failures and deployment recheck — 2026-10-28

- Re-fetched PR #759: head `4b00a08d0a510de3c6e5ad4e5ece032308e1cce2`, open and unmerged. The audit file itself is currently at blob SHA `ef39d84937e2d22f98a92e8b29587203391c0afe`.
- Current-head workflows: static discovery, prompt architecture, research quality, and Python OSINT worker passed; API Build (`40642052455`), Five Green Complete Codebase Audit (`40642052462`), and Five Consecutive Full Code Audits (`40642052422`) failed.
- Exact failing assertions found in job logs: (1) Investigator emergency prompt lost the exact newest trajectory marker `LATEST TRAJECTORY RECORD — TURN 17` while carrying a prior successful search; (2) pinned supervisor state lost a representative unfetched URL under prompt compaction; (3) a Right Hand fallback regression test still expected the old 5-attempt/1024-token settings while current source deliberately uses bounded 3 attempts, 768 tokens and 1024-token generation-budget recovery. These are prompt-compaction behavior and a stale contract assertion, not a TypeScript compile error.
- Rechecked Vercel after access approval: one Hobby team, no linked projects, no BigContacts/Apex project, and zero deployments. Replit lists the old BigContacts workspace last updated 2026-07-23; publish status is unpublished. Neither is verified as canonical/current. Do not deploy a disconnected copy.
- No new canonical run, card/entity ID, evidence/source ID, database write, or ordinary API/UI read-back has been observed. Next: fix the two genuine prompt-retention regressions and align the fallback contract test to current bounded settings, rerun CI, then establish canonical hosting and launch one real query.


## 34. Recovery recheck: latest CI completed; canonical runtime still unverified — 2026-10-28, 08:34 UTC

- Re-read PR #759: it remains open and unmerged on `apex-atlas-first-card-2026-10-27`, head SHA `d0f32f9f05f1af7c9dc2067a662b3f52b2fa4327`. PR description explicitly says runtime run and CI are pending and does not claim card persistence.
- Polled all seven tracked runs associated with that SHA. Passed: Prompt Architecture Audit `40642976593`, static discovery check `40642976627`, Research Quality Contracts `40642976640`, Python OSINT Worker `40642976613`. Failed: API Build `40642976646`, Five Green Complete Codebase Audit `40642976639`, Five Consecutive Full Code Audits `40642976590`.
- API Build and the codebase audit both completed build/typecheck successfully before tests failed. Exact current failing assertions from job logs:
  1. Investigator URL inventory expects `"leadUrlsOmittedFromPromptCount":0` but the composed prompt does not contain it.
  2. Investigator prompt architecture no longer matches the expected compact profile-page lead contract.
  3. Investigator prompt compaction loses the exact `LATEST TRAJECTORY RECORD — TURN 17` marker.
  4. Atlas control contract test expects the Right-hand adapter call to pass its validator in a specific form; actual source/test contract diverges.
  5. Pinned supervisor state compaction drops `https://registry.example.test/company-search`.
  These are not verified green. The earlier fallback retry-count contract also remains a concern until its current assertion is checked against the production implementation.
- Runtime recheck: the Replit connector could not inspect the originally supplied workspace ID `54156518-5f64-49b4-b481-c6d90b2eb571` (permission/not-found response). Its deployment-status endpoint returned the same access/not-found condition. Replit app search returned two separate apps named `BigContacts` and `Apex Atlas BigContacts`, updated 2026-10-13 and 2026-09-06 respectively; inspection questions on both returned phase `paused` with empty response. Neither result establishes repository linkage, current SHA, runtime readiness, or canonical status. Vercel context remains as previously recorded: no matching project/deployment.
- The GitHub combined status endpoint exposed only a successful Netlify deploy-preview context `https://deploy-preview-759--relaxed-bonbon-8725c2.netlify.app`. This is a PR preview, not evidence that the canonical application runtime, production database, research worker, or provider secrets are configured.
- No user-equivalent research query has been executed through a verified canonical runtime in this recovery pass. No new canonical run/job ID, company card/entity ID, evidence/source ID, database persistence, or independent API/UI read-back was observed. Do not mark the mission complete.
- Exact external blocker to resolve: grant the connected Replit integration access to the actual canonical workspace (the provided ID currently returns forbidden/not-found) or identify the canonical runtime and provide its supported access path. In parallel, fix the five current CI assertions on this same PR branch and verify fresh runs. No provider credential request is justified yet because the canonical runtime and its effective environment-variable readiness have not been inspected.


## 35. Codebase recovery — browser-fetch action preservation, generic lead rejection, and run-trigger safety — 2026-10-28

- **Confirmed root cause: browser escalation was silently disabled.** `normalizeRecoverableBrowserFetchAction` changed every safe `browser_fetch` action into `visit`, regardless of whether its selected browser provider was configured. It now preserves the model-selected `browser_fetch` action when that provider is available and uses the `visit` fallback only for an unavailable/stale provider label. The existing regression explicitly expects the configured Browserless action to execute and to retain `SOURCE_URL_UNVERIFIED` when the scraper cannot attest the final navigation URL.
- **Rejected generic discovery metadata.** The search-result company fallback's business-suffix heuristic could accept a generic title such as `Case Co`. Added a narrow placeholder-title guard and a regression that retains a concrete business-like result (`Northstar Casino Resort`) but rejects `Case Co`. This is a conservative identity/metadata guard, not a fixed target list or search sequence. The name and source URL still must be present in a successful actual search observation and meet the existing provenance/eligibility checks.
- **Protected raw model audit data.** Replit development trace output now targets ignored `.local/audits/APEX_ATLAS_MODEL_AUDIT_2026-10-28_CANONICAL_RUN_01.md`. Contact data is enabled only for this controlled diagnostic capture; visible/tracked-file opt-in is false. The tracked sequential audit remains a sanitized report, never a copy of raw prompts or contact values.
- **Prevented unintended provider spend on merge.** The provider-backed GitHub runtime-proof workflow is now manual-dispatch only. Merging the PR must not automatically launch a second isolated investigation because the user has chosen to launch the next canonical run on Replit.
- On the preceding source revision, API Build, Prompt Architecture Audit, discovery static checks, Research Quality Contracts, and Python OSINT Worker had passed; the full isolated API test/codebase audit workflows were still running. Later source/docs/workflow edits require checking CI on the final PR head before merge. Do not treat those earlier green workflows as final verification.
- **Runtime acceptance remains pending.** No Replit launch was performed by this agent. No new canonical job/card/evidence IDs or ordinary API/UI read-back were observed. The next user-controlled run must still prove a real review card and linked evidence persist and are returned by both `/api/dashboard/research-leads` and `/api/entities`, with truthful terminal state and the canonical active-job lock released.

## 33. Pre-run review: early person-role cards, compact prompts, and trace privacy — 2026-10-28

### Confirmed from the supplied pre-#759 run audit

- The reviewed standard-depth UK/Midlands case recorded 20 tool spans: 9 successful executions, 4 external-fetch errors, and 7 guard blocks. It ended at the 20-iteration ceiling with zero entities/cards, zero contact-evidence rows, and zero research-evidence rows.
- The trajectory repeatedly queried Companies House for UK renewable-energy records and re-encountered the same dissolved TOKERE record. Scrapfly fetches repeatedly failed on one Companies House URL; a model-selected ZenRows fetch succeeded but yielded no eligible person. The failure was not explained by a recorded provider quota/authentication failure or database/schema failure.
- The evidence supports two concrete problems: a source-selection/trajectory liveness failure (repetition consumed the action budget) and an admission/materialization gap (useful company/page/search leads were not converted into review cards early enough). It does not establish that every research target always has a qualifying person or direct contact.

### Changes added after the latest review of PR #759

- **Incremental person-role review cards:** the canonical discovery checkpoint now reads successful search/registry lead URLs as well as fetched-page URLs for exact, source-bound person+role findings. It can persist a low-confidence `PersonCandidate` review card from the first qualifying source observation, with explicit search-result vs fetched-source evidence tier and limitations. This is not HNWI admission and does not claim wealth, ownership/control, or contactability.
- **Checkpoint/terminal reconciliation alignment:** checkpoint person cards now use the same `partial_person_role_lead` evidence claim and `roleOnlyLead` metadata that terminal reconciliation expects, so later fetched evidence can upgrade a review lead rather than collide with a differently shaped partial card.
- **Private-contact boundary in the institutional mission:** publicly documented family/business connections may be recorded when materially relevant to ownership/control/investment/assets. The compact and full mission contracts explicitly prohibit inferring intimate relationships from surnames and using medical/clinic, spa, casino, or private personal-number data as a backdoor contact route.
- **Raw prompt trace privacy correction:** the manual-only canonical runtime-proof workflow had drifted to writing raw model traces into tracked `audits/` and enabling visible-file output, contrary to the private-trace contract. It now writes to ignored `.local/audits/`, disables visible-file output, and uploads that private path only as a workflow artifact. A regression assertion was added to the model-prompt-audit tests.
- **Tests added:** contract coverage for first-checkpoint person-role leads, search/fetched evidence-tier preservation, and the public-business vs private-intimate/health-data boundary.

### Verification status at this audit entry

- Source commits on the PR branch: `7a0068f5` (private audit path), `ced4fba6` (private-path regression), `3dedd671` (incremental person-role checkpoint cards), `c5647cc7` (mission/privacy contract), `c67ade19` (regression tests).
- The branch head is `c67ade1937c16c2910b3ad52c532f392f135218f` at the time of this entry. The PR remains open and unmerged.
- Required CI workflows were still running when this entry was written; this section is not a claim that those checks passed.
- No canonical Replit run, persistent database card ID, linked evidence ID, or normal API/UI read-back has been verified. The user's next Replit run remains the separate runtime acceptance gate after codebase checks pass.
- Continue to preserve model autonomy: no scripted source sequence, no fabricated card, no automatic target/HNWI upgrade, and no direct database insertion outside the canonical checkpoint/reconciliation pipeline.

## 34. Closed the no-model-finding checkpoint gap for typed registry results — 2026-10-28

- Further source review found a second gap in the first-card path: the Bureau invoked the checkpoint callback only when `record.findings.length > 0`, and `checkpointCanonicalDiscoveryFindings` returned immediately on an empty findings array. Thus a successful registry adapter could return typed `Corporation` leads, yet the checkpoint never ran if the model omitted a finding; terminal reconciliation was the only remaining chance to create a company card.
- Corrected the Bureau callback to checkpoint successful/partial search, registry, and fetch observations even when the model emitted no finding. The canonical checkpoint no longer skips empty finding arrays; it reads the durable case events.
- Extended incremental company materialization to collect typed `companyLeads` from successful registry subqueries and bind each lead to its exact claim-grade source URL and observed name/notes. Registry-only evidence stays a low-confidence company review lead; it does not establish wealth, ownership, HNWI status, or a person route. No synthetic name is derived from a hostname.
- Added regression assertions for the previously missing callback and registry-only checkpoint path. The changes preserve the model's source/tool choice and do not add a fixed Companies House-first or other registry sequence.
- Latest source commits for this extension: `7948ee74` (typed registry lead checkpoint), `3dc1eca9` (whitespace normalization), `1cc8505c` (registry checkpoint regression), `244f8ba1` (checkpoint after successful observations without findings), `6c84f8cf` (callback regression).
- Required CI was queued/running for head `6c84f8cff1233026b2298de96ae61327f441ce5d` when this entry was written. No live Replit run or persistent card read-back has yet been proven.
