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
