# Apex Atlas Sequential Run Audit — 2026-10-11

**Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-11.md`  
**Status:** `preflight — no launch submitted yet`  
**Clock:** Europe/Kyiv (EEST, UTC+03:00)  
**Source:** GitHub `main`, checkout `9d691ee02f252caa2c02e9ff2cbf31f7f7befc98` (shallow checkout)  
**Run scope:** One UI-equivalent canonical Apex Atlas launch, following discovery first. No provider calls have been made in this session as of entry 000.  
**Redaction policy:** Never record secret values, authorization headers, cookies, or provider credentials. Record exact public search queries, source URLs/IDs, tool/agent/provider decisions, sanitized errors, and durable row/job IDs. Capture application decision summaries and available prompt/request text where safe; do not record hidden model chain-of-thought. Restrict contact details to source-backed professional/public contact routes; redact private or personal contact details.

## Run contract

- The operator explicitly authorized one full live run, including external provider requests, durable research writes, and recovery/fixes needed to complete the intended flow.
- Use the repository's existing discovery-first flow and UI launch body, after verifying the current UI source and current readiness. Do not name a person or entity as a target, invent search steps, or manually manufacture evidence/cards.
- Keep the Investigator model-directed. A different configured Investigator capability may be selected only through the existing Boss-directed recovery path after a classified hard upstream request-quota exhaustion. Do not rotate on a transient rate limit, local budget/cooldown, prompt-size failure, malformed output, or guessed credential problem.
- Do not issue separate paid provider probes, launch duplicate jobs, overwrite prior evidence, or claim completion from a model summary alone.
- A full-run claim requires fresh durable ledger deltas, source observations, valid identity/admission, target-scoped research when the architecture selects it, evidence/contact provenance, required oversight, consistent card projection, and an honest terminal state.

## Sequential record

### 000 — Audit opened before launch

- **Local timestamp:** `2026-10-11 16:38:02 EEST` (`2026-10-11T13:38:02Z`).
- **Action:** Created this audit before any UI-equivalent launch or external research-provider call.
- **Status:** `preflight`.
- **Authorization:** User explicitly requested a full live launch and authorized external research and detailed operational auditing.
- **Next action:** Verify the current UI launch request, readiness and active-job state; take a read-only database baseline; run any remaining canonical offline gate; then submit exactly one launch.

### 001 — Import/setup state carried into this audit

- **Source identity:** Current branch is `main` at `9d691ee02f252caa2c02e9ff2cbf31f7f7befc98`; the checkout is shallow (`grafted`). `git status` was clean before this audit.
- **Import issue:** `rsync` was unavailable in the environment. The repository was copied using the available archive/tar path; the imported source tree and Git remote were then verified. No substitute app was generated.
- **Install/build:** `pnpm install --frozen-lockfile` passed. Root `pnpm run build` passed, including typecheck and workspace builds. The frontend emitted a non-blocking bundle-size advisory.
- **Database:** The development database was verified empty before the repository's explicit first-time initializer ran. Required schema and hardening migrations were applied; normal boot does not enable schema push.
- **Secrets:** Presence-only preflight confirmed the 13 requested secret names are configured. No values were read or written to this file.
- **Runtime:** Canonical `scripts/replit-boot.sh` workflow restarted successfully from the clean current revision. The home page returned HTTP 200; `/api/healthz` returned HTTP 200 with Redis `ok` and research-key configuration present. The UI rendered its ready state and an empty ledger.
- **Live-boundary:** These checks establish setup/runtime readiness only. No provider capacity has been inferred and no live research call had been made before this audit.

### 002 — Prior run findings reviewed; retry hazards recorded

- **2026-10-06 full-run investigation:** The prior UI-equivalent run made one Investigator structured-output request that received HTTP 400, a bounded compatibility retry that received HTTP 200, then an upstream Groq hard-quota failure. Four broad searches were dispatched; there were no visited pages, no candidate admissions, no durable evidence, and no cards. The job correctly failed closed.
- **Do not repeat:** Do not treat a configured key as capacity proof; do not retry a hard quota; do not count search snippets or summaries as evidence; do not submit another launch while a job is active; do not infer a candidate/card from an old ledger row.
- **Earlier 2026-10-03/04 failures:** An opening/continuation Right-hand rate-limit failure occurred on historical provider paths. Those audits predate the current Groq-only control plane; do not revive retired Mistral/Gemini lanes or diagnose the new runtime from the old `[object Object]` error.
- **Current recovery boundary:** Current source supports explicit, durable Groq Investigator reassignment only after classified upstream hard request-quota exhaustion, with the failed capability excluded and Groq Boss selecting a configured distinct capability. A second key is not presumed to be independent capacity merely because it has a different name.
- **Interpretation rule:** HTTP 413/request-size failure is not quota exhaustion; transient rate limiting/local cooldown is not proof of hard quota; stop and diagnose each from sanitized status/error/reset evidence. Never use an alternate model to conceal a malformed prompt or contract.
- **Evidence rule:** Snapshot pre-launch entity IDs and relevant ledger counts. Success is proven by fresh durable records and their provenance, not by dashboard counters or model-reported entity/contact totals.
- **Canonical path:** The current setup blueprint specifies a model-owned discovery-first objective; target-scoped research is allowed only after an exact, source-backed candidate is durably admitted and the canonical control plane selects it.

### 003 — Current launch path located

- **Local timestamp:** `2026-10-11 16:38:43 EEST` (`2026-10-11T13:38:43Z`).
- **Action:** Located the current desk button/client handler, canonical API launch route/defaults, and the provider-quota recovery implementation. No API request was sent.
- **Current UI files:** `artifacts/apex-finder/src/components/launch-atlas-button.tsx` and `artifacts/apex-finder/src/lib/launch-atlas.ts`.
- **Canonical endpoint:** `POST /api/ingest/atlas-run`, mounted by `artifacts/api-server/src/src/routes/atlas.ts` and handled by `artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts`.
- **Recovery path:** `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts` classifies hard upstream request-quota exhaustion, excludes the exhausted configured Investigator capability, asks Groq Boss to select a distinct configured capability, durably records the assignment, and continues the existing case. The audit will distinguish this from transient rate limits, local budgets/cooldowns, malformed output, and prompt-size failures.
- **Launch payload:** Exact current UI fields/defaults remain to be read and recorded before submission.
- **Next action:** Read only the relevant launch/default/status code, perform offline canonical preflight, and capture readiness plus the read-only ledger baseline.

### 004 — Exact UI-equivalent request contract verified

- **Local timestamp:** `2026-10-11 16:39:08 EEST` (`2026-10-11T13:39:08Z`).
- **Action:** Read the current launch button, client request helper, server route, and canonical defaults. This was source inspection only; no launch request was sent.
- **UI behavior:** The visible “Launch Apex Atlas” button first makes an advisory `GET /api/healthz`, then calls the launch helper. The current preview is the real desk at `/`, not a `?mock=1` URL.
- **Exact default UI body:** `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. The UI does not supply `singleTargetId`; the backend canonical launch path therefore starts model-owned discovery. Canonical defaults also mark this as discovery-first and research-enabled; discovery/admission—not a requested-person ID—decides whether downstream target work is justified.
- **Single-launch safety:** The handler checks the authoritative distributed `atlas-run` lock and returns `409` for a nonterminal active job; the client explicitly must not retry or supersede it.
- **Audit logging plan:** Record the advisory health result, pre-launch `bureauIntegrity`/Redis/Postgres/configuration snapshot, active-job result, exact read-only baseline, then one POST response/job ID. Poll and reconcile only that job unless the canonical in-job Boss-directed quota recovery is invoked by its own explicit hard-quota predicate.
- **Next action:** Run the required offline phone/source-priority tests, check non-probing runtime status and active-job state, and take a read-only database baseline before the single launch.

