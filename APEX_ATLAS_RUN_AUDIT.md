# Apex Atlas End-to-End Run Audit

⭐ **Current sequential audit:** [★ Starred Apex Atlas Fresh Replit Import Run 02 — 2026-10-26](audits/★_STARRED_APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-26_FRESH_REPLIT_IMPORT_RUN_02.md)
⭐ **ChatGPT run audit:** [⭐ APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-25_CHATGPT_RUN_01.md](audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-25_CHATGPT_RUN_01.md) — secure credentials received, but launch/card remains unverified.

## Audit contract

- **Purpose:** trace one canonical run from discovery through Investigator research and durable card/admission projection, including setup faults and recovery decisions.
- **Started:** 2026-10-12 (Europe/Kyiv). Workflow timestamps below use UTC when available.
- **Scope:** development workspace only. No deployment/public exposure is part of this run.
- **Record format:** append chronological, evidence-based events. Include command/API route, bounded and sanitized inputs, provider/model/role when observable, search/tool activity, source URLs and relevant public evidence, durable state deltas, errors, retries, and concise decision rationale.
- **Do not record:** secret values, API keys, tokens, cookies, credentials, hidden chain-of-thought, unsupported guesses, or third-party personal contact values in this tracked file. Use source citations and sanitized factual summaries.
- **Raw prompts:** record provider-visible prompt content in the tracked report only when safely observable and sanitized; otherwise point to the per-run private trace or record the prompt template/version and state that the raw payload was not exposed. Hidden reasoning is never available for logging. Do not enable unbounded prompt/page logging or change core research policy just to fill this file.
- **Status at audit creation:** no new Apex run has been launched yet.

## 0. Import and startup history

1. Imported the existing GitHub repository into the blank Replit workspace; did not scaffold a replacement app.
2. Setup issue: `rsync` was unavailable. That attempt stopped before copying files.
3. Setup issue: replacing the workspace `.git` directory was blocked by Replit's safeguard. No source files were changed by that attempt. Recovery: fetched `main` into the existing Replit checkout, preserving Replit Git metadata. Source commit observed: `d8ac947bc7f98f95dc4a1173bcb9b650f542ac34`.
4. Installed dependencies with `pnpm install --frozen-lockfile`; the locked install completed without changing the lockfile.
5. Started the repository's canonical API workflow (`bash scripts/replit-boot.sh`). Frontend and API builds/checks passed. Normal startup explicitly skipped schema changes.
6. Initial preview issue: `/api/dashboard/stats`, `/api/dashboard/hot-leads`, `/api/dashboard/map-data`, and `/api/ingest/scoreboard-snapshot` returned HTTP 500 because the new development database had no public tables. Read-only `information_schema` checks confirmed the development database was empty.
7. Recovery: ran the repository's documented first-time initializer once: `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`. It created the application schema and durable integrity guards; its compatibility pass reported 0 legacy registry rows corrected. Required durable tables were verified. Ordinary boot remains migration-free.
8. Post-initialization verification: `/api/healthz`, `/api/dashboard/stats`, `/api/dashboard/hot-leads`, `/api/dashboard/map-data`, `/api/ingest/scoreboard-snapshot`, and `/api/system/status` returned HTTP 200. Dashboard counts were zero; no records or sample data were seeded. Redis reported healthy and research keys configured. The rendered desk had no browser errors.
9. The 13 requested provider/service secret names were confirmed present in Replit Secrets. Their values were not read into or written to this audit.

## 1. Preflight before launch

1.1. Inspected the launch control and launcher client. The home-page CTA defaults to **standard** depth and sends `targetCount: 3`, `targetTimeoutMs: 420000` to `POST /api/ingest/atlas-run`; the health check is advisory. No launch request was sent during this inspection.

1.2. The historical `routes/atlas.ts` module is a deliberate HTTP 410 compatibility stub. The canonical route mount and provider selection path must be verified before launch; do not call the legacy handler directly.

