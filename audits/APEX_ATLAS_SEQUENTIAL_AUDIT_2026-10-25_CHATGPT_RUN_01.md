# ⭐ APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-25_CHATGPT_RUN_01.md

**Repository:** 2f22vtd4kr-cloud/BigContacts
**Visible copy:** main; **review branch:** audit/chatgpt-replit-run-20261025
**State:** OPEN — no first card verified by this agent.

## Audit rules

Record only observed actions in order. Distinguish user reports, verified facts, hypotheses, and unknowns. Record model-visible prompts/responses and structured rationale when available, not hidden private chain-of-thought. Never record secret values, tokens, authorization headers, cookies, or connection strings. Never fabricate a target, source, finding, evidence item, or card. A launch acceptance is not successful-run proof.

## E001 — Project identity and source

- Repository default branch is main. Source commits inspected include df4ce35ba3370940a9ad5f7e20d09517a49324ad (audit trace / Investigator contract), 08b9cd1b9d91a31c3ed7f28c32ecf7f62d6c3897 (fresh-project audit), and 14dff4e8e8255306dc1aa8ed07298faa0b59a074 (launch checkpoint audit). These commits do not establish card creation.
- The connected Replit inventory available to this agent contains only BigContacts, ID 54156518-5f64-49b4-b481-c6d90b2eb571, URL https://replit.com/@hadserolkijuhte/BigContacts, last updated 2026-07-23T10:16:38.295Z. Searches for Apex Atlas and New Project returned no apps in this session. Other shared-repository audits describe other workspaces; equivalence is unverified.
- Publish-status lookup returned found=false. No published runtime URL exists in the returned Replit data. Do not publish: repository audit notes operator authentication is disabled.

## E002 — Parallel job and admission audit

- Another tracked audit records a default launch accepted as HTTP 202 in a separate/uncertain runtime, job eb10bdd6-2c98-41db-94fc-52d599ca09fe. Its last recorded poll at 2026-10-25T08:37:36Z was running, phase 1/4, inserted=0. No terminal state, final card count, or idle-lock confirmation is recorded. Do not conflate this job with the user-reported quota-blocked attempt.
- Static source inspection describes the canonical sequence: UI-default launch → durable job/case → model-led Boss and selected free-ReAct Investigator with bounded Right-hand oversight → exact-job/run-correlated source observations → evidence-gated admission/materialization → API/UI projection. A person card requires source-backed name and role, successful claim-grade retrieval, ownership/control clue, and valid model promotion. A search result or model assertion alone is insufficient.
- Static review did not prove a downstream card-projection bug. No synthetic target/card or admission-gate bypass is acceptable.

## E003 — Replit request and result

- Submitted one update request to the accessible BigContacts app asking it to reconcile prior jobs and active lock, then perform one UI-default launch only if the target runtime is verified idle, and continue through genuine source-backed card creation while maintaining a visible audit.
- Replit tool result was phase=updating with turn ID 54156518-5f64-49b4-b481-c6d90b2eb571/019f8e61-b65d-73cb-a757-0efd01410d86/01a17247-ca50-7794-8117-615ef44a1929 and URL https://replit.com/replid/54156518-5f64-49b4-b481-c6d90b2eb571. This proves task acceptance only; it does not prove boot, launch, search, or card creation.
- Two subsequent read-only status questions returned phase=paused with empty responses. App inventory remained at the July update timestamp. This session has no direct Replit terminal/API/database tool or published runtime URL with which to query live job/DB state.
- Container-side git clone and ls-remote attempts failed because github.com could not resolve. The GitHub connector itself remained available.
- This agent made no direct launch POST, provider request, database mutation, cancellation, or external search. Whether the accepted Replit agent task did anything internally is unknown, not success or confirmed failure.

## E004 — Audit branch checkpoint

- Latest main SHA observed at this checkpoint: 89dfec24e8c2f470f21e32e3a1768679c865532a.
- Created review branch audit/chatgpt-replit-run-20261025 and fast-forwarded it with an expected-head lease to that main SHA. This agent has not mutated main.
- This file is an ordinary visible audit under audits/, not a private/ignored trace.

## Current state — OPEN / BLOCKED

No first card is verified by this agent. Continue when actionable runtime status is available. Success requires a confirmed idle runtime, one canonical launch, actual source-backed observations correlated to the job/run, at least one durable admitted card, API/UI retrieval of that same card, terminal job state, and released active-job lock. Append these only once observed.
## E005 — Isolated GitHub Actions canonical-runtime attempt failed before launch