### 005 — Offline gate, readiness and pre-launch ledger baseline

- **Local timestamp:** `2026-10-11 16:40:10 EEST` (`2026-10-11T13:40:10Z`).
- **Offline gate:** `pnpm run test:phone-priority` passed: 6 test files, 44 tests, 0 failures. No provider calls were made by this suite.
- **`GET /api/healthz`:** HTTP 200; API `ok`; Redis `ok` (cached response); research-key configuration present. This is configuration/readiness evidence, not provider-capacity proof.
- **`GET /api/system/status`:** HTTP 200; bureau integrity `ok`; Postgres `ok`; local Redis `ready`; configured Upstash slot `ready`; Boss and Right-hand are configured as Groq roles; configured search lanes are present. No live provider probe was made.
- **Investigator pool observation requiring source interpretation:** status lists base Investigator slot and `_1` as `active`, but reports `agenticLlmSlots=1`. No credential values were inspected. Before launch, verify from code what this count means and whether a distinct-capability fallback is available; do not assume the two names represent independent credentials.
- **Active job:** `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`, `jobId=null`.
- **Read-only baseline:** `entities=0`; `research_cases=0`; `research_case_events=0`; `research_sessions=0`; `research_run_events=0`; `research_evidence=0`; `contact_evidence=0`. Baseline entity IDs: none. All resulting rows/cards, if any, must be new.
- **Decision:** Do not submit the launch yet. Resolve the `agenticLlmSlots=1` interpretation without reading any secret values, then append the resulting readiness decision before the one launch.

### 006 — Investigator-slot status interpretation and safe recovery boundary

- **Local timestamp:** `2026-10-11 16:41:05 EEST` (`2026-10-11T13:41:05Z`).
- **Action:** Read the lane-status implementation, capability registry, and its quota-identity regression test. No secret values or provider responses were read.
- **Finding:** `agenticLlmSlots=1` is a boolean “at least one Investigator lane exists” indicator, not a count of independent keys. `groqInvestigator=2` and the system-status inventory show two configured named Investigator slots (base and `_1`).
- **Recovery safety:** The registry fingerprints credentials internally and treats aliases of the same credential as one quota pool; a different capability is available only when the configured credential is distinct. Raw values are not emitted. The existing recovery asks Groq Boss to select only from the distinct available capabilities after an explicit hard upstream request-quota classification. If there is no distinct alternate, the canonical path must fail closed; it must not borrow Boss/Right-hand/HF credentials or add an unapproved vendor lane.
- **Decision:** The earlier status concern was a misleading field name/count interpretation, not a readiness failure. The configured slots and canonical recovery guard are present. Proceed with the one launch; any quota recovery will be decided by the existing runtime guard, not by this operator audit.
- **Next action:** Run the focused offline quota-identity test, then record its result and submit the one exact UI-equivalent request if the test passes.

### 007 — Final offline recovery gate passed; launch authorized

- **Local timestamp:** `2026-10-11 16:41:41 EEST` (`2026-10-11T13:41:41Z`).
- **Focused test:** `pnpm --dir artifacts/api-server exec vitest run src/src/test/investigator-capability-quota-identity.test.ts` passed: 1 file, 4 tests, 0 failures. The fixture confirms same-credential aliases are excluded together and only a distinct credential is eligible for hard-quota recovery.
- **Readiness disposition:** Root typecheck/build and API architecture guards passed before this audit; the required phone/source-priority suite passed 44/44; the focused quota-identity suite passed 4/4; bureau integrity, PostgreSQL, and Redis are healthy; there is no active Atlas job; the baseline ledger is empty. This qualifies for the user's explicitly authorized live run.
- **No preflight provider probes:** No Boss, Right-hand, Investigator, search, or page-visit provider call has been made. The first such call will belong to the requested launch.
- **Launch to submit next:** One `POST /api/ingest/atlas-run` with the exact UI body `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`; no `singleTargetId`; no mock mode. Record HTTP status, job ID and poll URL immediately; do not submit a second launch.

### 008 — Canonical UI-equivalent launch accepted