1.3. Reviewed prior recorded run lessons to avoid repeating failures:
- A prior discovery smoke reported contact activity, but the before/after entity ledger had no fresh admission. Success must be proved with fresh durable IDs, not a narrative counter.
- A prior Investigator trajectory reached Groq, then requests failed with HTTP 413 at a 42.9k-character prompt. Treat 413 as a context-size rejection, not exhausted quota; do not retry unchanged oversized context.
- A prior target proof reached a terminal publish label while the deterministic approved-value set was empty and its prose claimed a personal email. A card/contact is valid only when exact approved values, identity/scope, and source evidence agree.
- Prior quota incidents show configured keys do not guarantee live capacity. Record provider error type and reset details; retry only within the same selected role, capability, and bounded run policy.

1.4. Architecture boundary: the durable case's Boss-selected Investigator remains authoritative. Do not force a provider/model substitution after a failure or mix providers in one trajectory. If the repository's explicit same-role recovery path selects another eligible Investigator, record the Boss decision and durable selection; otherwise fail closed and report the blocker.

1.5. At this point no discovery/research request, provider request, external search, or database write for a new run has been made.

1.6. Read-only baseline immediately before launch checks: `GET /api/ingest/job/active/atlas-run` returned `active:false`, `jobId:null`; `GET /api/ingest/jobs` showed the legacy ingest jobs idle. Development DB counts/max IDs were all zero for `entities`, `research_cases`, `research_case_events`, `research_sessions`, `research_evidence`, and `research_run_events`.

1.7. Launch routing requires one final check: the CTA posts to `/api/ingest/atlas-run`, and the historical `atlasRouter` returns 410. No POST has been sent; verify canonical mount order before proceeding.

1.8. Route order is confirmed: `canonicalAtlasLaunchRouter` is mounted before the legacy launch quarantine and the historical 410 stub. The handler checks schema readiness and Redis/job-lock state, then starts `runCanonicalAtlasPipeline` asynchronously and returns a 202 job ID. The intended UI-equivalent request is the default body `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`; no single-target ID is supplied.

1.9. Investigator registry evidence: the active capability type is role-scoped Groq Investigator credentials. Boss owns capability selection; credentials that are aliases of the same key are not independent quota fallbacks. The audit will record observable durable selections and provider errors, without reading or comparing secret values. No cross-provider substitution will be added or forced.

1.10. The canonical pipeline already implements the requested quota recovery without a deterministic research ladder: only an explicit `upstream_quota_exhausted` result can exclude the selected Investigator and all aliases of that credential. Groq Boss is then asked to choose a different currently configured, distinct Investigator capability; the replacement is durably recorded on the same discovery case, while prior evidence/trajectory is preserved. If none remains or Boss does not choose a valid alternate, the run fails closed. No code change is needed for this contingency.

1.11. The source-defined default discovery objective that the launch will use is:
> Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary contact routes for later target-scoped research. People—not companies or executive prestige—are the target; companies are leads. Prefer private, mid-market, regional and family businesses; their owners/operators/founders/shareholders; investors and private-capital principals; beneficial/controlling owners; and concession, franchise or license holders. Look for public evidence of ownership/equity/investment/control, material business/property assets or a business exit, and a plausible way to approach the person through public professional or business channels. Do not infer wealth from seniority alone. Do not default to celebrities, billionaire/richest lists, Fortune 500, or global household-brand leadership. A global brand is relevant only when evidence points to a realistic local owner/operator/distributor/franchisee/concession-holder or similar intermediary. Start from a concrete business/sector/geography, use local-language terms and English when useful, test hypotheses with independent evidence, and pivot after generic or repetitive results. The Investigator chooses each action; no fixed sequence. Promote only exact named people whose role, wealth-potential basis, and realistic approach route are source-supported. Never invent a person, relationship, wealth fact, contact, or URL.

1.12. Trace limitation: the existing bounded trace exposes actions, tool outputs, observations, structured decisions, result URLs, and short summaries; it intentionally does not store hidden chain-of-thought or complete provider request prompts. The audit will capture the exact default objective and all available traces/search inputs, and will mark any unavailable raw provider prompt as unavailable rather than reconstructing it as if observed. No runtime logging instrumentation has been added.

