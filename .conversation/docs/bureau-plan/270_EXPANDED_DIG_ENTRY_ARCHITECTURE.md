# Volume 270 — Expanded Dig Entry Architecture

*Expands vol 251 to ADR depth without deleting the short map.*

## Why entry points are architecture

Every Dig CTA is a **promise** about process: free ReAct, one identity, promote ownership, no discovery-first surprise. Inconsistent payloads reintroduce the dual-brain problem (UI says dig, API runs templates + MCTS + web-osint).

## Canonical client builder

`launchAtlasPipeline` in `artifacts/apex-finder/src/lib/launch-atlas.ts`:

- `singleTargetId` ⇒ `discoveryFirst: false`, `targetCount: 1`, `researchLimit: 1`, `broadCategories: 0`
- Optional `researchDepth` from operator controls
- Integrity soft-note from `/api/healthz` without blocking

## Canonical server guard

`POST /api/ingest/atlas-run`: if `singleTargetId` valid, force `discoveryFirst = false`. Orchestrator routes to `runSingleTargetPipeline`.

## CTA matrix (normative)

| CTA | May call | Must not call |
|-----|----------|---------------|
| Profile Dig contacts | `launchAtlasPipeline({ singleTargetId })` | `useRunResearch` MCTS-only as primary; `web-osint-enrich` as primary |
| Entities Dig | same | Bulk discovery-first |
| Dig selected | sequential singleTargetId ≤5 | Parallel 5 digs same lock without queue |
| Launch discovery-first | full body with discoveryFirst true | singleTargetId mixed in same job |

## Post-idle contract

Poll atlas-status → rehydrate entity → refresh surfaces → optional evidence panel open → scoreboard refreshKey. Partial results after Stop remain valid evidence (vol 259).

## Observability

DigSpans investigator on live steps; telemetry `entityId` bound for Live Desk ContactSurface fetch.

## Test posture

`scripts/check-no-force-dig.sh` on every dig-related change. No entry point may reintroduce force hop controllers.