- **Local timestamp:** `2026-10-11 16:41:56 EEST` (`2026-10-11T13:41:56Z`).
- **Action:** Submitted exactly one `POST /api/ingest/atlas-run`; no additional query parameters or target were supplied.
- **Exact body:** `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- **Response:** HTTP `202 Accepted`; message: `Canonical model-owned discovery started`.
- **Job ID:** `5d93609d-d324-49c5-944d-b0dc4a66b1fa`.
- **Poll URL:** `/api/ingest/job/5d93609d-d324-49c5-944d-b0dc4a66b1fa`.
- **Accepted options:** `targetCount=3`; `singleTargetId=null`; `researchDepth=standard`; `targetTimeoutMs=420000`.
- **Interpretation:** This proves launch acceptance only. No discovery/research/evidence/card completion is yet claimed.
- **Next action:** Observe only this job; capture its durable control events and actual selected providers before assessing progress.

### 009 — Opening oversight and first Investigator actions observed

- **Observation time:** `2026-10-11 16:42:18 EEST` (`2026-10-11T13:42:18Z`).
- **Job poll:** HTTP 200; job `5d93609d-d324-49c5-944d-b0dc4a66b1fa` is `running`, phase `1/4`, progress `1/4`, `inserted=0`, `skipped=0`, `errors=0`. The active message names `GROQ-INVESTIGATOR-1`; discovery case ID `1` is present.
- **Opening oversight:** Job result reports Groq Right-hand `openai/gpt-oss-120b`, `completed`, decision `refine` (confidence `0.88`). Its returned decision summary says the opening Boss direction lacked a concrete company, jurisdiction, or filing anchor and recommends anchor identification/source specificity. Groq Boss `openai/gpt-oss-120b` completed and selected `groq-investigator-1`.
- **Investigator/provider attempts from workflow telemetry:** Three Groq `openai/gpt-oss-120b` attempts are visible so far. Attempt 1 returned HTTP 200: prompt envelope 7,199 chars (system 1,472 + user 5,727), 2,107 prompt + 610 completion = 2,717 tokens, 1.647 s; rate-limit headers reported 5,587 tokens and 999 requests remaining. Attempt 2 returned HTTP 400 `invalid_request_error` / `json_validate_failed`; token counts were absent. Attempt 3, the bounded same-model compatibility retry, returned HTTP 200: 7,200 chars, 1,623 prompt + 621 completion = 2,244 tokens, 1.700 s; headers reported 1,293 tokens and 997 requests remaining, with a token-window reset in about 50.3 s. The 400 is not a hard quota, and the retry stayed on the same role/model as designed.
- **Search actions observed:** Serper returned 6 URLs for each of two model-selected queries:
  1. `public beneficial ownership registry United States`
  2. `FinCEN Beneficial Ownership Registry example named individual`
- **Interpretation:** The two queries use a concrete registry/agency anchor and are Investigator-selected; they are not a fixed operator-authored itinerary. Search-result URLs remain leads, not evidence. No page visit, named candidate admission, durable entity, evidence row, or card has yet been observed. Because remaining-token headers are near the next request's observed token consumption with a short reset, distinguish any upcoming token-window 429 from hard request-quota exhaustion; do not force a credential/model switch.
- **Prompt audit limitation:** Runtime telemetry currently exposes exact prompt-size/token metrics and sanitized provider classifications, not complete transmitted prompt bodies or raw HTTP bodies. Do not enable credential-bearing request logging mid-run. Preserve exact objective, search strings, app decision summaries, source observations and durable events; record any missing raw-prompt fields as an observability gap rather than inventing them.
- **Next action:** Read the immutable discovery case events for case `1` to capture the full tool observations/source URLs while they are fresh, then continue observing this same job.

### 010 — Durable discovery trajectory reconciled through Investigator turn 5

- **Observation time:** `2026-10-11 16:43:19 EEST` (`2026-10-11T13:43:19Z`).
- **Sources:** Read-only `research_case_events` rows `1–8` for discovery case `1`; one poll of the same job endpoint. Job remains `running`, phase `1/4`, progress `1/4`; no job errors, insertions, admissions, or evidence.
- **Run/case binding:** `jobId=5d93609d-d324-49c5-944d-b0dc4a66b1fa`; `caseId=1`; `runId=df220dbc-1c2e-453f-b3d6-58ea5910dd07`; selected capability `groq-investigator-1`.
- **Control events:** Event 1: Groq Boss assignment using `openai/gpt-oss-120b`; the returned report proposed filing/registry anchoring and explicitly recorded that no target had been supplied. Event 2: Groq Right-hand `refine` review; event 3 mounted the Investigator. These are persisted immutable case events.
- **Exact model-selected searches and purpose fields:**
  1. `public beneficial ownership registry United States` — hypothesis: public registries may provide relevant people; purpose: locate authoritative beneficial-owner sources; expected information gain `0.6`.
  2. `FinCEN Beneficial Ownership Registry example named individual` — hypothesis: a public FinCEN page may name an owner and role; purpose: find a concrete person from an authoritative source; expected information gain `0.7`.
  3. `FinCEN BOI FAQ example named individual` — hypothesis: the FAQ may contain a named individual and role; purpose: identify a person from that page; expected information gain `0.8`.
- **Raw search-result URLs preserved in the durable observations:**
  - Search 1: `https://www.fincen.gov/boi`; `https://home.treasury.gov/news/press-releases/jy2015`; `https://www.peapackprivate.com/beneficial-ownership-information-registry`; `https://www.carverstatebank.com/beneficial-ownership-information/`; `https://www.opengovpartnership.org/open-gov-guide/anti-corruption-company-beneficial-ownership/`; `https://www.irs.gov/businesses/report-beneficial-owner-information`.
  - Search 2: `https://www.fincen.gov/boi-faqs`; `https://www.fincen.gov/news/news-releases/us-beneficial-ownership-information-registry-now-accepting-reports`; `https://www.fincen.gov/beneficial-ownership-information-reporting-rule-fact-sheet`; `https://www.orrick.com/en/tech-studio/resources/faq/what-information-must-be-included-in-a-FinCEN-beneficial-ownership-report-about`; `https://www.fincen.gov/boi`; `https://home.treasury.gov/news/press-releases/sb0603`.
  - Search 3: `https://www.fincen.gov/boi-faqs`; `https://www.fincen.gov/boi`; `https://www.orrick.com/en/tech-studio/resources/faq/what-information-must-be-included-in-a-FinCEN-beneficial-ownership-report-about`; `https://www.maddinhauser.com/fincen-updates-frequently-asked-questions-on-beneficial-ownership-information/`; `https://www.fincen.gov/system/files/2026-08/QAs_BOIFinalRule.pdf`; `https://www.millerchevalier.com/publication/six-considerations-companies-fincens-beneficial-ownership-rule-goes-live`.
- **Page visits:** Turn 3 and turn 5 both successfully visited the same `https://www.fincen.gov/boi-faqs` page. The fetched official FAQ states that FinCEN issued a final rule on 2026-08-11; U.S. companies are exempt from BOI reporting under that rule and only certain foreign companies registered in the U.S. must report. The page warns that older BOI guidance on the site may be outdated. No named target or individual contact was present in the observed excerpt.
- **Action quality observation:** The Investigator revisited the same FAQ and repeated a same-purpose query after the official page did not establish the hypothesized named person. The action log records no candidate finding. This is currently a model-selected low-information loop, not a deterministic-runtime failure; wait for the Investigator/Boss to pivot and do not inject a scripted search path.
- **Privacy/grounding:** The page exposed FinCEN organization social URLs, not person-attributed contact facts. They are not treated as candidate contact details. No private personal contact details were copied into this audit. Free-form internal `thought` strings from the event payload are intentionally omitted; structured query, hypothesis, purpose, expected-information-gain, execution, observation and provenance are retained.
- **Next action:** Continue observing this same run and record the next actual control decision, provider attempts, tool output and durable state. Search leads alone remain non-evidence.

### 011 — Boss requested a pivot; Investigator remained on the same source family

- **Observation time:** `2026-10-11 16:44:13 EEST` (`2026-10-11T13:44:13Z`).
- **Job state:** Still `running`, phase `1/4`, progress `1/4`, no errors or admissions. Durable case events `9–12` are now present.
- **New Investigator actions:**
  - Turn 6 query: `FinCEN BOI FAQ contact person name` (Serper, 6 URLs).
  - Turn 7 revisited `https://www.fincen.gov/boi-faqs` (success).
  - Turn 8 query: `FinCEN BOI contact name` (Serper, 6 URLs).
  - Turn 8 URLs: `https://www.fincen.gov/contact`; `https://www.fincen.gov/`; `https://www.fincen.gov/boi`; `https://www.facebook.com/fincentreasury/videos/five-minute-demo-how-to-file-a-boi-report/546883974682845/`; `https://www.fincen.gov/boi-faqs`; `https://www.regulations.gov/document/FINCEN-2023-0012-0001`.
- **Boss control decision:** Event 10 is a completed `pivot_discovery`; its decision summary says no candidates were admitted, generic FinCEN FAQ searches were exhausted, and a concrete filing with named owners is needed. The following Investigator actions still visited the same FAQ and queried FinCEN contact names; neither action produced a finding.
- **Provider telemetry since the prior observation:** Six more Groq `openai/gpt-oss-120b` calls completed HTTP 200. Prompt envelopes remained ~7,199–7,200 chars; successful calls consumed 2,611–2,752 total tokens each. Two calls had high latency (~50.5 s and ~56.9 s) but eventually succeeded. Remaining-request headers decreased from 996 to 991; token-window reset headers advanced/reset. No upstream 429, hard request-quota signal, or Investigator reassignment occurred. These calls do not justify switching capabilities.
- **Issue:** The Boss explicitly requested a pivot, but the Investigator continued the same FinCEN source family. This is a research-strategy quality problem, not a provider or deterministic-admission failure. Do not impose an operator-authored query/source sequence; observe the existing Boss/Investigator loop and preserve the honest no-admission state.
- **Evidence boundary:** Case events retain the full tool observations and returned source snippets. This audit records exact queries and URL lists; it omits the free-form model `thought` field and any private contact details.
- **Next action:** Observe the next durable control decision and trajectory on this same job. If the canonical run reaches an explicit terminal boundary, reconcile its job/case/evidence/card deltas before deciding on any source fix or further attempt.