1.13. Immediate pre-launch health gate: `GET /api/healthz` returned HTTP 200 with `status=ok`, Redis `status=ok`, and `researchKeysConfigured=true`; `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`. User explicitly requested a full UI-equivalent run. Next action is one `POST /api/ingest/atlas-run` with the standard UI defaults in 1.8. This will call configured external research/model services and may write qualifying results into the empty development database; no other launch will be sent concurrently.

## 2. Canonical run `a0e9001c-2701-491d-9b34-8b90f1cf7035`

2.1. **Launch accepted** — 2026-10-12 17:08:47 UTC (20:08:47 Europe/Kyiv). Sent exactly one POST to `/api/ingest/atlas-run`, body `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. Response: HTTP 202, `singleTargetId:null`, canonical model-owned discovery started, `pollUrl=/api/ingest/job/a0e9001c-2701-491d-9b34-8b90f1cf7035`. No credentials were sent in the request body.

_Run is asynchronous. Append observed job/trace deltas and source evidence below before taking any recovery action._

### 2.2 Discovery opening and first observed tools

At the first live poll (17:09:05Z), the job was `running`, phase 1/4, progress 1/4, with `inserted=0`, `skipped=0`, `errors=0`. This is an in-flight snapshot, not a terminal admission result. The durable job result reports discovery case `1`; a database read is still needed to verify the corresponding persisted case/event rows.

- **Boss assignment:** status `completed`; model `openai/gpt-oss-120b`; selected Investigator capability `groq-investigator-1`.
- **Right-hand opening review:** status `completed`; same reported model; decision `Proceed with the bounded discovery as outlined, but emphasize multi-source verification of ownership and wealth potential and implement safeguards against name collisions and false positives`; confidence `0.92`. Recorded focus lanes: `registry_query`, `chamber_directory_review`, `professional_networking_search`, `wealth_potential_crossvalidation`. Its structured reason supports regional/private-company research while requiring independent ownership/wealth confirmation and name-collision checks.
- **Observed exact search text** (provider `serper`): `under-the-radar wealthy local business owners franchise operators contact information` → 6 URLs; `Marriott hotel franchise owner "franchise disclosure document" 2024` → 6 URLs.
- **Parallel search:** `parallel_web_search` returned 12 URLs from independent searches at 17:09:01Z. The current API trace does not expose those individual query strings or URLs; they are not guessed here.
- **Decision waits:** four `llm_wait` telemetry entries report `waiting for Boss-selected Investigator decision (identity_resolution)` in the same discovery interval. They are wait/action telemetry, not provider failures.
- The trace currently exposes three tool spans (two `web_search`, one `parallel_web_search`), all `ok`; the `discoveryTrace` slot list is still empty at this active snapshot. No candidate name or contact value is exposed yet.
- **Provider metrics observed in the workflow log snapshot at 17:09:07:** three `apex_agentic_llm_attempt` events for Groq model `openai/gpt-oss-120b`; each HTTP 200/success, prompt size 7,072 chars (5,600 user + 1,472 system), total tokens 2,599 / 2,832 / 2,613, latency 1,770 / 1,937 / 1,433 ms. The log does not label each event's agent role. Reported remaining requests were 999 / 998 / 997; remaining tokens declined 5,763 → 3,509 → 1,381, with reset intervals 16,777 / 33,682 / 49,642 ms for tokens. No quota exhaustion or Investigator reassignment has occurred.
- The same workflow snapshot contains dashboard-query SQL errors. Their event timestamps/relationship to this run are not yet established; triage is pending. No fix or restart has been attempted based only on that snapshot.

### 2.3 Further discovery activity and dashboard error check

At 17:10:13Z the job remained `running` in phase 1/4 with the initial Boss/Right-hand result unchanged. New trace/log deltas:

- 17:09:58.801Z, `web_search` via Serper: exact input `2023 MHR FDD Marriott franchisee name`; 6 URLs returned.
- 17:10:12.767Z, `browser_fetch` via Scrapfly: trace input was `https://www.hotel-development.marriott.com/resourcefiles/fdd-document/2023-mhr-f` (telemetry-truncated); result summary reported `VERIFIED_FINAL_URL: https://www.hotel-development.mar/` (also truncated by the summary). Span status was `ok`. The live trace does not include the full response body or full final URL, so neither is reconstructed.
- 17:10:13.102Z, `llm_wait`: `waiting for Boss-selected Investigator decision (identity_resolution)`.

