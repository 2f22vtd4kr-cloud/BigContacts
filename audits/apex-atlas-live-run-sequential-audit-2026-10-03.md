# Apex Atlas Live Run — Sequential Audit — 2026-10-03

## Scope and audit rules

- Audit file: `audits/apex-atlas-live-run-sequential-audit-2026-10-03.md`
- Goal: trace one normal UI-equivalent Apex Atlas launch from discovery through investigation and any new card creation, stopping at the first genuine failure boundary.
- The launch request must match the dashboard defaults: `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- Exactly one launch is authorized for this audit. Do not retry a failed run, use a test/harness bypass, start a continuation, or issue standalone provider readiness probes.
- A completed job or a summary count is not proof of a card. Compare the pre-launch entity IDs/counts to newly persisted entities, cases, and evidence.
- Star only entities created by this run, promptly after each new entity is confirmed. Do not change existing cards.
- Do not record secrets, credential-like values, raw emails/phone numbers, or unnecessary personal data. Record timestamps, job/event/entity IDs, status transitions, sanitized errors, action types, and public evidence provenance.
- Keep a sequential record as the run proceeds. On a genuine failure, preserve the terminal state and post-run ledger, then stop.

## Previous attempts reviewed

- `audits/apex-live-run-sequential-audit-2026-10-01.md`: the one UI-equivalent launch was accepted but failed at Gemini Boss opening with provider HTTP 503, before Right-hand review, Investigator selection, web discovery, target research, evidence admission, or card creation. The audit correctly stopped without retry.
- The 2026-10-01 audit also summarized 2026-09-26/29 failures: schema drift, Serper HTTP 400, Gemini provider 429/403/503, prompt-size HTTP 413, invalid test-harness contracts, and Redis lock initialization failures. Do not repeat the bypass/harness attempts or assume a configured key proves provider capacity.
- Current source differs from that earlier run: discovery now enters through the canonical UI launch and uses the current Groq Boss / Mistral Right-hand control path. Use the current source contract and current system status; do not issue provider connectivity probes.
- Prior audit warning: `research_evidence` has `session_id` and `entity_id`, not `case_id`. Reconcile evidence through its actual schema.
- Prior admission lesson: compare ledger deltas and provenance; a contact/finding summary alone is not evidence that a new card was admitted.

## Setup issues in this imported workspace

During the 2026-10-02 import and first boot, the API build encountered and resolved these blockers before any Atlas launch:

1. The event-schema guard rejected the canonical writer role `groq_boss`; the declared event-role schema, replay role list, and guard were aligned.
2. The recovery boundary guard expected an older Gemini-only set although current code also supports the durable Mistral Right-hand failure state; the guard was aligned with the implementation.
3. The Mistral Right-hand readiness function was missing a closing brace; the source syntax was repaired.
4. The Right-hand credential guard expected a literal suffix string, while current code constructs role-scoped environment-variable names; the check was updated to validate the existing construction.
5. After the API first served, dashboard requests returned HTTP 500 because the new development database had no application tables. Read-only inspection confirmed it had no public tables. The repository's explicit schema initializer was run against that empty development database; it created the required tables and inserted no sample rows.

After setup, the API build guards passed, the app served `/`, `/api/healthz` and the dashboard data routes returned HTTP 200, and the preview showed an empty ledger. These setup fixes did not launch research.

## Sequential record

### 000 — Audit opened before launch

- **Local timestamp:** `2026-10-03 05:18:59 EEST` (`2026-10-03T02:18:59Z`)
- **Action:** Created this audit file before restarting or launching Atlas.
- **Status:** `preflight`
- **Prior audit review:** Completed; no previous job is being resumed or retried.
- **Next action:** Restart the existing API workflow, inspect non-probing readiness and active-job state, and capture a read-only database baseline.

### 001 — API workflow and non-probing readiness

- **UTC timestamp:** `2026-10-03T02:19:57Z` (`05:19:57 EEST`)
- **Action:** Restarted the existing `artifacts/api-server: API Server` workflow. Its build guards passed and the server reached its start command.
- `GET /api/healthz`: HTTP `200`; API `ok`, Redis `ok`, research-key configuration present.
- `GET /api/system/status`: HTTP `200`; `bureauIntegrity=ok`, no integrity reasons, Postgres `ok`, local Redis `ready`, configured Upstash slot `ready`. The status snapshot reports configured Groq/Mistral/Boss/Right-hand and web-search lanes, but this is configuration status, not provider-capacity proof.
- `agenticLlmLastOk=null` because the restarted process has no recorded LLM step yet. No provider connectivity/readiness probes were made.
- `GET /api/ingest/job/active/atlas-run`: HTTP `200`; `active=false`, `jobId=null`.
- **Interpretation:** No job is in flight. Redis reports ready, but the earlier audit warns that this does not prove remaining monthly command quota. Proceed with only the one requested launch; do not retry if it fails.

### 002 — Pre-launch database baseline

- **UTC timestamp:** `2026-10-03T02:19:58Z` (read-only development-database query)
- **Action:** Counted the durable ledger tables and captured existing entity IDs, creation times, and star flags.
- **Baseline:** `entities=0`; `research_cases=0`; `research_case_events=0`; `research_sessions=0`; `research_run_events=0`; `research_evidence=0`; `contact_evidence=0`.
- **Pre-launch entity IDs:** none. No pre-existing cards will be starred or modified.
- **Interpretation:** The database is empty after schema initialization. All later row counts and entity IDs are attributable to this run.

### 003 — UI launch contract and star behavior

- **UTC timestamp:** `2026-10-03T02:20:00Z`
- **Action:** Rechecked the existing dashboard launch handler and entity-star endpoint.
- **Launch defaults:** `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`; the dashboard calls `POST /api/ingest/atlas-run`.
- **Star action:** For each newly persisted entity, set `isStarred=true` through the existing `PATCH /api/entities/:id/star` endpoint. Only baseline-new entity IDs qualify.
- **Next action:** Submit the exact default dashboard request once; record its response before polling.

### 004 — Canonical UI-equivalent launch accepted

- **UTC timestamp:** `2026-10-03T02:20:17Z` (`05:20:17 EEST`)
- **Request:** One `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- **Response:** HTTP `202 Accepted`; `singleTargetId=null`; the canonical model-owned discovery job was accepted.
- **Job ID:** `7fa7235a-569f-4767-8fcf-87facd923af1`
- **Poll URL:** `/api/ingest/job/7fa7235a-569f-4767-8fcf-87facd923af1`
- **Interpretation:** Acceptance proves only that the launch boundary accepted the job. Discovery, research, evidence admission, and card creation remain unproven.
- **Next action:** Observe only this job and its durable event/ledger deltas. Do not submit another launch.

