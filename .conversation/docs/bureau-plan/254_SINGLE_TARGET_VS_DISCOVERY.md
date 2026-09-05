# Volume 254 — ADR: Single-Target Dig vs Discovery-First

## Decision

| Mode | When | Discovery agent | Template farm | Dig |
|------|------|-----------------|---------------|-----|
| **Single-target** | Known `entityId` | **Off** | Off | Full-circle dig on that id |
| **Discovery-first** | Cold / grow ledger | On (unless `APEX_DISCOVERY_AGENT=0`) | Soft-retired after agent admits | Dig on admitted people |

## Rationale

Operators clicking **Dig contacts** on a person expect investigation of that person.
Running a people-hunt first wastes budget and confuses Live Desk telemetry.

## Enforcement

1. Client: `launchAtlasPipeline` defaults `discoveryFirst: false` when `singleTargetId` set.
2. API: `singleTargetId` present forces `discoveryFirst = false`.
3. Orchestrator: `singleTargetId != null` → `runSingleTargetPipeline` only.

## Env overrides

- `APEX_DISCOVERY_AGENT=0` — disable free discovery agent even in discovery-first.
- `APEX_FORCE_TEMPLATE_DISCOVERY=1` — keep templates after agent (debug).
