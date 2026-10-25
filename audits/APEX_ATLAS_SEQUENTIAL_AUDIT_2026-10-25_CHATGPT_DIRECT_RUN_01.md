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

## E012 — Canonical run #10 completed, but discovery failed before any candidate/card

- **Run:** [GitHub Actions run #10](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40181562329), job **0b1059f6-c4f2-4cf1-8da0-d4c1910f17aa**, build revision **27de9d9ac8fef8c462fe3d7ce4613ef99f7708b8**.
- **Evidence artifact:** **apex-canonical-runtime-proof** (artifact ID **12595045568**, SHA-256 **4f63a0f4289d62bab7f6af5987c39f54e88d186473223d198854ab47e976dd6f**). It contains launch/job snapshots, the sanitized API log, entity count, and Atlas trace. No credentials were included.
- **Actual result:** launch was accepted and the real Boss → Right-hand → Investigator path executed. Job terminal state was **failed / incomplete**, progress 3/4, inserted=0, findings=0, and entities=[]. No card was created. The canonical acceptance condition remains unmet.
- **Observed actions:** 5 discovery searches were attempted, 6 independent search-result lead URLs were surfaced in a parallel search, and 1 public page was fetched successfully. A second page fetch through Scrapfly failed. Search leads did not become claim-grade candidate findings. One search was correctly blocked before provider execution because it contained a malformed bare site:. filter.
- **Control-plane output:** Right-hand explicitly rejected the proposed state Secretary-of-State/shareholder direction because the runtime had no verified callable adapter for those ownership fields and the public disclosure assumption was unsupported. This was a defensible evidence-quality decision, not a quota failure. The run then continued against the base mission, but the initial queries used the generic case label “Case Co” rather than a concrete researched business/sector/geography; this is a discovery-quality defect to address after the prompt-runtime fix.
- **Action-contract defect:** repeated Investigator turns returned invalid browser_fetch provider arguments, causing bounded parse recovery to stop those trajectories. The artifact does not contain the raw model completions for those rejected turns, so the exact invalid value is not asserted here. The provider contract in code correctly requires one of the configured browser providers; do not silently rewrite a model-selected provider or weaken outbound validation.
- **Confirmed root cause for terminal runtime exception:** the error summary was **unexpected_exception stage=turn_preparation phase=prompt_composition Error, messageChars=77**. The exact 77-character message matches **Canonical Investigator critical prompt contract exceeds the provider ceiling.** in agentic-web-research-core.ts. After a successful fetch, the model-facing evidence history, pinned URL inventory, and mandatory prompt contract exceeded the prompt budget even after all existing compaction tiers. The run therefore aborted before the next model decision despite healthy API/Redis and configured research keys. Durable evidence was not deleted; prompt composition was the failure point.
- **Provider telemetry:** the API log records several Groq HTTP 400 json_validate_failed attempts that later recovered, and token-window HTTP 429s that also recovered on retry. The terminal summary did not classify these as hard request-quota exhaustion; do not label this run a hard-key-quota failure.
- **Corrective change in progress:** branch **fix/investigator-prompt-emergency-budget-20261025** adds two final bounded prompt-recovery tiers. The first retains the action schema, discovery admission contract, active scope, terminal evidence gate, and a compact latest action/source URL; the final static fallback retains schema/safety/provider rules and omits only the model-facing history excerpt. Durable ledger data is untouched. A regression assertion was added to scripts/check-investigator-prompt-budget.mjs. CI and a fresh canonical run must verify this fix before it is merged or considered effective.
- **Audit coverage gap:** this CI artifact exposes prompt-length/token telemetry and action/trajectory summaries but not full model-visible prompts/completions. Hidden provider reasoning is not available and will not be fabricated. Future runs should capture visible request/response payloads to a protected run artifact with credential redaction, while keeping the tracked audit sanitized and never committing keys or unnecessary personal contact data.
