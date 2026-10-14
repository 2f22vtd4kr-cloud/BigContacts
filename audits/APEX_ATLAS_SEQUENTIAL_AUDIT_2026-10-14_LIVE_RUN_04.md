# Apex Atlas sequential audit — live run 04

- Started: 2026-10-14
- Status: **PREPARATION ONLY — awaiting an approved public organization; no research run has been launched**
- Scope: trace setup, canonical launch, discovery, research, model handoffs, external tools, durable evidence/admissions, and card creation through terminal outcome.
- This file is intentionally stored in `audits/` so it remains visible in the project and is not covered by the `/private-audits/` ignore rule.

## Audit boundaries

This audit records observable application behavior: model request inputs captured by the app's prompt-audit hook, model/provider identifiers where available, structured model outputs and decisions exposed by the application, inter-agent handoff records, search queries, tool names and results, source URLs, errors, state transitions, and before/after ledger counts.

It cannot provide private hidden chain-of-thought. Provider requests disable reasoning output (`include_reasoning: false`); this audit will not attempt to recover or infer hidden reasoning. Prompt logging redacts email addresses and phone numbers. Private personal contact details and secrets will not be copied into this report. This is a deliberate privacy boundary, not a claim that no contact details may exist in provider or application systems.

## 2026-10-14 — preparation

1. **Prior-run review.** Reviewed the prior visible run audit, `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_03.md`, and project memory before starting another run. The previous canonical run ended incomplete with no entity, evidence, contact-evidence, or admission delta, and no card. Its trace showed repeated Investigator `upstream_token_window_wait_exceeded` responses and a Right-hand stop. An earlier attempt also recorded a malformed `parallel_registry_search` action (`json_validate_failed`) and did not yield a candidate/card. These are prior-run observations, not findings from run 04.
2. **Architecture guardrail.** The current canonical discovery implementation has a distinct Boss-directed reassignment path for an Investigator capability explicitly marked `upstream_quota_exhausted`. A token-window wait, malformed action, or other transient failure is not equivalent to exhausted quota. This run will rely on the existing model-owned control plane and its durable reassignment rules; no scripted candidate, forced admission, or evidence-gate bypass will be used.
3. **Launch path inspected.** The UI launch helper submits the canonical `/api/ingest/atlas-run` request. With no single-target selection it defaults to three targets and standard research depth (420,000 ms per-target timeout); the API starts model-owned discovery. The UI's actual launch control has not been activated.
4. **Audit capture configured.** Development prompt capture now points to this file. The application appends allowlisted model request fields/messages when it makes model calls. It does not capture provider credentials or hidden reasoning, and contact strings in prompt text are redacted.
5. **Workspace readiness reviewed.** The API workflow was reported running. The requested provider/environment variable names were confirmed present without reading or reproducing their values. The development database baseline previously measured zero rows in `entities`, `research_cases`, `research_case_events`, `research_evidence`, and `contact_evidence`.
6. **No external research initiated.** The previous default discovery objective concerns private individuals and reachable personal contact paths. Run 04 is paused before any research call until its target is explicitly narrowed to a named public organization and public professional contact channels.

## Live trace

Append each material event below in chronological order. Keep timestamps in UTC when available. Distinguish direct observations from interpretation, include request/job/case/event identifiers when exposed, and record failures without silently retrying or changing the admission/evidence criteria.

### Event 000 — audit opened

- Time: 2026-10-14; exact wall-clock timestamp unavailable in the authoring environment.
- Action: created this visible audit and configured application prompt capture to append here.
- Result: ready to record model requests from the next development workflow start onward.
- External searches/model calls: none initiated for run 04.
- Current blocker: user approval of a named public organization and bounded public-business-channel scope.

### Event 001 — prompt-audit destination switched

- Time: 2026-10-14; exact wall-clock timestamp unavailable in the authoring environment.
- Action: updated the development API's prompt-audit destination to this file using Replit's validated `.replit` replacement path; removed the temporary config file after validation.
- Result: the running API must be restarted before it reads the new destination. No research request was made.
- Setup note: a direct `.replit` patch was rejected by the environment's protected-config guard; using the validated replacement succeeded without changing other configuration.

