# Apex Atlas — Overall Architecture Bug Hunt

**Audit date:** 2026-10-09  
**Branch:** `main` only  
**Scope:** End-to-end source/control-flow review, durable evidence and terminal proof, provider boundaries, lock/lease recovery, prompt budgets, current-main tests/CI, frontend taxonomy, and operational documentation.  
**Runtime boundary:** No Replit workflow was run and no live Apex research job was launched for this audit. This is not a claim of production/runtime acceptance.

## Architectural contract preserved

Apex is intended to be a model-directed research bureau, not a deterministic enrichment ladder. The flow remains: human objective → Groq Boss → Groq Right-hand review → model-owned Investigator trajectory → durable observations/provenance → Research Intelligence and evidence sufficiency → target-scoped investigation when justified → Boss continuation/stop → deterministic terminal authority.

The deterministic layer enforces authorization, lane ownership, resource/deadline limits, output shape, source provenance, immutable history, evidence sufficiency, and honest terminal status. It should not prescribe “search this, then visit that, then query a registry.” A liveness guard can prohibit repeating a nonproductive action class without choosing the next tool; this constrains failure without scripting research.

## High-impact defects fixed or materially hardened on main

1. **Discovery names could be counted as admitted before evidence existed.** The canonical admission boundary requires a promoted candidate-scoped finding, observed HTTP provenance, and a successful retrieved-page observation from the same Investigator run matching the normalized full name and a claimed source URL. Only an entity with durable review evidence is returned to subsequent control decisions. Entity/evidence writes are transactional; failure to create the evidence session aborts the transaction. Relevant code: `canonical-atlas-discovery.ts`, `identity-text-match.ts`, discovery admission guards.

2. **Discovery completion could be reported with zero durable admissions.** A model's `MODEL_DECIDED_DONE` alone no longer establishes discovery terminal authority or a complete case when there is no source-backed durable admission. Zero admissions means review/incomplete, not success by assertion.

3. **Identity matching could confuse substrings or differently normalized names.** The shared matcher uses Unicode NFKC, case/punctuation/whitespace normalization, and token-bounded full-name matching; deduplication uses the same identity normalization. This prevents matching “Ann Li” inside “Joann Li.”

4. **Opening Right-hand reviews accepted weakly shaped JSON.** Discovery and target opening Right-hand calls now use a bounded strict response contract for decision, reason, focus lanes, and confidence. Empty, malformed, extra-field, overlong, or out-of-range payloads fail closed. Tests exercise accepted and rejected shapes.

5. **Target terminal status did not fully require completed oversight.** Target terminal proof requires a completed Investigator episode, `MODEL_DECIDED_DONE`, at least one evidence graph, completed Right-hand/Boss oversight explicitly choosing stop, and no cancellation/resource/deadline fence. The overall Atlas terminal gate includes the run deadline. Model intent is evidence for a decision, not permission on its own to claim terminal success.

6. **Lease-loss handling risked divergence between Redis job and database case state.** A confirmed owner mismatch from a successful lease-renewal command triggers two independent best-effort fences: an atomic Redis script rechecks current ownership and preserves missing/terminal job snapshots before cancellation, while the database independently transitions only active cases bound to that job into review. `Promise.allSettled` means a failure in one store cannot prevent the attempt against the other; failures are surfaced with sanitized state diagnostics. A transport/command error during renewal remains a retryable ambiguous failure and does not trigger lease-loss fencing. This separation is intentional partial-outage recovery, not a research-policy decision.

7. **Investigator prompt/context handling has structural bounds.** The assembled provider message is bounded together with the stable system instruction. Working context keeps the latest trajectory record visible and an archive index for older observations; complete observations remain in durable storage. Emergency compaction preserves task-contract/action boundaries. Repeated malformed action results have a liveness ceiling. These rails bound resource failure without prescribing the next research action.

8. **Contact promotion and source provenance have been tightened.** Agentic contact values must be grounded in immutable observations tied to the correct case/job/target; candidate name and contact must be supported by the same identity-bearing observation, and each cited page must support the claim attributed to it. Search-result pages are not claim-grade sources. Source lineage—not raw URL count—determines independence.

9. **Provider/cache/transport safeguards have expanded.** Current main includes queue-time budget rechecks, refreshed provider-gate reads around waits, credential-bearing URL cache isolation, safe outbound-fetch/SSRF checks, bounded parser recovery, and Groq structured response contracts. Capacity waits use provider reset telemetry as a bounded temporary wait, not as evidence of a hard quota or a reason to silently drop to a smaller model.