### 012 — First live run failed closed during Investigator continuation

- **Observed at:** `2026-10-11 16:45:08 EEST` (`2026-10-11T13:45:08Z`).
- **Terminal job record:** Job `5d93609d-d324-49c5-944d-b0dc4a66b1fa` is `failed`, `outcome=incomplete`, `progress=3/4`, `atlasPhase=3/4`, `inserted=0`, `errors=0`; start `13:41:57.226Z`, finish `13:44:59.882Z`.
- **Sanitized failure:** `Canonical Investigator continuation stopped before a usable new research pass; case preserved for review.` Reported `failureDomain=unexpected_programming_error`, `failureKind=unexpected_exception`, `stopReason=PARSE_FAILURE`, `iterations=4`, `trajectoryRecordCount=3`, message digest `aab85f2e98dd7e0e`. The raw exception is not yet known.
- **Last live tool event:** `parallel_web_search` succeeded at `13:44:58.758Z`, returning 10 URLs from independent searches. This event occurred immediately before the job terminated; its exact query/source record still needs reconciliation from durable events.
- **State at break:** Discovery reported 4 searches, 2 visits, 0 findings, `caseId=1`; Boss's last control action was `pivot_discovery` with no final candidate. No quota error was reported. Do not trigger Investigator reassignment for this failure.
- **Interpretation:** This is a real programming/parse-boundary failure, not successful research, not evidence admission, and not a reason to retry the same request blindly. The run failed closed and preserved the case as designed. The requested full run is not complete.
- **Next action:** Preserve the failed job/case; inspect new immutable events and workflow diagnostics to identify the exception; reconcile database/active-lock state; then make the smallest architecture-preserving fix and add a focused regression before any new live launch or recovery attempt.

### 013 — Terminal action, active lock and durable ledger reconciled

- **Reconciliation time:** `2026-10-11 16:45:37 EEST` (`2026-10-11T13:45:37Z`).
- **New immutable events:** Event 13 records successful Investigator turn 9 `parallel_web_search`; event 14 records the failed continuation and the same sanitized error classification/digest.
- **Turn 9 returned URLs:** `https://www.fincen.gov/contact`; `https://www.fincen.gov/`; `https://www.fincen.gov/boi`; `https://www.facebook.com/fincentreasury/videos/five-minute-demo-how-to-file-a-boi-report/546883974682845/`; `https://www.fincen.gov/boi-faqs`; `https://www.regulations.gov/document/FINCEN-2023-0012-0001`; `https://www.fincen.gov/news/news-releases/fincen-permanently-ends-beneficial-ownership-reporting-requirements-millions`; `https://www.irs.gov/businesses/report-beneficial-owner-information`; `https://www.mcdermottlaw.com/insights/fincen-narrows-beneficial-ownership-information-reporting-requirements/`; `https://sos.ga.gov/page/fincen-beneficial-ownership-information`.
- **Provider at failure boundary:** Last observed Groq `openai/gpt-oss-120b` request returned HTTP 200, 2,212 prompt + 688 completion = 2,900 tokens, latency 40.987 s; rate-limit headers showed 5,253 tokens and 990 requests remaining. This is not an upstream quota failure.
- **Active lock:** `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`, `jobId=null`; the canonical release completed. No second run is in flight.
- **Post-run durable counts:** `entities=0`; `research_cases=1`; `research_case_events=14`; `research_sessions=0`; `research_run_events=0`; `research_evidence=0`; `contact_evidence=0`. No card was created or starred.
- **Telemetry discrepancy:** The terminal job summary reports `searches=4, visits=2`; immutable event rows show five `web_search` actions, one `parallel_web_search` action, and three `visit` actions across two Investigator run IDs. Do not use the summary counters as a complete trajectory count; investigate the aggregation boundary offline.
- **No invented result:** Zero cards/evidence is the honest outcome for this failed run. Preserve case `1` and its 14 append-only events; do not delete or mark it complete.
- **Next action:** Inspect the exact case terminal state, the complete sanitized workflow diagnostics, and source paths that map unexpected continuation exceptions to `PARSE_FAILURE`; reproduce offline before editing.

### 014 — Exact final search batch and case objective captured

- **Observation time:** `2026-10-11 16:45:37 EEST` (`2026-10-11T13:45:37Z`).
- **Persisted case state:** Case `1` is `discovery`, status `review`, current action `canonical-investigator-episode-failed`, iteration `9`; `target_entity_id` is null.
- **Exact case objective:** “Discover real named people for subsequent target-scoped public-contact research. Start from a concrete business or operating context and a plausible geography, sector, company ecosystem, transaction, registry, filing, trade publication, official company surface, or other evidence-bearing anchor selected from the live case objective. Avoid defaulting to celebrities, billionaire/richest-person lists, generic wealth searches, or context-free famous names. Write each search from the current hypothesis and observed evidence, pivot when results are generic or repetitive, and choose every search, page visit, registry/domain/OSINT action and stopping point yourself. Emit a person only when you can attribute the observed source to that person; use promotionDecision=promote only for an exact named-person admission candidate. Never invent a person, contact, or URL.”
- **Turn 9’s exact parallel batch:** (a) `FinCEN BOI contact name`, purpose `Find a named contact for FinCEN BOI inquiries`; (b) `FinCEN Beneficial Ownership Information point of contact`, purpose `Find a named contact for FinCEN BOI inquiries`. The shared hypothesis was that a FinCEN page or press release lists a named BOI contact; expected information gain `0.8`. Both Serper requests succeeded and returned 10 combined URLs, but `findings=[]`.
- **Objective/trajectory mismatch:** The objective requires pivoting away from generic/repetitive results, while this final batch again searched only FinCEN contact/BOI terms and returned overlapping FinCEN/IRS/regulatory sources. No person or card was admitted.
- **Metric interpretation:** The terminal `discovery.searches=4, visits=2` summary is not an event count. Case event rows `4,5,7,9,12,13` contain five single-search actions plus one two-query parallel-search action; rows `6,8,11` contain three successful visits. Preserve both values and treat append-only action rows as authoritative.
- **Diagnostic observability gap:** The durable error event contains a class, null code, failure category and digest, but not the underlying exception message/stack or model response. The provider log confirms HTTP 200 and does not explain the subsequent `PARSE_FAILURE`. No raw prompt or model `thought` text is available in the normal logs.
- **Next action:** Trace the callback and parse-error boundaries using source/tests and the stored structured trajectory; add only safe, bounded diagnostics if needed. Do not attempt to reconstruct or fabricate a missing raw response.

### 015 — Source trace: parse classification is overloaded; Boss pivot was infeasible