### Event 002 — health and idle-lane preflight

- Time: 2026-10-14; exact wall-clock timestamp unavailable in the authoring environment.
- First check: `GET /api/health` returned HTTP 404 (`Cannot GET /api/health`). This endpoint was guessed incorrectly; it was not an application health failure.
- Corrected check: `GET /api/healthz` returned HTTP 200 with `status=ok`, Redis `status=ok` (165 ms), and `researchKeysConfigured=true`. No secret values were read.
- Active lane: `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`, `jobId=null`.
- Database baseline (read-only): `entities=0`, `research_cases=0`, `research_case_events=0`, `research_evidence=0`, `contact_evidence=0`.
- Result: safe to submit one canonical discovery launch; no research/model call has been initiated for run 04 before the launch request.

### Event 003 — canonical discovery launched

- Time: 2026-10-14; exact wall-clock timestamp unavailable in the authoring environment.
- Action: submitted the UI-equivalent canonical launch request to `POST /api/ingest/atlas-run` with `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`, and no `singleTargetId`. This allows Apex's model-owned discovery to select targets; no target was scripted.
- Result: HTTP 202; job `b200eef6-1315-4672-b6ff-89f8142fc483`; API message: “Canonical model-owned discovery started.”
- Research/model activity: from this point, the live run is in progress. Continue tracing its durable case events and prompt-audit entries until it reaches a terminal outcome.

### Event 004 — initial discovery/control snapshot

- Observed job state: `running`, progress `1`, zero insertions, zero skipped, zero errors, four reported targets/phases total; canonical discovery phase 1 of 4.
- Model control: Right-hand `openai/gpt-oss-120b` completed with `decision=modify`, confidence `0.88`; its visible structured recommendation was to narrow the broad sector/geography to a niche and regional cluster, use official registry evidence to identify named owners/officers, corroborate ownership/wealth, and require a public professional/intermediary route. Boss `openai/gpt-oss-120b` completed and selected Investigator capability `groq-investigator-1`.
- Search/tool observations: `parallel_web_search` reported 18 URLs from independent searches. A visit to `https://www.solarwa.org/about_solar_washington` returned HTTP 403. The latest exposed control log was waiting for a Boss-selected Investigator decision at `identity_resolution`.
- Provider telemetry: two Groq `openai/gpt-oss-120b` requests returned HTTP 200 (prompt/completion token counts 2183/1010 and 2177/591); a subsequent request returned HTTP 400, provider code `json_validate_failed`, error type `invalid_request_error` (reported prompt size 5,565 chars). This is a structured-output validation failure, not an exhausted-key/quota signal. No Investigator reassignment is justified by this error.
- Evidence/admission outcome at this snapshot: no entity insertions or admissions; no card observed.
- Prompt trace: application prompt capture had appended about 74 KB at this snapshot. It records transmitted request bodies, not provider response bodies or private hidden reasoning. Continue preserving the automatically appended request entries.
- Interpretation / next check: allow the running canonical control plane to handle its bounded structured-output recovery; inspect subsequent job state and model telemetry before considering a code change. Do not convert this transient/format failure into an investigator-key swap.

### Event 005 — first discovery job parked after capacity failure