10. **The current provider-role documentation was stale.** The new-account initialization blueprint was corrected to stop describing Mistral as an active Investigator option. Historical Gemini-era handoffs are marked as historical; current source/config and current setup docs govern role names.

11. **The terminal falsification gate confused priority with execution.** A hypothesis could require falsification when confidence was at least 0.8, while the same confidence contributed only `score * 0.35` to priority—below the `< 0.35` terminal bypass threshold. The gate could therefore declare falsification “satisfied” without a disconfirmation action. It now requires at least one successful external action whose model-authored purpose, hypothesis or query explicitly indicates disproof/counterevidence/refutation; the model still chooses the action and provider. Regression cases distinguish a genuine disproof attempt from ordinary verification.

12. **Target continuation persisted control before claiming the case and confused failure with stop.** The route created a new job ID but left the durable target case bound to the previous job while calling `decideTargetNextAction`; that helper correctly refused to persist a decision whose owner did not match `caseFile.atlasJobId`. Its stop update used the new ID too, so it could report a legitimate stop as cancellation. Worse, the old branch grouped `decision.status !== "completed"` with `action === "stop"` and could mark unavailable control `done/complete`. Early stop/error returns also cleared the active pointer without reliably stopping the lease-renewal timer. The route now claims/rebinds the case in a serializable row-locked transaction before asking Boss, validates durable ownership and live lease during decision projection, keeps unavailable decisions failed/incomplete, uses a shared row-locked transition for stop/error outcomes, and releases the active pointer and lease timer on early exits.

## End-to-end paths inspected

- UI launch intent, launch-body normalization, canonical route ownership and legacy-route retirement.
- Distributed `atlas-run` claim/release, heartbeat renewal, lease-loss handling, job terminal protection, cache authority, stop/cancel races and durable case fences.
- Groq Boss opening assignment, Right-hand review, Investigator selection, model-owned ReAct/tool selection, malformed-action recovery, search-only liveness and bounded episode continuation.
- Tool observations and durable case events, run/job/source identity, evidence graphs, source lineage, contact promotion and candidate admission.
- Review-only discovery entities/evidence, target-scoped investigation, oversight status, final deadline/resource proof and terminal projection.
- Provider quotas/reset headers, queue/cache behavior, SSRF boundaries, frontend entity taxonomy, package/static guards and the documentation agents are instructed to follow.

## Remaining items — do not mark the system fully green

- **Runtime acceptance remains unverified.** The October 4/6 audited runs created no admitted entities/evidence rows. The code path is materially stronger, but only a fresh, explicitly authorized Replit run can prove real provider calls, durable ledger inserts, candidate admission, target research and UI projections agree. This audit did not launch a run.
- **CI must be checked at the exact final head.** During the sweep, the static discovery check and frontend five-condition gate passed on nearby commits. API checks exposed lease static assertions that lagged source changes; the assertions and lease logic were updated. The branch was receiving concurrent commits and CI runs were being cancelled/restarted during inspection, so a nearby pass is not final-head verification. Do not infer that “Five Consecutive Full Code Audits” passed unless five completed green audits exist on the current final source.
- **Candidate taxonomy now has a neutral source-level representation.** New discovery admissions persist as `PersonCandidate`, render as “Candidate — wealth unverified,” and are excluded from HNWI/organization name reclassification. Target-scoped contact promotion now also permits `PersonCandidate` destinations, but only after same-page identity/contact binding, immutable observation provenance, active target-case/job fencing, identity-collision checks, and transactional revalidation; this records a sourced contact without implying wealth. `lib/db/migrations/003-atlas-review-candidate-type.sql` reclassifies only legacy rows with valid JSON metadata matching both `reviewOnly=true` and `admission=investigator-explicit-promotion`; malformed/ambiguous metadata is deliberately left for manual review. The SQL migration is explicit and has not been run against any user database in this audit; deploy/run it separately in the approved migration window.
- **Historical trace-vs-ledger telemetry must be reconciled on live acceptance.** Previous audits found trace counters could diverge from immutable event counts. A fresh run must compare before/after job/case/event/evidence/session/entity counts, event IDs, supporting URLs, target IDs and UI projections—not just health or model summaries.
- **Character ceilings are not token budgets.** The transmitted message envelope is bounded, but actual selected-model tokens, prompt caching, reset headers, wait durations, retries and request-size behavior must still be confirmed with live telemetry. Never silently omit the action schema or downshift model/context quality to conceal pressure.
- **Research quality needs trajectory-level evaluations, not just static/mocked contracts.** Add a clean-case evaluation corpus covering hard identity ambiguity, contradictory and stale sources, source-family dependence, empty discovery, rate limits, prompt injection and legitimate early stopping. Grade the result plus the trajectory and source grounding, use multiple trials, and send ambiguous cases to human review.