- The shared main branch added a trigger entry to scripts/live-batch-trigger.md, which correctly fired the existing .github/workflows/apex-canonical-runtime-proof.yml. This was performed by a parallel agent, not by this agent's direct Replit task. Workflow run: 40179498576, [Apex Canonical Runtime Proof](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40179498576), trigger commit d07dd20b9c4a8ef4a8ce9efd22a5754249aa87b4.
- Confirmed the runner reached its isolated PostgreSQL and Redis container initialization and checked out the repository, but failed at step 4, “Fail fast when canonical model roles are not configured.” It exited before Node setup, dependency install, build, schema initialization, API startup, or canonical launch.
- Decoded workflow job log shows the exact failure: “Missing GitHub Actions secret for the Groq Boss role.” The declared Groq Boss, Right-hand, and Investigator environment variables were empty in this runner. Search-provider credentials appeared masked/nonempty, but they do not replace the required model-role credentials. No credential values were copied into this audit.
- Runner job ID 121127300986 ended with conclusion failure. The canonical API launch step and all research steps were skipped. The workflow uploaded no artifact (artifact API returned total_count=0). Thus this attempt made no model request, search, page fetch, finding, admission, evidence-row write, card, or UI projection; it did not get far enough to test research logic.
- Tried to list repository Actions secret names using the connected GitHub fetch tool; the API endpoint was rejected by the connector allowlist. No tool for adding or reading repository secret values is available in this session. Do not attempt to copy Replit secrets into a repository or expose them in source/audit.
- Latest main SHA at this checkpoint: 98447dcd17ad6cdf12cf132b7a631f04db4f43e5, commit “Record Apex fallback credential preflight failure.” Confirm current main before additional changes because parallel agents continue to commit.
- This route confirms a missing GitHub Actions model-secret configuration blocker, not an Apex runtime/code failure. The required next route is a workspace with the already configured Groq role credentials or an authorized secure way to make those credentials available to the isolated runner; then rerun the actual canonical pipeline. No first card is verified yet.
## E006 — Independent verification of the concurrent UI-default workflow attempt

- Read workflow run 40179569398, [Apex Atlas User-Requested Live Run](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40179569398), with job ID 121127510267. Its launch parameters were reported as the user-requested UI defaults (3 targets, standard depth, 420000 ms per target).
- Runner steps confirm `Fail fast when canonical model roles are not configured` failed. Node setup, package install, local-service setup, schema/build, static checks, isolated operator auth, and the authenticated API/Bureau smoke were skipped. The log says `Missing GitHub Actions secret for the Groq Boss role`; the run classification is `infra_prelaunch_failure` / `researchQuality=inconclusive`.
- The run did not send `POST /api/ingest/atlas-run`, so it created no job ID and performed no model request, discovery search, visit/fetch, evidence write, admission, or card creation. This is independently consistent with the failed fast-mode fallback in E005.
- One artifact was available (`apex-live-audit-resilient`, 2,739 bytes). The shared main audit describes its contents as a starter audit/template only, with no launch/job JSON, model trace, entity response, source evidence, or API logs. It is not live-research proof.
- Main subsequently recorded this attempt in E019 at commit cc988c84682615800959cfcc6f0e186d9d26acaf. Current conclusion remains blocked by missing secure access to Groq role credentials in the isolated runner, plus absent reliable runtime control for the connected Replit app.
## E007 — Second Replit continuation task submitted; still no actionable response

- Submitted a second Replit Agent continuation request against the same accessible BigContacts repl. It explicitly prohibited duplicate launch until the target runtime, deployed revision and active-job lock are read-only verified; required reporting the precise quota/workspace blocker if execution was impossible; and forbade publishing, mock mode, synthetic cards, secret logging, or weakening evidence rules.
- The connector returned `phase=updating`, turn ID `54156518-5f64-49b4-b481-c6d90b2eb571/019f8e61-b65d-73cb-a757-0efd01410d86/01a17250-1609-7071-a9b2-a687e5d61819`, URL https://replit.com/replid/54156518-5f64-49b4-b481-c6d90b2eb571. A subsequent status question again returned `phase=paused`, empty response; the app inventory still reported last update 2026-07-23T10:16:38.295Z. No live launch, source search, DB query, card, or quota error text was returned.
- Attempted a read-only Replit query against the separate workspace ID described in the shared audit (`f6eea222-2fae-4e2c-a7b5-870a43f3b405`). Replit returned `Forbidden` while fetching agent information, confirming this session cannot control that other workspace. No action was executed against it.
- Operational conclusion is unchanged: accepted Replit task requests are not execution evidence. The only visible execution evidence is the two GitHub Actions preflight failures because model-role credentials are absent there; the user's Replit workspace/job is still not reachable or reconciled from this session.
## E008 — Latest shared audit confirms other Replit workspaces remain unreconciled