The earlier log snapshot's dashboard SQL exceptions have no event timestamp in the captured output. A fresh `GET /api/dashboard/stats` at 17:10:01Z returned HTTP 200, zero entities/assets/relationships, and `bureauIntegrity=ok`; the error was not reproduced and is not an Atlas pipeline error. No code change was made.

No candidate admission is claimed from this phase yet. The live dashboard still reports zero entities, which is consistent with discovery still running; the job-level `inserted=0` field is not used as the final proof of admission or card creation.

### 2.4 First discovery episode, control pivot, and handoff anomaly

A read-only development-database snapshot at 17:11:08Z verified the discovery case exists (`research_cases.id=1`, status `active`, Investigator `groq-investigator-1`, iteration 8); it had 13 case events, while the database still had 0 entities, 0 research evidence rows, 0 sessions, and 0 run events. This confirms the first free-ReAct episode did not admit a person.

- Completed discovery trace slot 0 (`executionId=71b4116d-469e-4382-b176-199d88edb590`): `searches=6`, `visits=1`, `stopReason=ITERATION_BUDGET`, `error=iteration budget exhausted`, `modelFindings=[]`, `parsedCandidates=[]`. This was an Investigator iteration-budget stop, **not** provider quota exhaustion; no alternate key was selected.
- Groq Boss control turn 1, reviewed by Right-hand, chose `pivot_discovery` (confidence `0.81`) because the Marriott searches had yielded corporate FDDs rather than a named owner, with no admitted candidate/evidence. Direction: “Shift focus to non‑Marriott hospitality franchises (e.g., independent boutique hotel chains, regional franchisee associations) and query public business registries, local chamber of commerce listings, and state corporate filings for named owners/operators with disclosed equity stakes. Prioritize jurisdictions with searchable ownership databases (e.g., US states, Canada provinces, EU registries).” The database recorded this accepted objective before the next Investigator action.
- **Apparent handoff mismatch:** the next discovery run (`runId=09403ba1-add1-462a-aad6-660d675dc4b3`) nevertheless searched Marriott franchise owners/directories again (Serper + Tavily, 12 URLs) and visited `https://marriottfranchisetransactions.marriott.com/`. That page exposed a sign-in wall for registered owners/franchisees/management companies. The tool's contact extractor labeled `example@domain.com` as an email, but this is a login-form placeholder, not an identified person's contact. It is explicitly rejected as lead/contact evidence. The active objective versus actual search run is being checked before changing anything.
- Raw public search/query results are being transcribed from structured event payloads (action args and observations only). The event payload also contains a `thought` field; its contents are intentionally excluded from this audit. No hidden chain-of-thought or secret value is recorded.

### 2.5 Terminal result and bounded-work allocation

The run terminated at 17:13:06.270Z: job status `failed`, outcome `incomplete`, phase 3/4, message `Canonical Atlas control stopped without an evidence-backed terminal state; case preserved for review.` No active Atlas job remains. Final read-only development counts: entities 0, evidence 0, sessions 0, run events 0; one discovery case, 19 case events. Case 1 is `review` / `canonical-evidence-terminal-incomplete`; no contact/asset card was created, and target research was not entered.