- **Inspection time:** `2026-10-11 16:50:18 EEST` (`2026-10-11T13:50:18Z`).
- **Exact Boss direction (event 10):** “Shift focus to identifying a specific US entity that has submitted a FinCEN BOI report and examine its filing for named beneficial owners.”
- **Source feasibility:** This instruction conflicts with the already observed FinCEN FAQ dated 2026-08-11, which says U.S. companies are exempt under the then-current rule; those reports are not established by the public page as openly searchable evidence. It was unsafe to assume a public filing/person source existed. Subsequent Investigator actions instead returned to FinCEN FAQs/contact pages; no finding followed.
- **Direction plumbing:** Source inspection confirms the Boss direction is validated against tool/provider/URL prescriptions and is passed through the bounded objective builder as a scope constraint, not a fixed tool sequence. The failed direction was not dropped by that formatter.
- **Failure-boundary finding:** The core’s broad catch maps any non-abort exception inside an Investigator turn to `status=error, stopReason=PARSE_FAILURE`, even when no `parse_failure` trajectory record exists. Event 14 indeed contains no parse action. The outer canonical failure handler then stores only a second-level digest, making the root exception unrecoverable from this run’s durable records. The current evidence does not identify the exact thrown exception or its line; do not claim a parser bug as proven.
- **Timing clue (not proven root cause):** Event 13’s successful parallel search was persisted at `13:44:58.758Z`; the run failed at `13:44:59.882Z`, with no later provider attempt in telemetry. This points to a local continuation/action-boundary problem after the successful search rather than Investigator quota, but the available logs do not identify which local step threw.
- **Bounded-parse edge:** Discovery is wrapped as one core iteration per dynamic act. The consecutive-parse counter is local to that one-iteration core call, so it cannot reach its intended multi-response threshold across acts. This defect is confirmed by call structure; this particular failure did not persist a parse-failure record, so it is not asserted to be the triggering cause.
- **Counter source:** The failed continuation returns before it is merged into the cumulative discovery result; the failure summary therefore reports the prior episode’s counters. The append-only events are the complete trajectory and expose the counter undercount.
- **Change decision:** Before any live retry, correct the generic-exception classification and add privacy-safe stage diagnostics, preserve bounded consecutive-parse handling across dynamic acts, and include the failed continuation in summary accounting. Add a regression around the exact wrapper boundaries. Separately, preserve an evidence-feasibility check for Boss directions; do not replace autonomous source choice with a scripted query plan.

### 016 — Audit resumed; requested upstream revision fetched; pre-pull

- **Local timestamp:** `2026-10-11 18:12:11 EEST` (`2026-10-11T15:12:11Z`).
- **Active audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-11.md` (this file). It already contains the earlier failed live run, exact searches and URLs, immutable case-event reconciliation, provider telemetry, and the prior agent's failure analysis. Continue this file; do not overwrite it or rerun job `5d93609d-d324-49c5-944d-b0dc4a66b1fa`.
- **User authorization:** The user now explicitly requested a fresh pull, another UI-equivalent run, step-by-step auditing, diagnosis and architecture-preserving fixes through a complete honest run. No new launch or provider request has been issued in this continuation.
- **Repository before pull:** Local `main` was `5e45ecc4`; `git fetch origin main` advanced `origin/main` to the requested `34adfa85e182104f3d34c2ed7e3305f17c475e7c` (merge PR #663). Upstream changes include the Investigator wrapper, runtime correctness tests, Groq Investigator tests, and the grounded-intelligence source guard. The worktree still has the Replit artifact title adjustment and the previous session's local source-guard adjustment; preserve the artifact registration, but prefer the new upstream guard over the local one after fast-forward.
- **Setup issue added to the record:** In the initial blank-project import, `rsync` was unavailable. A broad cleanup command then encountered protected `.conversation` after removing starter-project files/artifact folders; the source repository remained intact in `/tmp/BigContacts-import`, and the original Replit artifact metadata had been backed up and restored before importing the repository. Do not repeat broad root cleanup; retain `.local` and platform-managed paths.
- **Runtime baseline:** The canonical API workflow was running at the end of the import/build session. The last verified `/api/healthz` response was HTTP 200 with Redis `ok`, database ready, and research-key configuration present. This does not establish current post-pull readiness or upstream provider capacity.
- **Audit boundary:** Record exact observed search strings, source URLs, durable IDs, provider/model/status/latency and sanitized error details; include public, source-backed professional contact routes if any are actually observed. Never record credential values, authorization headers or cookies, private personal contact details, or hidden model/agent chain-of-thought. Log concise decision summaries and transmitted app/provider payloads only when actually observable; mark unavailable raw prompt/response fields as an observability gap rather than reconstructing them.
- **Next action:** Preserve the local Replit artifact title, fast-forward `main` to the requested commit, inspect the upstream runtime fix/tests and current run state, then append fresh readiness and ledger baselines before deciding whether one new launch is safe.

### 017 — Current pre-pull runtime and database baseline

- **Local timestamp:** `2026-10-11 18:13:00 EEST` (`2026-10-11T15:13:00Z`).
- **`GET /api/healthz`:** HTTP 200; API `ok`; Redis `ok` (cached); research-key configuration present. This remains configuration health, not proof of live provider capacity.
- **`GET /api/system/status`:** HTTP 200; Postgres `ok`; local Redis `ready`; configured Upstash slot `ready`; Groq Boss and Groq Right-hand are configured; Investigator slots 0 and 1 report `active`; Tavily, Exa, Serper and Companies House report configured. No credentials were read and no live provider probe was made. `openResearch` reports unavailable/Hugging Face unconfigured; whether this is an optional lane will be checked against the post-pull canonical capability registry. A legacy lane summary also reports `geminiRightHand=1`; do not interpret that summary as overriding the explicit Groq Right-hand role without source confirmation.
- **Active job:** `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`, `jobId=null`.
- **Current development DB baseline (read-only after schema setup):** `entities=0`; `research_cases=0`; `research_case_events=0`; `research_sessions=0`; `research_run_events=0`; `research_evidence=0`; `contact_evidence=0`.
- **Historical-run reconciliation:** The prior audit's job/case `5d93609d-d324-49c5-944d-b0dc4a66b1fa` / case `1` is not present in this freshly imported project's development database. Keep entries 008–015 as history from the earlier audited runtime; do not count them as current-project rows or use them as proof of this run.
- **No new launch:** No launch POST or provider research request has been submitted in this continuation. Preserve the empty ledger as the baseline for the current project's first live run.
- **Next action:** Fast-forward to `34adfa85e182104f3d34c2ed7e3305f17c475e7c`; then inspect its failure-stage fix, quota-recovery contract, and tests before any launch.

### 018 — Fast-forward and offline verification of the requested revision

- **Local timestamp:** `2026-10-11 18:15:12 EEST` (`2026-10-11T15:15:12Z`).
- **Pull:** `git pull --ff-only origin main` fast-forwarded `main` from `5e45ecc4` to exactly `34adfa85e182104f3d34c2ed7e3305f17c475e7c`. The Replit artifact title change and this audit were preserved. The obsolete local source-guard edit was stashed, not reapplied; the upstream guard is now authoritative.
- **Upstream behavior change:** The dynamic discovery and target wrappers now label post-action result aggregation and terminal validation separately (`result_aggregation`, `terminal_validation`). The strengthened source guard requires the durable action callback to finish before structured-intelligence projection. A new offline test checks that a synthetic trajectory-persistence exception is returned as a sanitized `UNEXPECTED_ERROR` runtime record.
- **Static check:** `node scripts/check-canonical-target-per-act-control.mjs` passed, including the strengthened persistence-before-projection invariant.
- **Focused offline tests:** `pnpm --dir artifacts/api-server exec vitest run src/src/test/groq-investigator.test.ts src/src/test/discovery-runtime-correctness.test.ts --reporter=dot` passed: 2 files, 55 tests. Provider responses in this suite are mocked; this did not contact Groq or search services.
- **Typecheck:** `pnpm run typecheck` passed for the workspace libraries, API, mockup, and scripts.
- **Root-cause limit:** The commit improves exception-stage localization and regression coverage; it does not prove that the prior post-search failure is fixed. The specific historical exception digest cannot be reconstructed. A new live launch remains contingent on fresh build/startup and offline readiness gates.
- **Next action:** Restart the canonical API workflow on this revision, inspect its full build/startup logs, rerun the offline phone-priority and quota-identity checks, then verify current UI request defaults, active-job state, and ledger baseline before any single new launch.

### 019 — Post-pull canonical runtime and UI launch contract verified

- **Local timestamp:** `2026-10-11 18:15:48 EEST` (`2026-10-11T15:15:48Z`).
- **Workflow:** Restarted `artifacts/api-server: API Server` on `34adfa85`; canonical `scripts/replit-boot.sh` ran the frontend/API builds and architecture guards, then started the API. Build log shows the strengthened source guard and architecture gates passing. Workflow is running.
- **HTTP readiness:** `/api/healthz` returned HTTP 200 (`status=ok`, Redis `ok`, research-key configuration present). `/api/system/status` returned HTTP 200 with `bureauIntegrity=ok`, Postgres `ok`, local Redis `ready`, Upstash slot ready, Groq Boss and Groq Right-hand configured, and Investigator slots 0 and 1 active. Status is configuration/health evidence, not a live provider-capacity probe.
- **Status caveat:** The same response includes a legacy `lanesHonesty.geminiRightHand=1` counter while the explicit `groqRightHand` role object identifies Groq. The canonical build guard reports Groq control/oversight; inspect the status counter source before treating it as a role mismatch.
- **Secret preflight:** All 13 requested names and platform `DATABASE_URL` are present. The check prints names/state only; no values were accessed or logged.
- **Offline gates:** `pnpm run test:phone-priority` passed (6 files, 44 tests); `investigator-capability-quota-identity.test.ts` passed (1 file, 4 tests). Together with entry 018's 55 focused tests and typecheck, all checks so far are offline/mocked; no real provider request has been made in this continuation.
- **Active job:** `/api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`, `jobId=null`.
- **UI-equivalent request verified from current source:** The desk first issues an advisory health request, then calls `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` and no `singleTargetId`. Default mock mode is not used for the live desk route.
- **Next action:** Resolve the legacy Right-hand counter against its current source, then take a fresh read-only entity/evidence ledger snapshot immediately before submitting exactly one canonical launch.

### 020 — Prelaunch source interpretation and fresh ledger baseline

- **Local timestamp:** `2026-10-11 18:17:02 EEST` (`2026-10-11T15:17:02Z`).
- **Right-hand counter resolution:** In `lanes-honesty.ts`, the legacy `geminiRightHand` field is populated from `getGroqRightHandStatus().configured`; the explicit system-status object also says Groq Right-hand. It is a misnamed compatibility counter, not evidence that Gemini controls this run. A nearby comment still describes the retired Gemini role and is stale documentation; no live-path code change was made for that telemetry-only naming mismatch.
- **Quota-recovery boundary:** The current registry’s explicit recovery selector excludes credentials by diagnostic digest so aliases of an exhausted key cannot be treated as independent quota pools. The post-pull identity test passed. No credential, digest, or key value was read or logged, and no fallback is being forced absent a classified hard request-quota failure.
- **Fresh read-only baseline:** Immediately before launch, SQL counts were `0` in each of `entities`, `research_cases`, `research_case_events`, `research_sessions`, `research_run_events`, `research_evidence`, and `contact_evidence`. The separate active-job endpoint returned `active=false`, `jobId=null`. Therefore any subsequent rows/events can be compared to a clean current-dev baseline; historical audit case 1 is not present here.
- **Launch decision:** Health and bureau integrity are ready; required secret names are present; all offline readiness checks passed; the active-job lock is clear. The user explicitly authorized the run. Submit one API request identical to the current UI helper’s default Launch Apex Atlas body: `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. No named target, fixed query, mock mode, alternate Investigator, or direct database/card mutation is introduced.
- **Next action:** Issue that single canonical launch request, record its response/job ID, and follow only that job’s durable control and evidence trail.