- Latest shared main at inspection time was `8a71258eb179e36491eda3a4a716ddb812bb77ae` (commit “Record Replit runtime access ambiguity and duplicate-launch safety gate”), whose tracked sequential log appends E020.
- That E020 records that another agent's Replit `Apex Atlas (1)` had a prior read-only baseline at checkout `22e43a1e903dcc425b67ecf7ef5900aad87ae2d3`, while main was then `655f52897287ee8f9944defc28e4c5ad4f670a83`, API stopped, `ENABLE_AUTO_PIPELINE=true`, readable Redis slot with no active/latest job pointers, and an empty dev DB (0 entities/cards and 0 case/evidence rows). Another agent requested disabling the auto-pipeline before boot, syncing current main, verifying the database/lock, then one default launch. Post-request status became paused/empty; no launch outcome was returned. A second older `Apex Atlas` workspace had an empty baseline, and also no later job/card status was confirmed.
- E020 additionally notes 7 pre-existing entities/cards in `Apex Atlas (1)` before its request; these are not attributable to a new job and are not counted toward success. Its explicit safety rule is to reconcile the unknown job/lock state before any further launch.
- This supports the distinction in this audit: the accessible BigContacts Replit app is not proven to be either of those actual workspaces, and the separate GitHub Actions runs failed before launch. There is still no verified source-backed card created by this run.
- No further direct Replit task or GitHub workflow was launched after learning that the current target workspace/job state is unobservable and the required role credentials are absent from the available isolated runner. Further blind launches would be unsafe and would repeat the documented failure.
## E009 — User supplied test credentials; secure Replit configuration attempt did not return confirmation

- The user supplied provisional credentials for the required Groq roles and search/enrichment services, including a Redis connection. This agent used those values only as inputs to one Replit Agent request that explicitly instructed it to set them through Replit's secure Secrets UI and prohibited writing credential values to source, tracked audits, logs, or Git. No values are reproduced in this audit.
- Replit tool accepted a task at phase=updating (turn ID 54156518-5f64-49b4-b481-c6d90b2eb571/019f8e61-b65d-73cb-a757-0efd01410d86/01a17258-2395-7718-b42b-f67a6f35bc1f). The subsequent status call returned phase=paused with an empty response; app inventory still reported the July 23 timestamp. There is no confirmation that any secret was written to Replit secure settings, nor that the app was synced, booted, or launched. Treat all secret setup as unconfirmed.
- No key was installed into GitHub Actions because this session has no GitHub Actions secret-write capability; the public API connector explicitly rejects secrets endpoint access. The two fallback workflows therefore remain blocked at the missing Groq role-secret preflight. The key values were not added to any repository file or workflow.
- The existing Replit project still has no returned runtime/job/database endpoint, and the actual candidate Apex Atlas workspaces described by other agents remain inaccessible or paused. No safe read-only confirmation of active-job/lock state was obtained. Do not submit another launch to an unknown/possibly active workspace.
- No provider request, search, source fetch, evidence write, admission, or first card is confirmed by this step. Secure credential availability is now supplied by the user but not yet operationally configured or validated. Never treat provision of a key as proof that it is valid or that quota remains.
- Security note: because working credential material has been pasted into the conversation and into the secure-configuration task request, rotate/revoke these provisional test credentials after the work is unblocked, especially the Redis connection and provider keys. This is a precaution; no evidence of unauthorized use has been observed.
## E010 — Two additional shared default-launch attempts still failed before runtime

- Refreshed workflow history after the credential handoff. Two further `Apex Atlas User-Requested Live Run (2026-10-25)` workflow runs are now present: [40179743647](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40179743647) (job `121128048468`, started 09:13:20 UTC) and [40180006897](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40180006897) (job `121128858449`, started 09:17:10 UTC). Both failed in “Fail fast when canonical model roles are not configured.” Logs explicitly classify each as `infra_prelaunch_failure` / `researchQuality=inconclusive` and report `Missing GitHub Actions secret for the Groq Boss role`.
- In both runs, setup/build/schema/API/Bureau steps were skipped after the gate; there is no launch POST, job ID, model request, search/fetch, evidence row, admission, or card. These events are prelaunch credential failures, not research-quality outcomes.
- Main was at `de7d70c7ef0854b9128716f8c767dcf1b3e7084c` when checked (09:24:24 UTC), and the shared sequential audit was being updated with the same blocker. No successful canonical runtime run or newly source-backed card appeared in the inspected history.
- Secret setup remains unconfirmed: the latest Replit secret-configuration task returned `phase=updating`, then `phase=paused` with no response; the app inventory was unchanged. The GitHub connector has no secret-write endpoint. No values were copied to Git or workflow source. Do not retry these workflows until role credentials are actually stored in the target execution environment.
- Final state at this event: **no first card verified; secure secret installation and Replit runtime access are blocking conditions.** The accepted old job `eb10bdd6-2c98-41db-94fc-52d599ca09fe` is still unknown in its original workspace. Any further run must wait for an actual status/lock reconciliation.