### 005 — Opening control action persisted

- **UTC timestamps:** Discovery case created `2026-10-03T02:20:20.541123Z`; opening event recorded `2026-10-03T02:20:20.707851Z`.
- **Durable case:** `caseId=1`, `caseType=discovery`, status `review`, iteration `0`, current action `mistral-right-hand-unavailable`.
- **Durable event:** `eventId=1`, `actorRole=groq_boss`, `eventType=assignment`, status `recorded`, model `openai/gpt-oss-120b`, correlation key `7fa7235a-569f-4767-8fcf-87facd923af1:boss-opening`.
- **Interpretation:** The Groq Boss opening assignment was the only recorded control action. No Mistral Right-hand approval event, Investigator selection, search, visit, or discovery admission was recorded.

### 006 — Terminal failure boundary and post-run reconciliation

- **Job terminal timestamps:** started `2026-10-03T02:20:17.957Z`; finished `2026-10-03T02:20:21.686Z` (3.7 seconds).
- **Terminal observation:** At `2026-10-03T02:20:53Z`, `GET /api/ingest/job/7fa7235a-569f-4767-8fcf-87facd923af1` returned HTTP `200`: status `failed`, progress `0/4`, `atlasPhase=0/4`, outcome `incomplete`.
- **Exact terminal message:** `Mistral Right-hand unavailable; failing closed: Mistral Right-hand mistral-small-2603 rate_limited: [object Object]`
- **Failure classification:** The durable job message classifies the Mistral Right-hand call as `rate_limited`. The message stringifies its structured detail as `[object Object]`, so no more specific HTTP status or provider error body is available in the persisted response. This does not establish whether the cause was a quota, rate window, or another provider-side limit.
- **Break point:** Required Mistral Right-hand review immediately after the Groq Boss opening assignment. The job stopped before Investigator selection, web discovery, visits, candidate admissions, target-scoped research, evidence admission, or card/entity creation.
- **Post-run active lane:** `GET /api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`.
- **Final durable counts:** `research_cases=1`; `research_case_events=1`; `research_sessions=0`; `research_run_events=0`; `research_evidence=0`; `contact_evidence=0`; `entities=0`.
- **New cards and stars:** No entity/card was created, so there was nothing to star. No pre-existing card was changed.
- **Workflow logs:** The managed API workflow remained running. Log refreshes after the launch had no new application log output; the durable job response and PostgreSQL case/event rows are the evidence for the failure boundary.
- **Decision:** Stop here. No retry, recovery/continuation, harness, provider readiness probe, or second launch was issued.