## External research applied

- OpenAI's [Deep Research guide](https://developers.openai.com/api/docs/guides/deep-research) describes multi-step research that uses tools and model reasoning.
- The OpenAI [Deep Research System Card](https://openai.com/index/introducing-deep-research/) documents the risk of instructions embedded in untrusted web content; fetched pages must remain observations, not control-plane instructions.
- Anthropic's [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) argues for control patterns suited to the task while preserving model/tool flexibility.
- Anthropic's [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) recommends trajectory/task-level assessment, groundedness/source-quality grading, multiple trials and a combination of automated checks and human review.
- Groq's [Rate Limits](https://console.groq.com/docs/rate-limits) and [Structured Outputs](https://console.groq.com/docs/structured-outputs) cover the provider capacity/reset signals and schema-constrained responses relevant to this runtime.

**Disposition:** This pass has corrected identified source/contract defects and added regression tests, architecture guards, a guarded migration, and documentation on `main`. Final-head CI and source-level full audit must finish before this is considered code-complete; explicitly authorized live-provider runtime acceptance remains separate. Keep the Bureau model-led. Continue strengthening the boundaries and measurement around the model rather than converting the Investigator into a scripted enrichment pipeline. Keep the Bureau model-led. Continue strengthening the boundaries and measurement around the model rather than converting the Investigator into a scripted enrichment pipeline.


## Follow-up bug-hunt — RDAP redirect semantics and truthful tool status

A source-to-tool trace found one concrete defect beyond the earlier liveness/provider fixes. RDAP.org is an RDAP bootstrap service that intentionally redirects clients to the authoritative registry, and the RDAP HTTP standard expects a client to issue the follow-up request to the Location URL ([RDAP.org usage](https://about.rdap.org/); [RFC 7480 §5.2](https://www.rfc-editor.org/rfc/rfc7480.html)). The shared outbound transport intentionally does not follow redirects automatically because each destination must be checked against the SSRF policy. The prior domain lookup adapter nevertheless treated the expected 302 as an RDAP failure, discarded the redirect location, and the Investigator action layer marked every returned adapter object as successful even if rdap.ok/whoisjson.ok was false. That made a real capability failure appear to be a successful observation and removed the information needed for a model-chosen next step.

The follow-up change keeps the common transport's manual-redirect/validated-IP model intact and implements RDAP-aware redirect handling inside the RDAP client: each HTTP hop is a separately quota-gated request using safeOutboundFetch, receives per-hop DNS/IP validation and pinned transport, rejects HTTPS downgrade and URL userinfo, detects cycles, caps redirects at four, and shares a 12-second total lookup deadline. The final authoritative URL is recorded as provenance only if it contains no credential-like query parameter. The Investigator action now takes its execution status from the selected adapter's explicit ok field, includes a sanitized provider error when unsuccessful, and carries a successful RDAP source URL in observedUrls. This changes no research ladder and does not relax the candidate-admission requirement for a successful retrieved page.

Regression coverage added for authoritative redirect following, downgrade refusal, cycles, redirect ceilings, HTTP failure status, provider-success mapping, and source-URL secret redaction. Repository CI must validate these tests at the exact resulting main head; this patch has not been run against Replit and adds no live network/runtime acceptance claim.


## Follow-up deployment-path audit — complete explicit schema migration chain

The new-account/maintenance initializer `scripts/initialize-apex-schema.sh` applied Drizzle schema push, durable hardening migration `001`, and contact-outcome migration `002`, but omitted the checked-in `003-atlas-review-candidate-type.sql`. That left a deployment path where the application could be upgraded while legacy discovery rows still remained typed as established `HNWI`, despite the canonical model distinguishing review-only `PersonCandidate`. Migration `003` is transactional, re-runnable, and deliberately only reclassifies rows carrying the exact discovery admission/review-only markers; malformed metadata remains untouched.

Updated the explicit initializer to execute `003` after `002` and before durable schema verification. Extended the source-migration parity guard to assert opt-in occurs before any schema mutation and migrations run in the intended order; wired that guard into API build and test entry points as well as the existing root bureau check. Updated the Replit setup contract to document this behavior. No database migration was executed against Replit or any live database during this audit; this repairs the reviewed initialization path only.


## Follow-up bug-hunt — target continuation Right-hand contract

The target continuation control path had a contract mismatch that was not covered by the opening-review and per-act oversight gates. `target-control-decision.ts` treated any parseable JSON object as a completed Right-hand review; for example, an empty object produced `status=completed` with a null decision, empty focus lanes, and null confidence, allowing Groq Boss to be invoked without valid oversight. Groq HTTP success and JSON syntax are not equivalent to a valid review.

The continuation now passes Right-hand output through the shared exact-field validator used by the opening review. A missing field, unexpected field, wrong type, out-of-range confidence, or overlong decision/reason/lane makes oversight unavailable and enters the existing fail-closed branch before Boss control. The original provider error is retained for genuine provider failures; malformed successful responses receive a bounded contract error. Investigator tool/action autonomy and Boss-owned continuation policy are unchanged.

Added focused regression tests for a valid review, empty object/array, omitted and unexpected fields, invalid confidence, malformed lane values, oversized reason, and provider failure despite parseable content. Extended the target-control architecture check so the review validator remains on the continuation path. This source update has not been executed in Replit or against live providers. The code/tests still require exact-head CI completion; no live runtime acceptance is claimed.

External contract check: Groq documents that JSON Object Mode guarantees JSON syntax but not schema adherence, while Structured Outputs enforce the supplied schema when supported; therefore the local trust boundary must validate the review before assigning completed oversight ([Structured Outputs](https://console.groq.com/docs/structured-outputs), [API Reference](https://console.groq.com/docs/api-reference)). Deep-research agent evaluations should preserve trajectory-level correctness rather than accept a successful single call as task success ([Anthropic agent evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).


## Follow-up build blocker — YTJ registry adapter syntax

The exact-head GitHub Actions run exposed a separate parse/typecheck blocker in `searchYtjFinland` in `registry-client.ts`: the function-level `catch` at the tail had no corresponding opening `try`. The repaired function now opens an outer `try`, while retaining all three closures needed before the inner best-effort catch around detail retrieval. The outer catch logs the provider failure and rethrows it so the multi-endpoint aggregator can mark the provider result incomplete rather than silently treating a partial response as a complete registry search. Exact-head CI for later source changes must still be inspected; no Replit/runtime action was taken.


## Follow-up bug-hunt — Right-hand request-slot cancellation cleanup

The Groq Right-hand request-start gate used an abortable `Promise.race` and a pacing timer, but successful resolution of either path did not remove the associated `abort` listener. The gate now uses explicit settled-state cleanup for both the serialized queue wait and pacing wait; cancellation remains prompt, clears the timer, and releases the gate in `finally`. Provider/model selection, the research objective and decision policy are unchanged.

Added regression tests for immediate grant, successful paced wait, and cancellation. They assert that successful paths leave zero abort listeners and that cancellation leaves no timer behind. These are source-level tests until the exact-head GitHub Actions run completes. No Replit workflow or live Atlas run was launched.


## Follow-up architecture-guard correction — Redis job state

The prior static guard for Redis job-state semantics used unbounded regular expressions that could match a later function's `if (!ok) return null` and accidentally mark `getActiveJob` as fail-closed even when the match came from a different function. That is a false-green risk in the verification layer itself. The guard now extracts each relevant function body independently, verifies the `getActiveJobStrict` unavailable-vs-idle classification, asserts the canonical launch and stop routes use the strict read, and checks multi-read/release/latest-read behavior within their own boundaries. The compatibility `getActiveJob` remains explicitly best-effort for non-authoritative callers; authoritative launch/stop decisions cannot use its ambiguous null-on-error behavior. This makes the architecture check test the actual control-flow contract rather than incidental text elsewhere in the file.


## Follow-up status-boundary hardening — legacy ingestion lanes

The `/ingest/status` response also surfaced active job state through best-effort `getActiveJob`/`getJob` reads, so a Redis outage could make a running `western-hnwi` or `faa` lane appear as `null` without signaling uncertainty. The route now reads both lane pointers through the authoritative multi-read, reads pointed-to records with `getJobStrict`, returns `503 JOB_STATE_UNAVAILABLE` for read failures, and returns `503 JOB_STATE_INCONSISTENT` if an active pointer has no durable job record. This changes status semantics only; no ingestion strategy or execution pipeline is changed. The Redis fail-closed architecture guard now checks this route specifically.

## Follow-up lifecycle fix — ingestion lane claim failure

Five non-canonical ingestion endpoints (`western-hnwi`, `faa`, `occrp`, `land-registry`, and `opensky`) created a durable queued job and then attempted to claim their distributed active-lane lock without a local failure boundary. Concurrent launches could both pass the advisory pre-check; after one acquired the lock, the losing request would throw before starting work and leave its job record in `queued` until TTL expiry.

The new `claimIngestionJobOrRespond` boundary catches that claim failure, releases only if the attempted job ID owns the lock, attempts to mark the never-started job `failed`, and returns HTTP 503 with `JOB_CLAIM_UNAVAILABLE`. All five launch paths call it before starting workers. The existing authoritative queue architecture guard now checks these five call sites and the failure cleanup. That guard is invoked from the API package build and test scripts, not merely the optional root `check:bureau` command.

If Redis is unavailable even during the best-effort terminal update, the API still reports the claim as unavailable and never starts the worker; durable terminalization cannot be guaranteed until Redis recovers. This is intentionally not described as success.

## Follow-up UI/API contract fix — unreachable launch warning

The desk's Atlas launch helper queried public `/api/healthz` for `bureauIntegrity`/`lanesHonesty` fields that the endpoint deliberately does not return. The supposed “critical bureau integrity” launch warning was therefore unreachable, and the pre-launch request gave users no actionable status. Removed this dead health probe and warning suffix. The launch result now reflects the canonical launch response directly; detailed readiness remains a separate diagnostic concern and must not be inferred from a coarse liveness endpoint.

## Historical release blocker — authorization gap resolved in source; deployment still unverified

At the audit snapshot when this finding was written, the API entrypoint, Express app, and route aggregator did not enforce a general operator-auth boundary. That source-level finding prompted the canonical session work below and is no longer an accurate description of current `main`.

Current source now mounts the single `operatorAuthRouter` before `requireOperatorAuth` in `artifacts/api-server/src/src/routes/index.ts`; the API app sends requests through that aggregator once. The guard fails closed if its three required auth controls are missing/too short, authenticates a signed 12-hour HttpOnly operator session or explicit bearer credential, and applies a trusted-Origin check to state-changing browser-cookie requests. The browser desk is wrapped by `OperatorGate`, sends the password only to the login endpoint, does not persist it, and remains in the verified view until the server confirms logout. Sign-in has bounded failed-attempt throttling.

The source-level gap is therefore **resolved in current source, pending exact-head test proof**. This does not establish that production secret values are configured, that the deployed artifact matches `main`, or that the actual hosting ingress is private. Those are separate deployment assertions and were not probed by launching or accessing Replit. Keep the release gate open until exact-head CI passes, required-secret preflight is completed in the intended deployment, and the runtime/edge policy is verified by the deployment operator. Do not infer ingress privacy from CORS or from source code alone.

## Follow-up auth integration regression — one session contract

A browser-safe operator session and a legacy API session verifier had briefly coexisted at separate levels of the Express mount. Those formats are incompatible: a browser cookie minted by `operator-auth.ts` would not validate under the legacy API-cookie verifier. The current `main` app mount has removed that legacy middleware; the route aggregator retains the canonical `operatorAuthRouter` → `requireOperatorAuth` boundary.

Added regression coverage checking the actual app mount and router ordering, preventing the old middleware from being reintroduced ahead of the canonical guard, and verifying that the browser login payload matches the server's `password` contract. These wiring assertions and existing token/session unit tests do not establish deployment ingress policy and are not a substitute for exact-head CI or live route acceptance.


## Follow-up security fix — preserve operator lockout deadline across window rollover

The operator login limiter counted failed attempts in a 60-second window and set a 60-second block after the eighth failure. Its lookup path also reset the attempt record when the window elapsed, unconditionally clearing `blockedUntil`. An eighth failure near the end of the window could therefore be unblocked before its own deadline.

The route now uses `advanceLoginAttemptWindow`, which preserves the existing state while `blockedUntil > now` and only opens a new failure window after the lockout expires. Added regression coverage at the precise boundary: a block begun near the end of one window must persist past that window and reset only at its own deadline. This is a source-level correction; exact-head CI and deployed authentication behavior remain to be verified.


## Follow-up telemetry fix — target Investigator failures must not appear successful

The live tool-span mapper now preserves missing and unknown statuses as `unknown`, but the target-agent completion span had a separate hard-coded mapping: it emitted `ok` for every status except `timeout` and `cancelled`. That incorrectly labeled `unavailable` and `error` Investigator results as successful. Both live-step producers also defaulted a missing status to `ok`, bypassing the safer mapper.

A shared `digSpanStatusFromExecutionStatus` mapping now handles terminal completion, error, cancellation, and unknown states. Target-agent stage telemetry uses that mapping, and target/discovery live-step producers no longer invent success when the source status is absent. Regression coverage checks the status table and both production call sites. This is observability correctness; it does not by itself prove the underlying research outcome succeeded.