## E011 — First post-credential canonical run reached research but ended with zero findings/cards

- Workflow: [Apex Canonical Runtime Proof 40183010170](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40183010170); run commit `fb25f550aba690ca687abc84fab498fc41969d90`; runtime job `1839ef8a-49fa-47df-a004-016447ef8949`; discovery case `1`.
- The authenticated launch succeeded with `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`, and `singleTargetId=null`. API health was `ok`, Redis health `ok`, and research key presence passed. This confirms a real canonical API/job/control-loop run, not yet card acceptance.
- Terminal state at `2026-10-25T10:14:08Z`: `status=failed`, `outcome=incomplete`, phase `3/4`, progress `3/4`, `inserted=0`, `skipped=0`, `errors=0`; reason: Investigator iteration ceiling after 20 iterations. Durable job result reports 20 searches, 1 visit, 40 trajectory records, 0 findings and 0 parsed candidates. The captured `/api/entities` response was `[]`; no durable review card or identity evidence was created. No card is credited.
- Observable control roles: Groq Boss model `openai/gpt-oss-120b`, Groq Right-hand `openai/gpt-oss-120b` (initial approval, confidence 0.7), selected Investigator capability `groq-investigator-1`. Right-hand approved an investigative hypothesis about Midwest state registries for privately held manufacturing businesses; this was control direction, not source evidence.
- Tool diagnostics from the private workflow artifact: initial Tavily parallel search succeeded with six lead URLs (including a Yahoo Finance article about Smead Manufacturing and family-manufacturer context). The first Scrapfly fetch failed, and a subsequent visit to the same Yahoo Finance URL returned page text, but the text did not produce an explicit Investigator finding. The Serper adapter repeatedly returned `INVALID_REQUEST (HTTP 400)` on web and parallel searches; multiple model/provider responses included structured-output `json_validate_failed` recoveries and HTTP 429 token rate limits. A `sec-edgar` registry action was blocked by the active-geography guard; repeat-action guard blocks were correct and sent no outbound request. The Investigator did not emit a valid promoted candidate, so admission did not run.
- Artifact `12595336247` was downloaded and inspected locally. It contained `launch.json`, `job-final.json`, `atlas-trace.json`, `entities.json`, `health.json`, and API logs. It did not contain the dashboard research-leads projection because that capture was added after this run. Secret values were not included in this tracked report.
- Diagnostic conclusion: the app and real model loop ran, but research production was poor owing to repeated search-provider errors, scope/repeat blocks, and zero explicit findings. This is not evidence of a card-renderer defect by itself; the source-backed admission boundary must remain intact.

## E012 — Corrective source/workflow revisions and second canonical run in progress

- After E011, the shared `main` received targeted corrections: `62669e5` adds browser-fetch provider-contract recovery; `58fe2b0` tests it; `cff5767` provides bounded fallback if rich-intelligence context composition throws; `0518a5e` adds `GET /api/dashboard/research-leads?limit=8` to the runtime artifact; `04142ea` projects evidence-gated canonical `PersonCandidate` admissions into review cards, and preserves `promotionDecision=promote` when evidence rows are reused. Those card changes require explicit promotion, matching case/job/supporting event, observed HTTPS source, and a review-only candidate; they do not fabricate data or relax admission.
- Corrected `.github/workflows/apex-canonical-runtime-proof.yml` in commit `a93d96d` so the request body matches the UI launch exactly: `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` (no helper flags, no single-target override). Trigger commit `81793e9` created workflow run [40185758177](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40185758177) at `2026-10-25T10:40:43Z`.
- Latest observed runner job: `121146072497`, “Real canonical Boss → Right-hand → Investigator run.” PostgreSQL/Redis containers, checkout, required Groq role preflight, Node setup, frozen pnpm install, application build, schema initialization, and isolated operator authentication all passed. At the last poll, step 11 “Run canonical API and one discovery-first case” was `in_progress`; no final launch JSON or artifact was yet available through the run-artifact API. This proves startup progressed, not that a card exists.
- Continue polling that same run only. Inspect its launch/job JSON, model/tool trace, terminal status, durable entity/evidence counts and dashboard projection. If the run fails, classify the exact break and fix forward; do not launch a concurrent replacement or claim success without the same card appearing in durable storage and API projection.


## E013 — Search-provider circuit breaker and follow-up live run