## Run outcome

**Stopped at the first live failure boundary.** The one default UI-equivalent launch was accepted, persisted a Groq Boss opening assignment, then failed closed when the Mistral Right-hand returned a `rate_limited` classification. Discovery, research, evidence, and card creation were not reached. The final ledger contains one discovery case and one opening event, but no entities or evidence. No card was available to star, and no retry was made.
## 014 — Post-run source reconciliation and committed remediation

- **UTC timestamp:** 2026-10-03T11:45Z onward.
- **Action:** Reconciled the live-audit diagnosis against the actual GitHub `main` source rather than relying on the imported Replit workspace state.
- **Confirmed source defect:** the canonical Groq Right-hand adapter on `main` still sent the unsupported GPT-OSS request field `reasoning_format:"hidden"`. The earlier claimed fix was not present on `main`.
- **Confirmed source defect:** the canonical discovery compactor clipped individual fields but did not enforce a total serialized discovery-context budget. The Right-hand's existing 20,000-character guard could therefore fail closed before reaching Groq.
- **Implementation committed and merged:** PR #460, merge commit `cdf7a08e9b1d8ff56f1e9331ef31763769d58a9b`.
  - Right-hand now sends `reasoning_effort:"medium"` with `include_reasoning:false`, never `reasoning_format`.
  - Discovery context now uses progressively smaller deterministic profiles, bounds source URLs and organization-footprint notes, preserves the newest investigator report, and enforces a hard 20,000-character user-prompt budget with a 1,024-character reserve.
  - Offline regression coverage was added for both the request shape and oversized discovery context.
- **Additional committed reconciliation:** the health route no longer reports a fake Gemini Right-hand lane; README and living context now describe the canonical Groq-only control plane and retired operator authentication.
- **Verification:** the PR's Netlify deploy-preview status for commit `8428cf1a27ed8ffba79e3c47589df3a6e3599ae0` reached `success`. No live provider request was made as part of the source remediation.
- **Live-run status limitation:** the audit's last recorded job remains `78d032e0-6878-4276-aeb5-5ac5371b11e9` at the accepted-launch boundary. The GitHub repository does not contain the Replit runtime job state, and the Replit App connector did not expose the imported application by searchable app ID in this session, so no terminal state is invented and no second launch is issued.
## 015 — Final source integrity correction after remediation review