- Terminal job result: discovery `status=completed`, `findings=0`, `searches=11`, `visits=2`, `runs=2`, `trajectoryEntries=24`, `structuredTurns=12`; `admitted=0`, `materialized=0`, `evidenceRows=0`; research `researched=0`, explicit card promotions `0`.
- Standard depth configured `agenticMaxIterations=20`, `investigatorIterationsPerAct=6`, hard episode timeout `210000 ms`. The canonical pipeline reserved 8 of the 20 actions for future target research, leaving a discovery ceiling of 12. Two six-action discovery acts used all 12; the 8 reserved target actions could not be used without an admitted target. `investigatorResourceLimited=false` refers to the 20-action overall ceiling, not an available third discovery act.
- Control decisions: turn 1 pivoted from Marriott to non-Marriott hospitality; turn 2 pivoted to public registries and local chambers for owners/operators at Drury Hotels, White Lodging, and similar businesses; turn 3 chose `stop` because discovery budget was exhausted and there was no admitted candidate. The second pivot was never executed by an Investigator act.
- The workflow log contained 10 Groq model-attempt metrics in its 17:13:19Z snapshot: 9 successful HTTP 200s and one HTTP 400 `json_validate_failed`; the following attempt (`retryIndex=2`) succeeded. Role attribution is absent from these metric records. Request quota remained available (last reported 987); no `upstream_quota_exhausted` was observed and no Investigator key rotation occurred.
- No source-code or runtime change has been made yet. The run ended by the canonical fail-closed rule; the defect to address is insufficient usable discovery budget/weak handoff priority for this broad launch, not an exhausted credential.

### 2.6 Raw search and source record (structured action/observation fields; no private reasoning)

The following is taken from the run's durable `research_case_events` and live tool trace. Search results are leads only unless otherwise stated; none produced a model finding or admission.