### 021 — Canonical UI-equivalent launch accepted

- **Local timestamp:** `2026-10-11 18:17:23 EEST` (`2026-10-11T15:17:23Z`).
- **Request:** Sent once to `POST /api/ingest/atlas-run` with `Content-Type: application/json` and body `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- **Response:** HTTP 202; canonical model-owned discovery started. Job ID: `4e3a0f64-7e5c-42db-b76a-0265328acada`. Poll URL returned by the API: `/api/ingest/job/4e3a0f64-7e5c-42db-b76a-0265328acada`. Response options confirm `targetCount=3`, `singleTargetId=null`, standard depth, 420,000 ms target timeout.
- **Status:** This is acceptance/start evidence only, not proof of discovery, research, admission, or card completion. No second launch has been submitted.
- **Next action:** Poll this job and inspect durable events/ledger deltas as they appear; do not start another run while its lock is active.

### 022 — Discovery control decisions and first live actions

- **Local timestamp:** `2026-10-11 18:17:55 EEST` (`2026-10-11T15:17:55Z`).
- **Job poll:** The specific job remains `running`, phase 1 of 4, progress 1, `inserted=0`, `skipped=0`, `errors=0`, `total=4`; active-lock endpoint still points to the same job. The API result identifies discovery case `1`.
- **Control output:** Groq Right-hand returned structured decision `promote`, model `openai/gpt-oss-120b`, confidence `0.94`, focus lanes `entitySelection`, `publicFilingRetrieval`, `officerNameExtraction`. Its explicit response rationale was: “Boss correctly notes the absence of a concrete anchor and advises selecting a verifiable public entity (e.g., SEC filing, Companies House record) before naming any individual, which directly satisfies the objective of discovering real named people from evidence‑bearing sources.” Groq Boss completed and selected `groq-investigator-1`. This is a control decision, not an admission or evidence claim.
- **Observed search actions (Serper):** Three successful calls each reported six URLs returned. Exact search text exposed in the job log:
  1. `SEC Form D filing beneficial owners high net worth individuals 2024`
  2. `SEC Form D beneficial owners HTML`
  3. `SEC Form D HTML beneficial owners`
  These are related query variants, not exact repeats. No direct-source observations, durable admission, entity, or contact evidence had appeared in the first poll.
- **Observed Investigator/control cadence:** Job log shows `llm_wait` entries stating it is waiting for the Boss-selected Investigator decision (`identity_resolution`) between the searches. Three provider telemetry records in the workflow log show Groq `openai/gpt-oss-120b` HTTP 200, with prompt sizes 5,727–5,728 user characters plus 1,472 system-prompt characters; each is a successful call. No 429, 413, provider error, or quota-triggered reassignment was observed. The three telemetry lines do not themselves identify which control role made each call, so role attribution is not inferred.
- **Prompt/evidence availability:** Logs expose query strings, returned URL counts, and prompt-size/token metadata, but not the exact composed prompts or full search-result URL/content payloads in this poll. Those values are not reconstructed. No secrets or hidden model thought fields are recorded.
- **Next action:** Continue polling the same job and inspect case-scoped durable events/source observations before treating search results as grounded evidence.

### 023 — Durable discovery trajectory reveals two unexpected Investigator failures

- **Local timestamp:** `2026-10-11 18:19:12 EEST` (`2026-10-11T15:19:12Z`).
- **Read source:** Read-only SQL against case `1` and its append-only `research_case_events`; no rows were inserted or edited by the audit. Case now reports `status=review`, `iteration=6`, `current_action=canonical-investigator-episode-failed`, objective `Discover real named people for subsequent target-scoped public-contact research.` The case objective explicitly requires a concrete business/context and geography, evidence-first person attribution, pivots away from generic/repetitive results, and forbids invented person/contact/URL data.
- **Opening control output:** Boss opened discovery with Investigator `groq-investigator-1`, model `openai/gpt-oss-120b`; its structured report said there was no concrete target and directed selection of a verifiable public entity before identifying a person. Right-hand’s opening `promote` was advice about that anchor-selection step, not promotion of a person. No target/entity was supplied by the launch request.
- **Investigator turn 1** (`2026-10-11T15:17:25.517Z`, `runId=4d2601e6-913a-45f0-ac93-713cf31c745a`): provider `serper`; query `SEC Form D filing beneficial owners high net worth individuals 2024`; hypothesis: Form D filings may reveal high-net-worth people in private offerings; purpose: test identity hypothesis/find candidates; expected information gain `0.6`. Six results:
  - SEC Form D PDF — `https://www.sec.gov/files/formd.pdf` — snippet says Form D is filed by each issuer selling securities under a Regulation D or Section 4(a)(5) exemption.
  - SEC “Officers, Directors and 10% Shareholders” — `https://www.sec.gov/resources-small-businesses/going-public/officers-directors-10-shareholders` — snippet says beneficial ownership reports use Schedule 13D or 13G for holdings above 5%.
  - `https://www.paulhastings.com/insights/client-alerts/sec-reporting-obligations-under-section-13-and-section-16-of-the-exchange` — snippet discusses reporting-deadline amendments effective September 30, 2024.
  - `https://www.huschblackwell.com/newsandinsights/legal-update-sec-adopts-amendments-to-beneficial-ownership-reporting-rules` — snippet discusses Section 13(d) beneficial-ownership reporting above 5%.
  - `https://www.fincen.gov/boi-faqs` — snippet concerns required identifying numbers for beneficial owners/company applicants.
  - `https://www.ropesgray.com/en/insights/alerts/2023/10/sec-adopts-substantial-changes-to-reporting-requirements-for-significant-shareholders` — snippet describes significant-shareholder reporting rules.
  No person finding was emitted.
