---
name: Atlas run monitoring
description: Durable safety rule for bounded Atlas runs and truthful stalled-job telemetry.
---

Atlas runs can remain marked `running` while a provider-backed discovery source is stalled and the phase message does not change. A bounded run must be monitored for message/progress freshness, not only the active-job lock. Cancellation must be cooperative: clearing the active slot has to prevent the worker from entering the next phase or rewriting the job as active.

**Why:** A controlled re-enrichment run remained on the same Phase 1 discovery step for more than two minutes while the Reactor correctly showed active status; without a freshness check, the UI made a hung provider call look like productive work.

**How to apply:** Keep Atlas manual and bounded. Record the last progress/message change, surface stale-step age in status, and provide a safe cancellation path before allowing another provider-heavy phase to continue. Check active-job ownership at phase, source, and entity boundaries; provider failures should remain fail-closed and visible in the run summary.