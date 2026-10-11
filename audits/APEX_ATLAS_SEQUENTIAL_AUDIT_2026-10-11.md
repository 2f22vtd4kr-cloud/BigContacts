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