- The trace from run `40183010170` showed repeated Serper `INVALID_REQUEST` failures consuming Investigator turns. Main commit `d42e4df65d3cd004da492812e72e7d625426c54c` adds trajectory-local provider failure tracking so repeated invalid requests disable only the failing search adapter; alternate model-selectable providers remain available, and transient rate limits are not treated as permanent provider failure.
- A trigger commit `3c65e96f0203bd65719eb192f6022338194f4f6d` started workflow `40185974497` using this correction. Its runner job is `121146718079`. The first post-projection run `40185758177` (job `121146072497`) and this newer corrected run were both still in the canonical API/research step at the latest read. Each uses isolated service containers and job state; their provider calls may share upstream account rate limits.
- No new result is credited here. Both runs must be followed to terminal and their own evidence artifacts examined. A card counts only after a newly persisted source-backed candidate, linked identity evidence, and the same candidate returned by the dashboard API projection are verified.


## E014 — Three terminal runtime runs reconciled; upstream control-plane rate limits blocked card admission

### Run 40185758177 — pre-circuit-breaker build
- Pinned revision: `81793e97e769c8dc10ad4b2a53933dcd9cd46b63`. Runner job `121146072497`. Artifact `12596223088`, `apex-canonical-runtime-proof`, downloaded and inspected.
- Canonical launch job `e19d5732-61a3-46c7-8863-9c74f2685f0a` accepted with exact UI defaults `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`, `singleTargetId=null`; health returned `status=ok`, Redis `ok`, research keys configured.
- Terminal state at `2026-10-25T10:48:28.994Z`: `failed/incomplete`, phase `3/4`, `inserted=0`, `skipped=0`, `errors=1`. Failure: `Groq Boss generation failed (CONTROL_PROVIDER_RATE_LIMIT); Atlas transition is fail-closed.`
- Earlier Boss and Right-hand outputs were real model completions. Right-hand **rejected** the opening U.S. regional-registry/equity hypothesis as insufficiently testable; it proposed seeking ownership evidence through source classes with better public disclosure. Boss selected `groq-investigator-1`. The run reached 10 searches and one successfully fetched page, with 11 other leads unfetched, but zero explicit Investigator findings, zero parsed candidates, and zero admitted candidates. `entities.json=[]`; dashboard `leads=[]`. Some exposed source leads were an investor/contact database page and an unfetched LinkedIn profile; those search/page leads were not promoted to identity evidence.
- API logs show multiple successful Groq `openai/gpt-oss-120b` responses, several JSON-validation retries, and token-window HTTP 429s. The final control transition failed when the single configured Boss key hit `upstream_token_window_wait_exceeded`. The circuit breaker was not yet present in this pinned revision.

### Run 40185974497 — search-provider circuit-breaker build
- Pinned revision: `3c65e96f0203bd65719eb192f6022338194f4f6d`. Runner job `121146718079`. Artifact `12596203110`, downloaded and inspected.
- Canonical launch job `6a7a5afb-c1b1-47d4-bee4-14886a2b80b3` accepted with exact UI defaults; health and Redis were `ok`.
- Terminal state at `2026-10-25T10:48:28.588Z`: `failed/incomplete`, phase `3/4`, `inserted=0`, `skipped=0`, `errors=1`. Same fail-closed control failure class: Groq Boss token-window rate limit.
- Right-hand approved a model-selected direction on family-owned mid-market manufacturers in Bavaria and public German Handelsregister filings. Investigator made 4 searches and 0 visits; 12 source leads remained unfetched, with zero findings/candidates/admissions and no entities. Dashboard `leads=[]`. Because this run shares the configured external provider account, it may have contended with the simultaneously executing previous workflow. The provider circuit breaker affected search-provider selection but cannot substitute for or bypass a Boss-role quota.

### Run 40186219574 — prompt syntax repair snapshot
- Pinned revision: `0a8853fd6b5be1ef833e4c8d4b95bfad95a59236`. Runner job `121147451720`. Artifact `12595529203`, downloaded and inspected.
- Canonical launch job `c497440d-3b85-499a-9501-6e15ae79b300` was accepted, health `ok`, but immediately terminalized `failed/incomplete` at phase `1/4`, zero inserts/errors, because `Groq Boss was unavailable after bounded same-role model fallback; no alternate Investigator capability was substituted.`
- Boss trace contained `upstream_token_window_wait_exceeded`; zero discovery trajectory, search, fetch, findings, candidates, evidence, or cards. This was an upstream control-plane quota condition, not a source admission or card-projection failure. The launch job itself confirms that the run was on the earlier pre-repair snapshot; follow-up source commits `3cb9448`, `376a99b`, and `315e2a0` fixed escaped-case-label prompt syntax and added regression checks after that snapshot.
- All three workflow runs are terminal; none has an active in-run process. Each uses ephemeral PostgreSQL/Redis, so its rows/cards are independent. Multiple concurrent runs did, however, place simultaneous load on the same upstream provider credentials and exposed limited Boss token-window capacity. No card is counted from any of them.
- Action: serialize the next attempt on the latest tested `main`, allowing the quota window to reset. Do not start multiple proof workflows in parallel. Keep the exact UI-default request and strict source-backed admission. If the Boss quota resets, the single run can complete. If a Boss call is still blocked, record the typed failure and use only the architecture's authorized provider/capability recovery; never synthesize a card or claim success.