- **Investigator turn 2** (`2026-10-11T15:17:28.336Z`, same run): provider `serper`; query `SEC Form D beneficial owners HTML`; hypothesis: an HTML Form D lists high-net-worth beneficial owners; purpose: find candidates with `>5%` ownership; expected information gain `0.7`. Six URLs: `https://www.sec.gov/files/formd.pdf`; `https://www.sec.gov/resources-small-businesses/going-public/officers-directors-10-shareholders`; `https://www.huschblackwell.com/newsandinsights/legal-update-sec-adopts-amendments-to-beneficial-ownership-reporting-rules`; `https://www.sec.gov/resources-small-businesses/exempt-offerings/filing-form-d-notice`; `https://www.toppanmerrill.com/solutions/ownership-reporting/`; `https://www.dfinsolutions.com/knowledge-hub/thought-leadership/knowledge-resources/sec-form-d`. Returned snippets explain Form D is an exempt-offering notice, the 13D/13G rule, and that Form D is filed in XML. No named candidate or evidence finding.
- **Investigator turn 3** (`2026-10-11T15:17:31.221Z`, same run): provider `serper`; query `SEC Form D HTML beneficial owners`; hypothesis: an HTML filing lists owner names/percentages; purpose: identify candidates with `>5%` ownership; expected information gain `0.6`. Six URLs: `https://www.sec.gov/resources-small-businesses/going-public/officers-directors-10-shareholders`; `https://www.sec.gov/files/formd.pdf`; `https://www.huschblackwell.com/newsandinsights/legal-update-sec-adopts-amendments-to-beneficial-ownership-reporting-rules`; `https://www.toppanmerrill.com/solutions/ownership-reporting/`; `https://www.paulhastings.com/insights/client-alerts/sec-reporting-obligations-under-section-13-and-section-16-of-the-exchange`; `https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/exchange-act-sections-13d-13g-regulation-13d-g-beneficial-ownership-reporting`. Snippets again describe 13D/13G rules and Form D/EDGAR; no person finding.
- **Investigator turn 4** (`2026-10-11T15:17:31.465Z`, `runId=4d2601e6-913a-45f0-ac93-713cf31c745a`): durable runtime record is `action=runtime_error`, `args.stage=turn_preparation`, `execution=error`, `stopReason=UNEXPECTED_ERROR`, `failureDomain=unexpected_programming_error`, `failureKind=unexpected_exception`, no observed URLs/findings. Sanitized observation: `unexpected_exception stage=turn_preparation NETWORK_ERROR (Error, messageChars=86 digest=a2eef5df47b56fd8)`. This is not evidence of exhausted provider quota; raw exception text is unavailable.
- **Controller pivot** (`2026-10-11T15:17:34.712Z`, control turn 1): Boss selected `pivot_discovery`, confidence `0.81`, direction `Shift discovery to SEC Schedule 13D/G filings and state corporate officer registries to identify named beneficial owners`. Structured reason says prior Form D searches produced no named individuals and recommends a different evidentiary anchor. Right-hand agreed. This is an observed model decision; no manual query/pivot was injected.
- **Investigator turn 5** (`2026-10-11T15:18:26.605Z`, `runId=7b8fee50-c15c-49bb-b83a-c9dfb9a9394c`): provider `serper`; query `publicly listed key individuals involved in corporate dependency relationships`; hypothesis: public sources may identify people tied to corporate dependence; purpose: find names/roles; expected information gain `0.3`. Six results were materially off-domain:
  - Mental Health America, `https://mhanational.org/resources/co-dependency/` — snippet concerns family/co-worker relationships around substance dependence.
  - MC Advisory, `https://www.mcadvisory.com/resources/key-person-risk-in-sales-the-hidden-cost-of-relationship-dependency/` — snippet describes customer-relationship/key-person risk in sales.
  - PMC, `https://pmc.ncbi.nlm.nih.gov/articles/PMC13067074/` — snippet is a 2026 review of psychological codependency.
  - HelpGuide, `https://www.helpguide.org/relationships/social-connection/codependency` — snippet concerns codependent relationships.
  - Workflawless, `https://workflawless.com/articles/business-process-management/key-person-risk-explained/` — snippet explains operational key-person risk.
  - MBS CPA, `https://mbs.cpa/key-person-dependency/` — snippet describes people pivotal to day-to-day operations.
  No business/owner identity or candidate finding was emitted. The search did not follow the Boss’s specific Schedule 13D/G or state-registry direction.