| Turn | Exact action/query or URL | Provider/result and relevant observed sources |
|---|---|---|
| 1 | `web_search`: `under-the-radar wealthy local business owners franchise operators contact information` | Serper, 6 URLs: `https://www.facebook.com/scottdclarypage/posts/jon-ostenson-jostenson-ran-350m-in-sales-at-carters-scaled-a-franchise-to-200-lo/1606303514396690/`; `https://origami.chat/blog/find-franchise-owners-b2b-outreach-2026`; `https://www.youtube.com/watch?v=NG3OZJpvKL8&xstg=CAMSBhUDze3xHw%3D`; `https://www.franchise.org/2025/12/franchising-com-franchise-means-local-new-campaign-focuses-on-stories-that-matter/`; `https://www.franchisedirect.com/information/who-owns-who-in-franchising/`; `https://www.franchisejournal.com/october-2025`. Snippets mentioned Jon Ostenson, local franchise owners, and franchise industry material; these were not independently verified or admitted. |
| 2a | `parallel_web_search`: `local franchise owner public record "franchise disclosure document" 2024` | Serper, 6 URLs: `https://www.hotel-development.marriott.com/resourcefiles/fdd-document/2024-we-fdd-3-31-2024.pdf`; `https://www.franchimp.com/?page=pdf&f=108153_2024.pdf`; `https://www.sec.gov/Archives/edgar/data/1879403/000157587222000540/cm069_ex10-28.htm`; `https://ronnelenterprises.com/decision-guide/how-to-read-franchise-disclosure-document/`; `https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-436/subpart-C`; `https://som.yale.edu/sites/default/files/2025-04/Examining%20the%20Franchise%20Disclosure%20Document%20with%20Crumbl%20FDD.pdf`. The results included Marriott and Baskin-Robbins FDDs, a La Rosa filing, and general FDD guidance. |
| 2b | Same action: `state business entity search franchisee owner 2023` | Tavily, 6 URLs: `https://zephira.ai/new-york-business-entity-search-a-complete-guide-to-the-dos-database`; `https://entitycheck.com/newyork`; `https://entitycheck.com/alabama`; `https://secretaryofstate.com/texas`; `https://comptroller.texas.gov/taxes/franchise/account-status/search`; `https://www.harborcompliance.com/business-entity-search`. Results described general state-entity lookups; they did not identify a franchise owner. |
| 3 | `web_search`: `Marriott hotel franchise owner "franchise disclosure document" 2024` | Serper, 6 URLs: `https://www.hotel-development.marriott.com/resourcefiles/fdd-document/2023-mhr-fdd-3-31-2023.pdf`; `https://www.franchimp.com/?page=pdf&f=105943_2024.pdf`; `https://www.hotel-development.marriott.com/how-we-work-together/new-to-franchising`; `https://www.franchisecomplaints.org/reports/marriott-fdd/`; `https://franchisegenius.com/research/delta-hotels-by-marriott-Franchise-Disclosure-Documents-FDD/`; `https://franzy.com/franchises/marriott-hotel`. Results were franchisor/FDD information, not named local owners. |
| 4 | `web_search`: `2023 MHR FDD Marriott franchisee name` | Serper, 6 URLs: `https://www.hotel-development.marriott.com/resourcefiles/fdd-document/2023-mhr-fdd-3-31-2023.pdf`; `https://www.franchimp.com/?page=franchisor&name=Marriott+Hotel&id=105978`; `https://www.hotel-development.marriott.com/`; `https://www.franchisedirect.com/travelfranchises/marriott-international-franchise-08393/ufoc/`; `https://marriott.gcs-web.com/news-releases/news-release-details/marriott-international-announces-record-year-global-signings-and`; `https://en.wikipedia.org/wiki/Marriott_International`. FDD snippets described franchise terms, not an identified franchisee. |
| 5 | `browser_fetch`: `https://www.hotel-development.marriott.com/resourcefiles/fdd-document/2023-mhr-f` | Scrapfly returned the Marriott Hotel Development 404 page. No person or contact was found. |
| 6 | `web_search`: `Marriott franchise owner "local" hotel development "2023" site:marriott.com` | Serper, 6 URLs: the 2023 Serve 360 report, 2021 report, 2024 ESG progress report, 2023 CDP report, 2022 climate report, and the Marriott 2023 FDD PDF. These were not evidence of an individual franchise owner. |
| 7a | `parallel_web_search`: `Marriott franchise owner list United States` | Serper, 6 URLs: `https://marriottfranchisetransactions.marriott.com/`; `https://www.hotel-development.marriott.com/how-we-work-together/new-to-franchising`; `https://www.reddit.com/r/marriott/comments/1n8q9dy/14_marriott_owned_and_operated_propeties_in_the_us/`; `https://www.franchisedirect.com/travelfranchises/marriott-international-franchise-08393/ufoc/`; `https://en.wikipedia.org/wiki/Marriott_International`; `https://www.webwire.com/ViewPressRel.asp?aId=97030`. |
| 7b | Same action: `Marriott franchisee directory` | Tavily, 6 URLs: `https://www.marriott.com/about/marriottgroup.mi`; `https://www.franchisedirect.com/travelfranchises/marriott-international-franchise-08393/ufoc`; `https://www.franchimp.com/?page=franchisor&name=Marriott+Hotel&id=105978`; `https://www.hotel-development.marriott.com/resourcefiles/fdd-document/2023-mhr-fdd-3-31-2023.pdf`; `https://franpass.com/franchise/residence-inn-by-marriott`; `https://ca.indeed.com/q-finance-&-accounting-marriott-jobs.html`. |
| 8 | `visit`: `https://marriottfranchisetransactions.marriott.com/` | Page says it is for registered Marriott owners, franchisees, and management companies; sign-in/access wall. Extractor output `EMAIL: example@domain.com` is a form placeholder, not a person/contact. `findings=[]`. |
| 9 | `web_search`: `Marriott franchise owner regional private equity operator contact` | Serper, 6 URLs: Marriott FDD; `https://www.hotel-development.marriott.com/meet-the-team`; `https://www.marriott.com/about/marriottgroup.mi`; `https://www.crestmontcapital.com/blog/marriott-franchise-loan`; Marriott investor release; `https://www.hotelinvestmenttoday.com/Financials/C-Corps/Marriott-realigns-regional-leadership`. Search snippets surfaced generic Marriott development contacts `nalolodgingdev@marriott.com` and `(301) 380-3000` from the FDD, plus `+234 906 956 6601` alongside a Marriott development-team result mentioning Sam Barrell. These are unverified search-result text, not target-owned contact routes; none was admitted. |
| 10 | `browser_fetch`: `https://www.hotel-development.marriott.com/resourcefiles/fdd-document/2023-mhr-fdd-3-31-2023.pdf` | Blocked locally as `pdf_unsupported`; no browser provider request was made and PDF contents were not observed. |
| 11 | `web_search`: `private hotel franchise owner United States regional` | Serper, 6 URLs: `https://www.hifranchise.com/why-hihotels/unique-mission/`; Sonesta regional franchise-operations job listing; `https://skift.com/2019/12/13/whats-ahead-for-the-next-gen-of-u-s-hotel-franchisees/`; `https://development.wyndhamhotels.com/`; `https://www.aahoa.com/about-AAHOA`; `https://www.franchisedirect.com/information/major-hotel-franchise-conglomerates-and-the-brands-they-own`. General industry results only. |
| 12 | `web_search`: `private hotel franchise owner "family owned" United States` | Serper, 6 URLs: `https://www.druryhotels.com/about`; `https://www.facebook.com/groups/2795238140730579/posts/4423934081194302/`; `https://umbrex.com/resources/global-hotel-brand-guide/drury-hotels/`; `https://www.whitelodging.com/about/our-founder`; `https://whiteskyhospitality.com/the-hotel-owners-playbook-navigating-franchise-agreements-in-a-consolidating-market/`; `https://empirespod.substack.com/p/from-one-motel-to-billions-the-patel-c31`. Snippets said Drury remains family-owned and operated and identified a White Lodging founder page for Bruce White; these are search-result leads only, not verified model findings or admitted contacts. |