- **UTC timestamp:** 2026-10-03T11:51Z onward.
- **Finding:** review of the merged PR #460 source showed that the prompt-bound edit had displaced the discovery-advice user-prompt statement outside its function. This was a source-integrity defect even though the frontend deploy preview was successful.
- **Correction:** PR #463 restored the complete canonical `runGroqRightHandDiscoveryAdvice` implementation while retaining the GPT-OSS request contract and bounded discovery compaction.
- **PR #463 merge:** `9980d451367bd0cf67e5311b0b2d88e050665812`.
- **Replit configuration correction:** PR #462 removed the remaining `APEX_DEV_AUTH_BYPASS` entry and retired Gemini Right-hand timeout environment variables from `.replit`; merge commit `489aa0f59dc8914a2f385f7ca426b1a3432833e7`.
- **Static post-merge checks:** the canonical Right-hand source now contains `include_reasoning:false`, no `reasoning_format`, the bounded discovery profiles, `boundedDiscoveryPrompt`, and a complete `runGroqRightHandDiscoveryAdvice` function. The application source and Replit configuration contain no active operator-auth middleware, gate, bypass variable, or retired operator-auth secret requirement.
- **Important verification limitation:** Netlify deploy-preview success verifies the preview build path but is not equivalent to the full API typecheck/Vitest suite. No backend CI result was available through the repository status surface, and no live provider request or Atlas launch was issued during these source corrections.
- **Live-run boundary:** the previously authorized job `78d032e0-6878-4276-aeb5-5ac5371b11e9` remains the only recorded post-fix launch in the audit. Its runtime terminal state is not available from GitHub, and no second launch is authorized merely to compensate for that missing observation.

## 022 — Why no HNWI card was created

This is a source-based explanation of the completed run, not a claim that a candidate was rejected.

- The launch brief contained only `targetCount=3`, `researchDepth=standard`, and `targetTimeoutMs=420000`; it did not define an HNWI threshold, geography, sector, wealth basis, or named target.
- The run made two discovery searches: a broad founder/CEO contact query returned zero URLs, and a venture-capital team-page query returned ten URLs. Neither result set was visited.
- Therefore the run established **zero visited pages, zero named candidate findings, and zero source-backed HNWI claims**. A search-result URL is a lead, not verified evidence.
- The canonical admission contract requires an exact named person, candidate scope, an explicit promotion decision, and an actually observed source. Creating a speculative entity would violate the zero-synthetic-HNWI rule.
- After the first Right-hand review approved continued discovery, the next required Right-hand review became unavailable. The fail-closed control boundary stopped the run before target-scoped research, evidence admission, and entity projection.
- `targetCount=3` is an upper bound on target work, not a guarantee that three—or even one—people will be found and completed.
- **Conclusion:** no card was created because no verified candidate was produced and the required control boundary then failed. This is not evidence that no suitable HNWI exists, nor evidence that a fully researched HNWI failed the card classifier.

## 023 — Provider failure analysis: what is known and what remains unproven

The live failure was reviewed against the current provider gate, Groq Right-hand adapter, Atlas control decision, and canonical continuation code.

### Proven

