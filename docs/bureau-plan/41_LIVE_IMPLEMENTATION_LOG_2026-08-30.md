# Apex Atlas — Living Implementation Log

**Date:** 2026-08-30

This file records implementation evidence that changes the active 40K engineering specification. It is append-only in intent: new findings should be added rather than silently rewriting the history.

## 2026-08-30 — Live 10-target audit exposed cross-target provider contention

### Observation

The discovery-first live audit launched 10 independent discovery slots. The runtime immediately exhausted the Gemini quota (HTTP 429) and then attempted fallback providers. NVIDIA `nvidia/nemotron-3.5-lightning-30b-a3b` was selected for agentic work but concurrent calls timed out. The runtime's provider circuit was module-global, so an all-provider failure in one slot could open a 60-second circuit that affected unrelated target slots.

The resulting audit produced model-selected web searches but no durable entities/source-backed candidates. The failure therefore was **not** evidence that model-led discovery was inferior. It was a transport/orchestration failure: concurrent research slots were contending for shared provider capacity and sharing failure state.

### Causal classification

- **F15 — provider degradation:** Gemini quota exhaustion and NVIDIA latency were real provider conditions.
- **F12 — state contamination:** provider circuit state was shared across independent target investigations.
- **F16 — orchestration regression:** resource contention could prevent otherwise independent research trajectories from progressing.
- **Not an F6/F7 discovery judgment failure:** the captured searches included substantive hypotheses such as charitable-foundation/founder and private-equity acquisition queries. The run did not justify replacing model-led discovery with scripted queries.

### Architectural decision

Provider failure protection must be scoped as **resource control**, not as a research policy.

The agentic runtime now uses a bounded provider-decision semaphore (default concurrency: 2) instead of a module-global cross-target failure circuit. Provider decision timeout is 30 seconds so healthy NVIDIA responses are not discarded solely because of an overly aggressive 18-second ceiling. The model retains ownership of the research action; the semaphore only controls concurrent transport pressure.

### Required invariants

1. One target's provider failure must not suppress another target's provider decision.
2. A provider outage must not inject a fixed query, source, hop or recovery playbook.
3. Ten-target evaluation remains a ten-target evaluation; scheduler concurrency may be lower than target count.
4. Provider telemetry must identify provider, model, status/failure class and latency without exposing credentials.
5. A live audit that produces zero evidence because providers were unavailable must be classified as **provider/runtime inconclusive**, not as a research-quality loss.
6. Repeated builds must be idempotent; runtime hardening cannot be a one-shot mutation that breaks the second build.

### Repository implementation

- `scripts/apply-agentic-concurrency-hardening.mjs` applies the runtime guard before API build and is idempotent.
- `artifacts/api-server/package.json` runs that hardening before `build.mjs`.
- The change is committed on `main` and must be validated by the live audit workflow.

### Next validation

Repeat the real 10-target discovery-first batch after the provider-readiness gate and concurrency fix. Preserve the complete trajectory and compare the resulting cards against the independent baseline. Do not interpret improved completion rate as a quality win unless identity, provenance and contact-route quality also improve.