**Contact evidence actually admitted:** none. The above-listed contact-like strings were either generic franchisor contacts in search snippets or a sign-in-form placeholder, not a verified named person's professional contact route.

_Append one numbered event per remaining inspection, launch action, model/tool stage, persistence result, failure, retry, and recovery. Do not mark the run successful until the canonical run and durable card/admission state are verified._


## 3. Local corrective pass and senior handoff — 2026-10-27

### 3.1 Confirmed defect
The prior canonical run exhausted the initial discovery allocation without admitting a candidate. The source already released the protected target reserve when no candidate existed, but the continuation call still reused the opening `discoveryIterationsPerAct` value. Therefore released capacity could not be allocated adaptively across subsequent Boss-directed discovery acts. This created an avoidable “budget exhausted” terminal state before the first canonical card.

### 3.2 Local-only fix applied
In `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`, the continuation now recomputes the Investigator act cap from `remainingInvestigatorIterations` using `resolveDiscoveryIterationsPerAct(...)`. The opening act remains bounded exactly as before; only later acts use the currently available global budget. This preserves model-owned control, the hard global ceiling, the target reserve once a candidate exists, provider-role ownership, and fail-closed behavior.

Added regression coverage in `artifacts/api-server/src/src/test/research-depth.test.ts` for released-capacity act sizing (8 remaining → 3 actions; 4 remaining → 2 actions).

### 3.3 Validation status
`pnpm install --frozen-lockfile` completed successfully without a lockfile change. The first targeted test command was attempted before dependencies were installed and failed because `vitest` was unavailable; dependencies were then installed. A rerun is required by the senior developer in the target checkout before landing the local code fix. No live provider-backed run was launched in this pass, so no card-creation claim is made.

### 3.4 Commit boundary
Per the requested handoff protocol, only this audit update is intended for the `main` commit. The source fix and regression test remain local/uncommitted so a senior developer can critically review, rerun the focused tests and full Bureau checks, inspect the diff, and apply the production change deliberately.

### 3.5 Required next run / finish line
Run exactly one canonical UI-equivalent launch only after focused and repository checks pass. Observe Boss assignment, Right-hand oversight, Investigator actions, non-AI bureau tools (including registry/search/browser-fetch/SpiderFoot where selected), per-target case context growth, event ordering, evidence provenance, admission, card materialization, dashboard projection, and lock release. The run is a failure if any configured depth reaches its terminal quota/resource boundary without at least one evidence-backed canonical card. Preserve a separate durable investigation context for every target and case; never merge unrelated target context.

### 3.6 Senior developer review questions
1. Confirm the dynamic continuation cap cannot exceed the remaining global action ceiling or bypass the target reserve after admission.
2. Confirm `runDiscoveryWithQuotaRecovery` and control-turn accounting remain bounded when the recomputed cap shrinks.
3. Confirm the new test is sufficient for standard/fast/deep depth configurations and add an integration regression for the exact two-act/no-admission trajectory from the prior run.
4. Confirm the audit captures observable agent decisions and tool calls only, excluding hidden reasoning, secrets, and raw personal contact values from tracked reports.