- **Investigator turn 6** (`2026-10-11T15:18:26.893Z`, same run as turn 5): second `runtime_error` at `turn_preparation`, same sanitized `NETWORK_ERROR`, `messageChars=86`, digest `a2eef5df47b56fd8`, `UNEXPECTED_ERROR`, `unexpected_programming_error`, no observed URLs/findings. Control then parked the case for review.
- **Episode failure summary** (`2026-10-11T15:18:27.393Z`): `investigator_episode_error`, reported status `error`, stop reason `UNEXPECTED_ERROR`, two new trajectory records, cumulative 4 searches, 0 visits, 6 iterations, 6 trajectory records, `investigatorActionExecuted=true`. Current `entities`, `research_evidence`, and `contact_evidence` counts remain 0.
- **Diagnostic assessment:** The first three search actions repeatedly returned regulatory guidance instead of an issuer-specific filing, then the model’s next search pivoted to unrelated psychological/operational “dependency” pages. Two runtime exceptions are classified as unexpected code/network-boundary errors, not quota exhaustion. No candidate/card is valid. The new commit’s stage tags make this failure observable but do not prevent it.
- **Privacy/observability boundary:** Raw queries, explicit action hypotheses/purposes, URLs, and source snippets above are durable app output and are recorded. App `thought` fields and private model reasoning are intentionally omitted. Exact model prompts and underlying exception text are not exposed by the durable records and are not fabricated.
- **Next action:** Check the parent job’s terminal/active state and capture contemporaneous workflow telemetry. Then trace `turn_preparation` to its exact call boundary and build an offline regression from the durable error signature before any new run or recovery action.

### 024 — Parent job terminal state and quota distinction

- **Observed:** At `2026-10-11 18:19:12 EEST` (`2026-10-11T15:19:12Z`), the parent job was terminal: `status=failed`, `outcome=incomplete`, `progress=3/4`, finished at `2026-10-11T15:18:27.404Z`; active-job endpoint is clear. The terminal API message carries sanitized digest `cd49a57166c4b081`, `failureDomain=unexpected_programming_error`, `failureKind=unexpected_exception`.
- **Aggregated result:** Discovery case `1`; 4 searches, 0 visits, 0 findings/admissions, 2 Investigator runs, 6 durable trajectory records/12 projected trajectory entries; controller used one turn and ended at `pivot_discovery`, with no candidate. `investigatorEpisodeFailure.runtimeFailureStage=turn_preparation`; no source-backed card exists.
- **Provider telemetry:** The latest workflow line is a successful Groq `openai/gpt-oss-120b` HTTP 200: prompt 5,728 user characters + 1,472 system characters, 2,162 prompt tokens, 566 completion tokens, 49,652 ms latency, `rateLimitRemainingRequests=996`, `rateLimitRemainingTokens=5,349`. No quota/413 error or capability reassignment appears in the observed telemetry. A slow successful provider call is not an exhausted-key diagnosis.
- **Disposition:** Preserve case `1` and its immutable failure/search events for diagnosis. The job lock is clear, but no new launch or control-recovery request is submitted until the exception boundary is understood and the supported recovery path is verified.
- **Next action:** Trace all `turn_preparation` awaits and callback implementations, especially authoritative job/case cancellation checks, against the `NETWORK_ERROR` signature; inspect the API error/log boundary for a safe diagnostic that reveals no raw exception text or credentials.

### 025 — Failure localized to the authoritative cancellation/lease check; bounded fix selected

- **Local timestamp:** `2026-10-11 18:24:36 EEST` (`2026-10-11T15:24:36Z`).
- **Call-path trace:** In the core, `turn_preparation` includes the awaited `shouldCancel` callback before prompt construction/model request. The dynamic wrapper’s callback reads the durable job (`getJobStrict`) and then verifies lease ownership (`isCanonicalJobOwner`). The job-state read maps Redis transport failure to a fail-closed “state unknown” error; the owner check uses strict `GET` against the single canonical `REDIS_URL_1` slot.
- **Likely failure boundary:** The durable diagnostic’s `NETWORK_ERROR` classification and 86-character source message are consistent with a transient error from the strict owner `GET`; no other external request is made in that turn-preparation section. Exact underlying text is intentionally unavailable, so this remains a source-backed localization, not a claim that the exact Redis exception was captured.
- **Load amplifier:** The core also launches a cancellation poll every 500 ms for the duration of each model request. That poll is not single-flight; the dynamic callback can issue both a job-state read and a lock-owner read, while a slow 49.652 s successful model call was observed. The runtime does not expose the actual poll count, so a precise command total is unknown. This creates avoidable pressure on the user’s single canonical Upstash command budget.
- **Authority constraints:** `REDIS_URL_1` is the sole canonical state store; `REDIS_URL_2+` are independent stores, not replicas. A read failure must never imply ownership or switch authority. The existing policy also excludes monthly-capped slots from automatic retry.
- **Fix selected:** Keep the strict per-turn job-and-lease check. Coalesce concurrent cancellation polls and reduce the background poll cadence to 2 seconds (maximum expected stop-detection delay 2 seconds during a model request). Add exactly one short retry only for a recognized transient transport failure on the read-only owner check, against the same canonical store; never retry quota/capacity errors or unknown job state. If the bounded read still fails, preserve fail-closed behavior.
- **Verification plan:** Add offline tests for cancellation-check single-flight behavior, one transient owner-read recovery, persistent transport failure remaining rejected, and quota failure not retried. Then rerun the focused architecture/readiness tests and typecheck. Do not submit a continuation or new launch until those pass.

### 026 — Reconciliation of the newer attached sequential audit (2026-10-12)

- **Source precedence:** The user-attached `Apex Atlas Sequential Live-Run Audit.md` is newer than this tracked audit. This entry supplements the existing historical trace; it does not replace or rewrite earlier run records. Job and case IDs below belong only to the Replit development database described in that attachment.
- **Latest documented launch:** UI-equivalent request `POST /api/ingest/atlas-run` with body `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`; no target ID, fixed query, or mock mode. Latest job `bd5a1ecc-e6b5-467c-8180-fe926aa8d507`, discovery case `3`.
- **Last durable state in the attached record:** after Investigator turn 6 / `research_case_events` event 56, the snapshot was `entities=0`, `assets=0`, `contact_evidence=0`, `research_cases=3`, `research_case_events=56`, `research_evidence=0`, `research_sessions=0`, `research_run_events=0`. No admitted candidate, target session, evidence row, contact evidence, or card had been created.
- **Observed crash:** The API exited after event 56 with Node `RangeError: init["status"] must be in the range of 200 to 599, inclusive`, with a stack in outbound `Response` construction. The upstream status that caused the invalid response was not captured. Current GitHub main has the bounded status-validation patch and tests, but the Replit deployed revision is not established by the attached records.
- **Separate pre-model error:** `turn_preparation NETWORK_ERROR` with message length 86 and digest `a2eef5df47b56fd8` recurred before the next Investigator request, while adjacent Groq responses succeeded. The owner-read diagnosis remains a source-backed hypothesis, not a proven exact Redis failure or proof that the retry change fixed it.
- **Research-quality observation:** The official FIS investor-relations SEC-filings page returned names of Form 3/4 filers, but the Investigator submitted `findings=[]`. Names appearing in a source are not an admission; no manual finding, promotion, replay, or card creation is authorized.
- **Reconciliation boundary:** At the crash, case 3 was still active at iteration 6. The job hash and canonical Redis lease were unavailable while the API process was down. Their present state remains unverified until the owner performs read-only checks in the actual Replit environment. Do not assume the job is terminal or the lease is clear.
- **Assistant action boundary:** This review made no live Atlas launch, continuation request, Replit operation, or provider/search request. Any future run remains solely user-controlled after offline regressions and exact-environment status reconciliation.
