# Apex Atlas — Sequential Audit — 2026-10-25 ChatGPT Direct Run 01

**Status:** IN PROGRESS — acceptance not yet met.

**Acceptance condition:** one genuine canonical Apex Atlas run, with the real AI-driven Boss → Investigator → Right-hand control loop, source-backed evidence, deterministic admission, durable persistence, and at least one properly created card visible from canonical durable state.

**Canonical branch:** `main`  
**Repository:** `2f22vtd4kr-cloud/BigContacts`

## Audit law

This is an append-only chronological run record. It records observable setup/runtime events, model-visible control outputs when available, tool actions/results, source references, findings, admission decisions, persistence, failures, and corrective actions. Hidden provider chain-of-thought is not available to the auditor and is not fabricated. Secret values are never recorded.

## E001–E010 — Prior reconciliation and blocked Replit attempts

See preceding entries in this file. They document the repeated Replit quota/runtime-access failures, credential boundary, local-network failure, and the requirement not to confuse an acknowledged background task with a real launch.

## E011 — Canonical GitHub Actions fallback successfully crossed preflight and entered the real run

- Current `main` was refreshed at commit `27de9d9ac8fef8c462fe3d7ce4613ef99f7708b8`, whose intentional change triggers the existing `Apex Canonical Runtime Proof` workflow using the normal UI defaults: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`.
- The workflow is explicitly the real canonical **Boss → Right-hand → Investigator** runtime, with PostgreSQL and Redis service containers. It launches the actual API and submits the same discovery-first research request shape rather than a mock or seeded target.
- The updated workflow accepts the repository's supported generic Groq aliases as fallback to the role-specific credentials, so the available configured testing credentials can satisfy the role preflight without changing the research architecture. fileciteturn47file0L2-L2
- Run `40181562329`, workflow run #10, started on `main` at `09:39:43Z`. Its credential preflight completed successfully, proving the required model-role/search credentials were available to the runner without exposing their values. fileciteturn49file0L2-L2
- Build completed successfully at `09:40:49Z`; canonical Apex schema initialization completed successfully at `09:40:52Z`; isolated operator authentication completed successfully immediately afterward. fileciteturn66file0L2-L2
- At the latest checkpoint, the actual `Run canonical API and one discovery-first case` step is **in progress**. This is the first ChatGPT-controlled execution that has demonstrably reached the real Apex launch/research phase instead of stopping during setup. fileciteturn67file0L2-L2
- No card is counted yet. The acceptance gate remains strictly unchanged: the workflow must finish and its uploaded runtime evidence must prove a durable admitted card plus source evidence and API projection retrieval.

## Continuation protocol

Continue appending chronological checkpoints. For the live run record: capture final job status, launch/job IDs, discovery trajectory, model-visible prompts/completions and structured actions where the runtime exposes them, tool requests/results, source URLs and observed evidence, provider failures/reassignments, Right-hand review, Boss dispositions, admission gates, durable evidence IDs, card IDs, API projection, and uploaded artifacts. Do not claim hidden chain-of-thought. Do not claim a card until durable evidence and projection are independently verified.

## E012 — First real run failed before any card; fixes committed and retry launched

- Workflow run [40181562329](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40181562329) ended **failure**. Its canonical launch returned job ID `0b1059f6-c4f2-4cf1-8da0-d4c1910f17aa`; the job became terminal at `2026-10-25T09:48:59Z` with status `failed`, progress `3/4`, outcome `incomplete`, zero inserted records, and no materialized card. Artifact `apex-canonical-runtime-proof` (ID `12595045568`) was downloaded and inspected.
- The real control path ran: Groq Boss and Right-hand responses completed on `openai/gpt-oss-120b`; Investigator capability was `groq-investigator-1`. Observable discovery yielded 5 searches, 6 lead URLs from a successful parallel search, one successful external page fetch, one failed page fetch, zero model findings, zero parsed candidates, and the API card projection returned an empty list. Therefore the result is not an accepted card and is not counted as success.
- Failure evidence: the Investigator repeatedly returned invalid `browser_fetch` provider contracts (6 action-contract failures reported in discovery health), one search contained a malformed bare `site` filter, and the final episode threw during prompt preparation (`turn_preparation / prompt_composition`, error digest `f4d7b51db15c0643`; canonical job digest `3349d8d430370eee`). The runtime correctly refused to fabricate a research action or card.
- Corrective commits on `main`: `62669e530a81c580d4c321ca654926fdf3c76066` adds a provider-specific contract-repair message using only browser providers actually configured in the runtime; `58fe2b01ed39c0698adde8061f5ada8041724429` adds a regression test; `cff5767e5ec4aa9210a99852b8ca2a8637014b01` adds bounded recovery if rich intelligence context cannot be formatted; `fb25f550aba690ca687abc84fab498fc41969d90` triggers the retry at standard UI-default settings. Evidence/admission criteria were not relaxed.
- Retry workflow [40183010170](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40183010170), job ID `121137852230`, is pinned to commit `fb25f550aba690ca687abc84fab498fc41969d90`. Its role-credential preflight passed and it reached application build; the actual research launch and persisted-card verification are still pending at the time of this entry.

**Status remains unmet.** A card is not credited until the follow-up run proves a real persisted card ID, source evidence IDs/URLs, and matching retrieval from the same run's API projection. This isolated GitHub Actions database is explicitly not the user's persistent Replit database.

## E013 — Mainline syntax failure found and repaired before runtime

- Workflow [40186105418](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40186105418) failed API typecheck at `agentic-web-research-core.ts:3699`: an unescaped literal quote in the discovery targetability guidance broke the TypeScript string. The run never reached API build or launch.
- Fixed the malformed literal on `main` in commit `3cb94484e6071f0dc151c6d13848f31516788e08`; a subsequent mainline repair simplified the prose to avoid quoted delimiters in `376a99b08efd5e2ab2fc40a3745d7dbecaa0ca78`, and `315e2a0faa29ef30d3dfb0f0044e3948f91c4413` added prompt-recovery/generic-label regression coverage.
- API Build and Atlas CI subsequently passed on `315e2a0faa29ef30d3dfb0f0044e3948f91c4413`. The syntax defect is closed; it was not evidence of a card.

## E014 — Real launch now fails at Groq Boss token-window capacity, before discovery

- Canonical workflow [40186219574](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40186219574) compiled and launched the real UI-default request on isolated PostgreSQL/Redis. Job `c497440d-3b85-499a-9501-6e15ae79b300` failed in the Boss control phase with `upstream_token_window_wait_exceeded`; zero records, findings, or cards were admitted. The artifact and job log show a terminal failure, not a successful empty result.
- Added bounded token-window recovery in commit `354de95c262ec9bbecd3b2c2fdfdadc3207cc1dd`: wait bound raised to 120 seconds within the existing 180-second Boss deadline, and regression coverage exercises a 46-second reset plus fail-closed behavior beyond 120 seconds. The API Build job passed on this commit.
- A follow-up real run [40186435053](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40186435053), pinned to `ad16eb0a7414d2d6ec676dabb911689c75e79d55`, still failed immediately at Boss with the same token-window error, indicating the upstream reset window exceeded the new 120-second bound. Its job `223cdebb-ca14-44fd-ae30-ce110ca9be03` inserted zero records and returned empty trace/entities/dashboard projections. The source correctly did not rotate to Investigator or fabricate findings.
- The workflow runner exposes one configured Boss credential and no populated numbered Boss credential aliases; secret values are not recorded. A fresh retry must occur after the upstream token window resets, or the secure runtime must have an additional valid Boss credential configured. Do not put secret values in GitHub source, audit text, workflow inputs, or logs.
- The isolated workflow database remains separate from the Replit database. Acceptance remains unmet until a real card is persisted and its supporting source evidence and matching UI/API projection are verified.