### 3.7 Canonical run 91b7c14e-0385-4e36-be8e-ae9c3b2fac6a — live audit

- **Launch:** 2026-10-27 06:30:23Z. Sent exactly one `POST /api/ingest/atlas-run` with `{}`; the route applied the UI defaults (`targetCount=3`, `researchDepth=configured`, `targetTimeoutMs=420000`). Response was HTTP 202 with durable job ID `91b7c14e-0385-4e36-be8e-ae9c3b2fac6a`.
- **Pre-launch recovery:** the first attempt failed closed before job creation because the API process did not have the connected Neon `DATABASE_URL` / Redis runtime loaded. After loading the project environment and restarting the API with the connected database runtime, the same canonical route accepted the launch. This is an environment/startup handoff issue, not a pipeline success.
- **Opening control plane:** Boss completed with model `openai/gpt-oss-120b`; Right-hand approved the direction with confidence `0.86`; selected Investigator was `groq-investigator-1`; durable discovery case ID was `1`. The assignment targeted private mid-market manufacturing businesses in the West Midlands and intended to extract named owners/PSC evidence.
- **Bureau/tool activity:** one successful `registry_search` through `companies-house` returned 16 results / 13 lead URLs. Two `browser_fetch` attempts through Scrapfly against `https://find-and-update.company-information.service.gov.uk/company/OC436450` failed with `failureDomain=external_page_fetch` / `request_failure`. A third identical fetch was correctly blocked by the repeat-action guard. No SpiderFoot invocation was selected or observed; do not infer that it ran.
- **Investigator trajectory:** 24 durable trajectory entries represented 12 structured iterations. The successful registry output remained leads only: `findings=0`, `admittedCandidates=0`, `evidenceRows=0`, `visits=0`. Eight subsequent turns were `parse_failure` events caused by invalid `browser_fetch` action contracts (`provider` was not valid for that action); these were model-contract failures, not provider quota exhaustion. No `upstream_quota_exhausted` event occurred, no Investigator rotation was authorized, and no cross-provider substitution was performed.
- **Terminal state:** at 06:34:07Z the job became `failed`, `outcome=incomplete`, phase `3/4`, message `Canonical Investigator iteration ceiling reached after 12 Investigator iteration(s); case preserved for review.` Control reported `investigatorIterationsUsed=12`, `investigatorIterationCeiling=12`, `investigatorResourceLimited=true`, `research.researched=0`, `explicitCardPromotions=0`.
- **Finish-line result:** zero canonical cards were created. This run therefore fails the requested finish line even though a registry tool produced public leads. No card, contact, or personal-value assertion may be derived from those leads.
- **Case-context requirement:** the durable case was preserved with Boss/Right-hand assignment, action args, observations, URLs, failure domains, parse failures, and control decisions. The case remained separate from target-scoped research because no candidate was admitted. A later target case must not reuse this case as an identity or evidence context.

### 3.8 Required production fixes before the next run

1. Treat an enabled bureau failure as a pivot signal: after Scrapfly fails, select another configured retrieval bureau or an allowed Companies House API path instead of spending the remaining depth on the same URL.
2. Validate model action contracts before consuming a full iteration. The `browser_fetch` schema must reject or repair invalid `provider` arguments through a bounded correction, without inventing evidence.
3. Add an explicit lead-only but source-backed fallback policy: a registry result should permit a new retrieval strategy, never card promotion without evidence, and never terminalize while alternate configured non-AI tools remain unused.
4. Add an integration regression for registry success → Scrapfly transport failure → repeat-action guard → invalid action contracts → depth exhaustion. Expected result: a verified card from an alternate source or a terminal audit naming the unused bureau and why it was unavailable; never silently remain `running` until timeout.
5. Verify API startup loads both connected Neon `DATABASE_URL` and Redis before presenting the launch CTA; return a diagnostic readiness failure before accepting user work when either is absent.
6. Keep per-target investigation context isolated and append-only. The current no-target run correctly has no target case; the next run must prove separate case IDs and event streams for each admitted target.
