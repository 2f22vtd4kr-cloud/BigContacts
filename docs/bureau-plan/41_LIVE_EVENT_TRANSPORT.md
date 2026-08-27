# Volume 41 — Live Event Transport

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Paths

1. `onLiveStep` from agentic loop
2. `publishBureauEvent` → Redis bureau-events + optional job log `BUREAU|`
3. `scheduleBureauLiveNarration` (NVIDIA, async, rate-limited)
4. UI: atlas-status `recentSpans` + bureau-events poll + parse job log

## Requirements

- Secondary dig and discovery agentic passes pass `jobId`
- Orchestrator stages emit stage spans
- Stop clears spans for job
- Age-out: events older than policy not LIVE when idle
- At most one LIVE highlight window in UI

## Failure

Missing jobId → Reactor only sees Redis tail or nothing — looks idle while dig runs. Ticket: wire jobId on all pass entrypoints.