## E015 — Serial retry gate after shared token-window contention

- Post-run audit reconciliation is complete for all three previously active isolated workflows. All are terminal `failed`; none materialized entities/cards or identity evidence.
- Two longer runs reached the canonical free-ReAct discovery/control loop, but both final Boss transitions failed closed with `CONTROL_PROVIDER_RATE_LIMIT` / `upstream_token_window_wait_exceeded` after earlier real Boss and Right-hand completions. The prompt-syntax snapshot failed immediately on the same Boss token-window capacity class with zero discovery actions.
- The provider metric samples in the collected API logs show short-window token resets of approximately 19–56 seconds on the Investigator requests at that time; the Boss adapter's own typed failure means its requested wait exceeded the configured 120-second per-model recovery budget or the remaining control deadline. Multiple simultaneous runs shared the upstream account's rate window. This is an upstream control-plane capacity boundary; it must not be mistaken for a missing card-projection row or silently bypassed.
- I confirmed that no canonical proof workflow remains active before authorizing the next attempt. The next run will be serialized against current main (including prompt syntax recovery, provider action circuit breaker, and evidence-gated dashboard card projection), with the exact UI-default launch body. No more proof workflow will be triggered in parallel. The current source retains the bounded, fail-closed Boss model/key recovery and does not substitute an Investigator or a retired model for Boss.


## E016 — Canonical run 40188811963 failed on the old TPD recovery path; post-run model-scoped fallback added

- Run [40188811963](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40188811963) was pinned to `e3df4501e723f85ac5a098b5661f2a66a02bb4cc`, before the token-capacity fallback eligibility fix. The exact UI defaults were accepted. Job `e496e33f-9652-41d3-9951-b9d82795c28d` ended `failed/incomplete` with `inserted=0`, zero searches, zero visits, zero source observations, zero admitted candidates, and empty entity and dashboard-lead projections. Artifact `12597577374` was downloaded and inspected.
- The live model trace showed successful Right-hand and Boss completions but the selected Investigator's `openai/gpt-oss-120b` calls returned `upstream_token_quota_exhausted`. No web research action ran. The older run ended before it could consume the new model-specific fallback implementation.
- Main subsequently gained the model-scoped recovery helper in commit `50dd86e410b8412957ca51caef0cf5ac7cc25e3d`, its use in the canonical token-capacity reassignment in `93da5dc596e6e93a50328a38dc3f4a2b5c25d957`, and regression tests in `c21217ca90b57c072f4833d97172c65c5b2f4bcd`. It allows the Boss to choose GPT-OSS 20B after 120B model token-capacity exhaustion without counting duplicate same-model credential slots as independent keys. The source-backed admission gate remains unchanged.
- The latest API build triggered by the new test/source revision was still running at the latest check. The next canonical trigger must use a commit that includes these fixes, be serialized after the previous run is terminal, and then be inspected for a real fetched source and admitted card—not just a successful workflow.


## E017 — Canonical run 40190801927: registry scope guard and Investigator output recovery exposed

- Run [40190801927](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40190801927) used revision `9b3e2978cb1ee363c2826cd01d4a6ac3b9ded880`, after the Boss prompt was changed to pivot when the Right-hand rejects an infeasible opening direction. Runner job `121161199228` ended `failed/incomplete` with `inserted=0`, `skipped=0`, `errors=1`; discovery remained unavailable, with zero executed searches/visits, zero fetched pages, zero admitted candidates, and no entity/card projection.
- The opening Right-hand review completed and approved a model-selected Lombardy, Italy construction-firm direction using the Registro delle Imprese. During the first discovery loop, two model-selected registry actions were blocked by `pivot_alignment_guard`: the lexical scope guard required sector anchors inside a concise company-name query even when the selected registry adapter was jurisdiction-scoped. This prevented the Investigator from testing a model-generated named-company hypothesis.
- The selected Investigator's GPT-OSS 120B requests hit upstream token-quota exhaustion. The bounded GPT-OSS 20B fallback then received repeated Groq `json_validate_failed` responses even after the JSON-object compatibility retry. Separately, the next Right-hand control call was rate-limited (HTTP 429) on both the primary and same-role fallback model; the Atlas transition correctly failed closed. This run does not establish a card-projection defect because no sourced candidate reached admission.
- No provider credentials, rate limits, or evidence gates were bypassed. The Right-hand 429 is an external provider-capacity condition and should not be misdiagnosed as a successful run or fixed by substituting a different role/provider.