- The live Right-hand failure was classified as `ProviderQuotaError` with `errorCode=cooldown`. This is Apex's **local provider-gate state**, not proof that Groq's upstream account quota was exhausted.
- The shared gate applies a five-second default cooldown after a Groq HTTP 429/402 unless the calling role explicitly owns transient retry handling. It keys the cooldown by a credential fingerprint and does not log the raw credential.
- The Groq Right-hand adapter has its own bounded 429 retry and 120B→20B same-role model fallback. Before this remediation, the shared gate could turn the first upstream 429 into a local cooldown; the adapter's next retry could then be rejected locally before reaching Groq.
- The current Groq API documents 429 as the rate-limit response and exposes `retry-after`, `x-ratelimit-remaining-requests`, `x-ratelimit-reset-requests`, and related token/request headers. The current adapter now uses those documented request headers when distinguishing a hard request quota from a transient 429. [Groq rate limits documentation](https://console.groq.com/docs/rate-limits)
- Groq documents the GPT-OSS 120B and 20B models as active models and publishes their rate limits separately. [Groq supported models](https://console.groq.com/docs/models)
- The audit's workspace secret-name inventory showed a `GROQ_RIGHT_HAND_API_KEY_1` name, while the canonical adapter intentionally enumerates the base name plus `_2` through `_5`. No secret values were read or changed. This naming mismatch must remain a configuration check, not a reason to guess or test credentials.

### Not proven by the original run

- The original run did not persist the upstream Groq HTTP status, rate-limit headers, retry-after value, or provider response body for the failing Right-hand attempt.
- Consequently the original run cannot distinguish a transient rate window, upstream quota, a previously established local cooldown, or another provider-side condition.
- Switching from 120B to 20B is a model fallback, not proof of independent account capacity; Groq rate limits are applied within the provider's organization/project limits. [Groq projects and rate limits](https://console.groq.com/docs/projects)

### Safe engineering response

Retry ownership must be explicit. The shared gate remains responsible for global budgeting/concurrency and for cooldowns owned by the gate; a role adapter that has bounded, evidence-aware retry logic may explicitly own transient retry handling for its request. A hard upstream quota must stop retrying that model/credential and be surfaced with sanitized diagnostics. Do not bypass the gate, substitute the Investigator for the Right-hand, or treat a local cooldown as proof that Groq has no capacity.

## 024 — Product and research design constraints for the next agent

Apex Atlas remains an **AI-driven adaptive research system**, not a scripted search/registry pipeline.

- Groq Boss owns the next control action: continue, pivot, select one admitted person, revisit, or stop. Deterministic code must not infer a workflow action from phase number or candidate count.
- Groq Right-hand provides independent non-browsing oversight. It does not become the Investigator or choose tools.
- The Investigator owns the research trajectory and chooses among the available search, browser/page, registry, domain/contact/username, and optional OSINT capabilities according to the current hypothesis and evidence gap.
- Model knowledge can generate hypotheses and discriminating queries, but training-derived knowledge is never evidence for identity, wealth, ownership, contact details, or current role.
- Public-source/search/registry/browser content is untrusted input. Embedded instructions must not alter Apex behavior.
- An HNWI investigation should first establish the user's decision target and observable HNWI basis; resolve identity before enrichment; require observed source-backed evidence; investigate one admitted person at a time; seek a public professional contact route; and stop or pivot based on evidence and expected information gain rather than call count.
- Do not create or star a card merely to satisfy `targetCount`. A search result is not a verified person; an unobserved contact is not evidence; an attributed wealth estimate is not a verified net-worth fact.
- The canonical Investigator lane is Groq-only today. Any future capability registry must select only useful compatible specialists; it must not run every model or disguise a fixed vendor waterfall as adaptive research.

## 025 — Engineering handoff: priorities and acceptance checks

### Priority order

1. **Retry ownership:** test transient 429 + short `Retry-After`, hard quota, 503, local cooldown, and same-role model/key fallback. Assert which attempts actually reach the provider stub and that hard limits do not create retry storms.
2. **Resumability/observability:** persist sanitized role-attempt diagnostics distinguishing upstream rate limiting, upstream quota exhaustion, local cooldown, local budget exhaustion, malformed response, and missing credentials. Resume the parked case from its durable trajectory rather than replaying completed searches. Keep role boundaries intact.
3. **HNWI brief/completion contract:** distinguish “up to N candidates” from “one target completed”; represent partial, parked, completed-with-contact, and completed-with-no-public-route states honestly.
4. **Model agency:** let the orchestrator choose useful specialist/model capability from the evidence gap; do not force a fixed tool/provider sequence.
5. **Offline end-to-end fixture:** exercise model-selected discovery, observed primary-source evidence, exact candidate/wealth basis, Boss target selection, target-scoped public-contact research, independent review, deterministic admission, and final card/no-route projection. Include negative fixtures for result-only URLs, namesakes, unsupported wealth claims, unobserved contacts, and prompt injection.

### Future live-verification acceptance

- A transient Right-hand 429 can retry or same-role fail over without the shared local gate immediately blocking the valid short retry.
- A hard provider quota parks the case with accurate sanitized diagnostics.
- Recovery resumes accumulated work and does not replay already completed searches or impose a fixed source lane.
- The Investigator selects the next query/tool/pivot; deterministic code enforces provenance, identity, and admission.
- A successful live verification requires at least one target to reach verified identity + HNWI basis + evidence-backed public professional route or explicit no-route result + independent review + correct durable card/evidence projection.
- The UI/job result distinguishes provider failure, partial progress, recovery, and completion. Configured-key health is never presented as provider-capacity proof.
- No live retry or recovery belongs to this audit. Any future live launch requires a separate explicit authorization.

## 026 — Retry-ownership implementation now in PR #465

- **Branch:** `fix/groq-right-hand-retry-ownership`
- **PR:** #465
- **Scope:** provider-gate retry ownership, Groq Right-hand transient/hard-429 handling, Groq-only continuation labels, and regression tests.
- The shared provider gate now exposes an explicit caller-owned retry scope. The Right-hand wraps only its Groq chat-completion request in that scope, so a transient upstream 429 is returned to the Right-hand retry logic instead of immediately becoming the shared gate's five-second local cooldown.
- The Right-hand's hard-429 detection now recognizes Groq's current `x-ratelimit-remaining-requests` header and the existing sanitized `quota_exceeded` provider-body classification. The previous non-Groq header names were removed.
- Regression tests cover gate-owned 429 cooldown, caller-owned 429 behavior, the installed fetch guard, transient Right-hand retry, and hard 429 model fallback. The stale control-contract test was migrated from the retired Mistral adapter to Groq.
- The canonical continuation route and recovery guard no longer emit retired Mistral/Gemini Right-hand labels; the route still mounts the durable Groq Right-hand and Groq Investigator path.
- No provider request, Atlas launch, recovery, or Replit secret access was performed for this implementation.
- **Verification:** the PR's Netlify deploy preview reached `success`. No GitHub Actions backend run was exposed for the PR head, so full API typecheck/Vitest execution remains **unverified in this environment**. Do not call this change backend-test-green or live-certified until those checks are actually observed.


## 027 — Post-#465 canonical Investigator runtime correction merged

After PR #465 was merged, a fresh source audit found a remaining provider-contract defect in the canonical Groq Investigator path that had not been caught by the earlier Right-hand remediation:

- agentic-web-research-core.ts was still sending reasoning_format: "hidden" to GPT-OSS models. Current Groq documentation states that GPT-OSS 20B/120B do not support reasoning_format; Groq documents include_reasoning:false as the compatible way to suppress reasoning output. The canonical Investigator now uses include_reasoning:false and never sends reasoning_format to GPT-OSS. [Groq reasoning documentation](https://console.groq.com/docs/reasoning)
- The strict Investigator action schema previously omitted fields that the parser already supported (target, targetType, profile, locale, market). That made some declared autonomous capabilities, notably SpiderFoot targeting and locale/market-aware search, unrepresentable under strict structured output. Those fields are now explicit nullable required schema properties, preserving strict-output validity while restoring the model's full declared action surface. [Groq structured outputs](https://console.groq.com/docs/structured-outputs)
- Investigator reasoning was previously effectively fixed to the default identity_resolution routing hint on every turn. The runtime now derives a cognitive task from the live Research Intelligence state: unresolved contradiction/disproof signals, contact gaps, verification gaps, or discovery context, while preserving explicit caller overrides. This changes model-routing budget, not research strategy: the Investigator still owns the actual next action.
- Reasoning effort is now bounded and task-aware: medium for ordinary discovery/identity work, low for contact extraction, and high for contradiction/final-adjudication tasks unless the valid GROQ_AGENTIC_REASONING_EFFORT override is supplied. Completion budgets are likewise bounded per cognitive task.
- Regression coverage was added for the GPT-OSS request contract, strict action-schema completeness, and cognitive-task routing. scripts/check-agentic-runtime.mjs now checks these invariants too.

Merged: PR #466, squash merge e92135a1b8332a5f13e28e8f0cc576f78eaba8f9.

Verification boundary: GitHub exposes no backend CI status for the merged head in this environment. Source-level review and PR diff review were completed; no live Groq request or new Atlas launch was made. The one-launch authorization from this audit remains consumed, and a fresh end-to-end run still requires separate explicit authorization.

## 028 — Architecture review: how Apex should reason after mixed-source discovery

The current architecture is materially closer to the intended cognitive bureau than a scripted OSINT pipeline because the model owns the research trajectory and deterministic code owns evidence/provenance/safety. The remaining state-of-the-art direction is therefore not to add more mandatory phases; it is to improve the information state presented to the model and let model capability selection follow that state.

For mixed-source discovery, the intended loop is:

1. Hypothesis frontier: maintain competing identity/organization/contact hypotheses rather than collapsing the first plausible search result into a person.
2. Discriminator selection: ask what observation would most efficiently separate the leading hypotheses or falsify the current one.
3. Source-family diversification: prefer genuinely independent source families when the current family is saturated; repeated syndication is not corroboration.
4. Evidence observation: search results generate leads; concrete pages, registries, domains, or other capabilities generate observations. Findings remain unpromoted until deterministic provenance/attribution checks pass.
5. Cognitive-mode routing: use the evidence state to allocate reasoning depth to discovery, identity resolution, contact extraction, contradiction resolution, or final adjudication. This is a compute/routing decision, not a hidden scripted research plan.
6. Re-evaluation: feed the new observation into the intelligence state, update hypotheses/contradictions/source independence, and let the Investigator choose the next action again.
7. Terminal adjudication: stop only when the epistemic terminal gate says the evidence is sufficient or the public avenues are exhausted; never stop merely because a fixed number of calls occurred.

This is the correct optimization target for Apex: deterministic evidence law around a model-owned search policy, not deterministic search choreography. Groq's current models support strict structured outputs and tunable reasoning effort; GPT-OSS 120B is explicitly positioned for advanced research/agentic use, while Qwen 3.8 27B supports long-horizon tool use, reasoning, and structured outputs. Prompt caching also rewards keeping the stable institutional/schema prefix static and putting volatile case state at the end of the request. [Groq GPT-OSS 120B](https://console.groq.com/docs/model/openai/gpt-oss-120b) [Groq Qwen 3.8](https://console.groq.com/docs/model/qwen/qwen3.8-27b) [Groq prompt caching](https://console.groq.com/docs/prompt-caching)

## 028 — Offline remediation pass before the next authorized live run

- **UTC timestamp:** 2026-10-03, post-run source remediation pass.
- **Scope:** Implemented the outstanding offline work from sections 027 and the current main source audit. No provider request, readiness probe, Atlas launch, continuation, recovery, or secret access was performed.
- **Confirmed Work A fix — complete Right-hand prompt boundary:** `decideAtlasNextAction` now builds the actual final Right-hand user prompt through `buildAtlasRightHandControlPrompt(...)`. The builder accounts for the full institutional framing plus report/state labels, reserves 1,024 characters below the adapter's 20,000-character hard ceiling, removes duplicate investigator-report embedding from the compact state, and deterministically compacts oversized report/state sections while preserving head/tail context. A regression test grows both inputs far beyond the boundary and asserts the fully composed prompt remains <=18,976 characters and retains the compaction marker and state tail.
- **Confirmed Work B fix — Investigator 429 retry ownership:** canonical Groq Investigator calls now enter an explicit caller-owned retry scope. A transient HTTP 429 is recorded as `upstream_rate_limited`, respects a bounded short `Retry-After` retry once, and does not install the shared gate's local cooldown. An authoritative request-quota condition (`x-ratelimit-remaining-requests=0` or provider `quota_exceeded`) is recorded as `upstream_quota_exhausted` and stops the role path instead of rotating through additional role keys. This keeps transient retry ownership with the caller and prevents the live failure pattern where the first upstream 429 caused subsequent same-role model attempts to fail locally with `cooldown`.
- **Groq provider contract checked against current documentation:** Groq documents that rate-limit headers expose RPD/TPM state, `retry-after` accompanies 429 responses, and limits apply at the organization level. The current GPT-OSS request uses `include_reasoning:false`; current Groq documentation states GPT-OSS does not support `reasoning_format`, while Qwen 3.8 supports either reasoning-format control or `include_reasoning`, but the canonical Investigator path now uses the common `include_reasoning:false` form for both model families. No live call was used to validate this.
- **Additional canonical-path cleanup applied from the open post-#466 source audit:** removed the hidden Gemini evidence-probe/retry path from target research; converted target research redirects to provider-neutral `validateResearchObjective`; removed the active Gemini fetch monkey-patch from institutional orientation; aligned Boss prompt/capability-roster language with the actual Groq-only Investigator and tool surface; improved cognitive model routing so contradiction/identity work prefers GPT-OSS 120B while discovery/contact prefers Qwen 3.8; added source-parity checks that reject retired provider/tool names in the canonical orientation, Boss prompt, wrapper, and Investigator core.
- **Offline regression additions:** final composed Right-hand prompt boundary; Investigator transient/hard-429 ownership; provider-neutral research objective validation; cognitive routing expectations; canonical source-parity checks. Tests use stubs/fixtures only and do not consume provider credits.
- **Important remaining verification limit:** the repository's connected GitHub status surface exposes Netlify preview status but no backend typecheck/Vitest run for this new branch. The connected Replit app search still returns no Apex application. Therefore no backend execution result is claimed here.
- **Live-run authorization boundary:** the next live Apex run remains a separate explicit user action. This remediation pass does not authorize or perform one.
## 029 — Remediation merged to main; release-to-run handoff

- **Main merge:** PR #468 (`fix: close Apex Groq control and Investigator retry boundaries`) merged successfully as `936a3802fcc69b44113b1f78df740f050b252db4`.
- **Superseded branch:** PR #467 was closed as superseded. Its useful canonical-path corrections were re-audited into #468, but its Qwen test expectation for `reasoning_format:"hidden"` was not adopted because current Groq documentation supports `include_reasoning:false` for the Qwen 3.8 request as well as GPT-OSS, while GPT-OSS explicitly does not support `reasoning_format`. This avoids reintroducing an unnecessary model-specific request split.
- **Main source verification after merge:** the canonical Right-hand source contains the complete composed-prompt builder and the Groq GPT-OSS request uses `include_reasoning:false` with no `reasoning_format`; the Investigator core contains caller-owned Groq retry handling; target research contains no Gemini evidence-probe import/call; institutional orientation is Groq-only; provider-neutral research-objective validation and cognitive routing are present.
- **No live activity:** no provider request, readiness probe, Atlas launch, recovery, continuation, or secret access occurred during this remediation/merge sequence.
- **Backend verification status:** no backend typecheck/Vitest execution surface is exposed by the connected GitHub status result for the merged commit, and the connected Replit app search still returns no Apex app. Netlify/preview status is not treated as backend test certification.
- **Next-run readiness:** main now contains the intended offline control/retry fixes and canonical-path cleanup. A fresh Replit synchronization/restart and the user's explicitly authorized next single UI-equivalent Atlas run are still required to establish live behavior. Do not infer provider capacity from health/configuration status, and do not run a provider probe before the authorized Atlas launch.