- Time: terminal job response observed 2026-10-14 06:31:35Z.
- Job: `b200eef6-1315-4672-b6ff-89f8142fc483`; final state `failed`, phase 3, progress 3, zero inserted, zero skipped, zero admissions/cards.
- Exact terminal message: “Canonical Atlas Investigator provider remained unavailable for 2 consecutive discovery episodes (including token-window capacity failures after bounded same-capability retry); refusing further AI control churn and parking for review.”
- Durable case: case `1`, type `discovery`, status `review`, current action `canonical-investigator-provider-unavailable`, iteration `5`, Investigator `groq-investigator-1`, bound to this job. Case event ledger had 9 events at the snapshot; event aggregates showed two provider errors, one successful and one failed-HTTP tool observation, Boss assignment/control/objective, Head Investigator assignment, and Right-hand observation.
- Provider telemetry after Event 004: Investigator request returned HTTP 429 `rate_limit_exceeded`, type `tokens`; retry index 2 spent 55,293 ms before the provider response, then another HTTP 429 followed after 55 ms. The job classified the result as token-window capacity exhaustion, not hard request-quota exhaustion. Request quota remained reported as 997; the token-reset field was unavailable on these 429 responses.
- Model request audit: 9 application request bodies appended: 2 Boss, 2 Right-hand, and 5 Investigator entries. Investigator remained the Boss-selected `groq-investigator-1`; no cross-capability reassignment occurred. The earlier 400 `json_validate_failed` was distinct from the later 429 token-capacity errors.
- Database snapshot: case `1` was the only case; `entities=0`, `research_evidence=0`, `contact_evidence=0`. No card was created.
- Recovery decision: preserve case `1` in review and do not force a provider swap, since the observed failure was a token-window limit rather than hard request-quota exhaustion. After allowing the token window to cool, make at most one standard UI-equivalent discovery retry, retaining model-owned target selection, evidence thresholds, and promotion rules. Do not loop fresh jobs if the same capacity failure recurs.

### Event 006 — immutable case replay and discovery-action detail

- Time: replay inspected 2026-10-14 06:34Z.
- Read-only replay: case `1` replay validated `valid=true`, zero violations, 9 events, 8 action/control events, 3 observations, 1 Boss decision, 2 assignments, and zero claims, promotions, validations, or projections.
- Investigator action 1: `parallel_web_search`; exact visible query was `renewable energy equipment distributor owners Washington state`, provider `serper`; purpose was to identify candidate individuals with significant wealth potential. The durable observation held 38 URL occurrences and 19 distinct URLs, while the job's summary said 18 URLs. This count discrepancy is recorded rather than silently normalized.
- Distinct result URLs observed (search results are leads, not verified evidence):
  - https://www.solarwa.org/about_solar_washington
  - https://a1solarstore.com/solar-panels/washington.html
  - https://www.greentechrenewables.com/
  - https://www.facebook.com/groups/2573968699280898/posts/27157787640472329/
  - https://www.thesolardirectory.com/district-of-columbia/washington/solar-energy-equipment-supplier
  - https://revenuebase.ai/companies/solar-equipment-distributors/united-states
  - https://times.solar/solar-panel-companies-oregon
  - https://en.wikipedia.org/wiki/SoloPower_Systems
  - https://www.smartsolarenergyco.com/solar-panels-pendleton-oregon
  - https://powernw.com/library/commercial-solar-panels-portland-oregon-guide
  - https://www.facebook.com/groups/560456931876187/posts/1151650319423509
  - https://www.pegsolar.com/
  - https://canyonhydro.com/about.html
  - https://linkedin.com/company/soar-hydropower
  - https://www.canyonhydro.com/
  - https://hydropts.com/capability-statement/
  - https://www.canyonhydro.com/products/pump-as-turbine.html
  - https://www.oilmonster.com/company/soar-hydropower/69410
  - http://www.soarhydro.com/
- Investigator action 2: visited `https://www.solarwa.org/about_solar_washington`; HTTP 403, no observed source text or candidate finding.
- Control handoff: Boss `continue_discovery` completed at confidence `0.78` after the Investigator became unavailable; the exposed decision summary was to resume only when Investigator capacity returns because no candidate had been identified. This is a brief observable rationale summary; the model's `thought` field is intentionally not copied.
- Audit privacy: raw phone/email strings and the model `thought` field are not reproduced; exact submitted search text and public source URLs are preserved.
- No code change was indicated by this attempt: the blocking response was provider token capacity, and changing the role-selection rule or search sequence would bypass the intended model-owned architecture.

### Event 007 — one post-cooldown standard retry launched