## E018 — Targeted Investigator recovery and scoped-hypothesis corrections

- Opened [PR #744](https://github.com/2f22vtd4kr-cloud/BigContacts/pull/744) to fix the two reproducible code-level failures from E017. GPT-OSS 120B keeps strict JSON-schema output; GPT-OSS 20B omits provider-side `response_format` after the observed JSON-schema and JSON-object rejections, while the local JSON/action parser, action allowlist, argument validation, evidence provenance, and source-backed admission gates remain mandatory. The no-format behavior is limited to the Investigator's 20B recovery capability; it does not change Boss or Right-hand provider policy.
- The initial pivot-scope change was found too permissive in review: matching registry jurisdiction/source class did not prove that a named company belonged to the active sector (for example, a Swiss retailer could pass a Swiss manufacturing pivot). The follow-up fix removes that exception from both action authorization and diagnostics. Concise named-company registry follow-ups now require successful fetched evidence grounded in the active pivot; jurisdiction-matched registry adapters and search-result leads alone do not establish topical alignment. Broad off-topic queries and mismatched adapters remain blocked.
- Regression coverage includes strict-schema retention for GPT-OSS 120B, omitted provider format for GPT-OSS 20B, a named-company hypothesis in Zefix/Switzerland, rejection of broad off-topic registry queries, rejection of jurisdiction-mismatched adapters, regional ARES/Czechia behavior, and source-lead provenance. Full API build, isolated API-test sweep, and the consecutive complete-audit workflows are being rerun against the final PR revision. Do not mark the canonical runtime proof successful until a serialized live run persists a source-backed candidate and verifies it through the canonical entity/dashboard read path.


## E019 — PR #744 review correction: require fetched evidence for named-entity registry follow-ups

- Codex review identified that the E018 exception could authorize an unrelated named company solely because a registry adapter matched the pivot jurisdiction. This violated the active-topic boundary despite downstream candidate admission remaining evidence-gated.
- Corrected on the PR branch by removing the registry-only named-entity bypass from `pivotActionIsAligned` and from the failure-dimension diagnostic. Existing `pivotResourceIsGroundedInAlignedEvidence` is the only path for concise name follow-ups that do not themselves carry topic anchors; it uses observations from successful fetches under the exact active pivot scope key. Registry search results remain leads, not claim-grade evidence.
- Regression test changed to reject ungrounded names even on the matching Swiss registry and mismatched registry, and to permit a named follow-up only after a successful aligned fetch observation mentions the entity. A parallel UK case also asserts that a matching Companies House adapter does not make an ungrounded name in-scope.
- Revision under verification: `2efc8540e0d9c87986cf7f428ff0cbc1414f062d`. CI was queued/in progress at the time of this entry; no local test execution or live candidate/card acceptance is claimed. The canonical Replit app remains stale and disconnected from GitHub, so a real runtime proof must still be executed against the corrected revision before declaring Apex ready.


## E020 — National registry geography compatibility

- The follow-up Codex review found that the registry geography guard used a small regional whitelist, rejecting a London-only pivot for Companies House and similarly rejecting many otherwise in-scope US localities for SEC EDGAR. The guard remains fail-closed for cross-jurisdiction adapters; this correction expands the explicitly supported subregion/city aliases across the implemented national registries, including London and common US states/cities. For unknown localities, the query must also name the registry's country/jurisdiction rather than letting a national adapter authorize an arbitrary place.
- Added regression coverage proving a London pivot accepts Companies House but rejects SEC EDGAR, and an Austin, Texas pivot accepts SEC EDGAR but rejects Companies House. This is a static compatibility guard only; it does not claim a live registry response or candidate admission.
- Verification revision: pending CI on the combined follow-up commit. Canonical runtime proof remains the final acceptance gate.


## E021 — Unknown national subregions require explicit jurisdiction in query

- Tightened the national-registry correction so known subregions (including London and common US cities/states) are recognized directly, while an unlisted locality is accepted only when the actual query also names the adapter's country/jurisdiction. This avoids requiring a finite list of every possible town and avoids letting an arbitrary capitalized location pass against a mismatched registry.
- Regression coverage includes an unlisted Springfield locality: Companies House is accepted only when the query explicitly includes United Kingdom, while SEC EDGAR is rejected when no US jurisdiction is established. This is code-level scope validation; live runtime acceptance remains pending.


## E022 — Run pivot-scope regression tests in the standard API CI gate

- Confirmed that the standard API build workflow did not execute `src/src/lib/agentic-web-research-core.test.ts`; the complete-codebase audit loop covers `src/src/test/*.test.ts` but not the library test directory. Added an explicit CI step to run the core pivot-scope test file together with `discovery-runtime-correctness.test.ts` on every relevant API source change. This makes the named-company evidence gate and national-registry geography regressions direct CI requirements instead of relying on typecheck or static checks.
- Current revision: pending CI. No runtime card acceptance is claimed until the canonical proof workflow returns a source-backed card through both API projections.


## E023 — Canonical runtime probe: West Midlands scope alias and temporary Groq TPD exhaustion

- Canonical proof run `40198764037` on main revision `fb79d12a8e706bfc668196ba9a9813fa4764bcf1` failed closed with no candidate admitted. The audit artifact recorded that Groq GPT-OSS 120B was at the organization's 200,000 tokens/day limit (198,716 used; the request required 2,761 tokens and was asked to retry after 10m38s). The 20B fallback and Right-hand role were also rejected by the same organization's TPD limit. This is an external quota blocker; do not treat the empty candidate result as a successful no-hit or replace Investigator with an oversight role.
- The trace also showed the approved West Midlands renewable-energy pivot's first Companies House searches succeeded, but later in-scope queries were blocked because the region compatibility table had `midlands` without the exact compound alias `west midlands`. Added explicit West Midlands/East Midlands and other England-region aliases plus a regression asserting Companies House accepts the West Midlands query and SEC EDGAR rejects it.
- The canonical workflow's acceptance gate correctly failed: `entities.json` was empty and dashboard leads were empty. The next proof must run after the provider's stated quota reset and must produce a persisted source-backed card through both API projections.


## E024 — Preserve official Companies House record URLs as fetchable leads

- The failed canonical run's trace had `searches > 0`, `visits = 0`, and an empty deduplicated lead URL inventory. The Companies House normalizers retained company/officer identifiers but omitted their official record URLs from metadata, so `registryResultLeadUrls` could not pass a record URL to the Investigator for a chosen visit. This made the successful registry search result a name-only lead.
- Added canonical public Companies House web URLs to normalized company records using validated official company numbers, and officer appointment URLs only when the official API response supplies a matching `links.self` officer path. These remain unvisited leads and are never copied to observed URLs before a successful fetch.
- Added regression assertions for company and officer URL normalization. The next canonical run must show the Investigator fetching a returned official record URL and still pass the persisted-card gate; URL construction alone is not evidence.


## E025 — Make Replit's normal build ignore local handoff snapshots

- The Replit sync verified that the app code was at merged main `a44235837bd65bf6092e2836ad3c1cb40e18c5b0`, with clean working tree and healthy API/Redis, but its unmodified root build still failed at `scripts/check-build-no-source-mutation.mjs`. The guard recursively scanned ignored session-local snapshot manifests under `.local/conversation-workspace/files/` and treated stale script strings in those historical snapshots as live package lifecycle commands.
- Updated the guard to skip `.local` alongside other generated/cache directories. The guard still scans tracked project package manifests and rejects executable source-mutator scripts; this only excludes local handoff snapshots that are not part of the repository source.
- Replit must be synced to the merged guard fix and a normal, unmodified `pnpm build` rerun before declaring the app ready. This is separate from the canonical runtime card acceptance gate.


## E026 — Keep GPT-OSS Right-hand contract validation local

- The second canonical proof (`40200678057`) failed during the opening Right-hand review before discovery began. Groq GPT-OSS 120B returned HTTP 400 `json_validate_failed` for the provider-side response format; the same-role 20B fallback was temporarily blocked by the remaining organization TPD quota (2,125 tokens requested while only 1,375 remained, with a 5m24s retry window). No card was expected from this failed run.
- Updated the Right-hand adapter to omit provider-side `response_format` for GPT-OSS models and keep local JSON extraction plus the caller's exact contract validator authoritative, matching the existing Investigator compatibility strategy. A single bounded contract-recovery retry remains, then the adapter moves to the next same-role model. Regression tests assert that both GPT-OSS models are called without `response_format` and that invalid output is still rejected locally.
- The next canonical proof should run after the provider's stated TPD reset and must still pass the persisted source-backed card gate.


## E027 — Align task-scoped Right-hand tests with GPT-OSS local JSON contract

- The canonical proof is still running against `e2abdc75629869fdacab3a7100d5fd73a224b8cc`. The full-isolation audit for that SHA caught two stale assertions in `groq-right-hand-reasoning.test.ts`: they expected GPT-OSS to receive provider-side `json_schema` and then `json_object` during completion-budget recovery. The adapter intentionally omits provider `response_format` for GPT-OSS; local parsing and the caller validator remain authoritative.
- Updated both stale assertions to require the field be omitted. No production behavior changed. Re-run isolated tests and the full five-audit gate; the live canonical acceptance gate remains independently required.


- Follow-up audit of PR #749 found one duplicate assertion remained because the first patch replaced only the first occurrence. Updated the second stale GPT-OSS `json_object` expectation too; the failed audit log was the evidence for this correction.