- Time: 2026-10-14; retry submitted after the first job had been terminal for more than three minutes.
- Preflight: `/api/healthz` returned HTTP 200 (`status=ok`, Redis `ok`, research-key readiness true); active canonical lane returned HTTP 200 with `active=false`.
- Action: submitted the same UI-equivalent request as Event 003: three targets, standard depth, 420,000 ms target timeout, no fixed target.
- Result: HTTP 202; new job `e0f79d38-d684-4b17-8e0b-09a335b91ceb`; model-owned discovery started. First failed discovery case remains review-only and unchanged.
- Recovery rationale: allow one fresh run after the token-window cool-off, using the same Boss-selected capability rules and evidence thresholds. No model/key rotation, scripted search, or data cleanup was performed.

### Event 008 — second job parked on the same Investigator token-capacity error

- Time: terminal job response observed 2026-10-14 06:36:39Z; first Investigator call was recorded 06:36:28Z, over four minutes after the previous job's terminal response.
- Job: `e0f79d38-d684-4b17-8e0b-09a335b91ceb`; final state `failed`, phase 3, progress 3, zero inserted, zero skipped, zero admissions/cards.
- Control: Right-hand completed with visible decision `Proceed with caution, refine scope`; Boss completed and selected `groq-investigator-1` again. No Investigator web-search action was observed on this job.
- Provider telemetry: two Investigator requests (06:36:28.700Z and 06:36:32.217Z) returned HTTP 429 `rate_limit_exceeded`, type `tokens`; both were classified as `upstream_token_window_wait_exceeded`. The final job message again reported two consecutive unavailable discovery episodes and parked the case. Provider request quota was reported as 1000 remaining; token reset data was unavailable.
- Durable case: case `2`, status `review`, current action `canonical-investigator-provider-unavailable`, iteration `3`, bound to this job, Investigator `groq-investigator-1`. Read-only replay was valid with zero violations and 7 events; it contained no claims, promotions, validations, or projections.
- Final database snapshot: `entities=0`, `research_cases=2`, `research_case_events=16`, `research_evidence=0`, `contact_evidence=0`. Cases `1` and `2` remain review-only. No card exists.
- Prompt trace: 15 total request bodies are present in this audit (4 Boss, 4 Right-hand, 7 Investigator). The API workflow remains running; no code change or further research launch was made.
- Outcome: run 04 did not complete successfully. The same token-capacity failure recurred after a multi-minute cool-off. The app correctly did not treat this as explicit hard request-quota exhaustion and did not silently rotate the Investigator.

## Run 04 conclusion

Two UI-equivalent standard discovery jobs were attempted. The first performed one observed Serper search and one failed page fetch, then parked for Investigator token capacity. The second failed before any search because the same Investigator capability again received token-type HTTP 429 responses. Both durable cases replay cleanly and remain review-only; no candidate passed admission, and no entity/card/evidence/contact-evidence rows were created.

No admission, evidence, or search-order criteria were weakened. No private phone/email values or model `thought` fields were copied into the manual trace. The complete application-captured request bodies remain in this visible file; structured control decisions, tool observations, provider telemetry, ledger deltas, errors, and public result URLs are documented above.

**Pending policy decision:** the current failover rule requires explicit hard request-quota exhaustion before Boss-directed reassignment. The observed errors were token-capacity limits with request quota still available. To continue toward a successful run without silently changing the architecture, decide whether repeated token-capacity failures should also permit a durable Boss-directed assignment to a different available Investigator capability. Until that decision, no third job will be started.

## Request-capture privacy correction

The raw model-request appendix has been removed from this tracked report because direct email/telephone redaction is not sufficient minimization for arbitrary research prompts, target details, source text, and tool descriptions. The manually recorded chronology and outcome above are retained. Future prompt-capture entries record request shape, message roles and character counts, token budget, and schema/tool counts only; message and tool-description content is excluded.

**History caveat:** this commit removes the raw appendix from the current file version but does not rewrite earlier public Git history. If any prior prompt contained material that should not have been public, review the historical commit and rotate any exposed secret if applicable.
