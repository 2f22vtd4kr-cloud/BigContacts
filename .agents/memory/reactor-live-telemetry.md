---
name: Reactor live telemetry
description: Durable rules for representing Atlas execution truthfully in the Intelligence Reactor UI
---

Atlas uses numbered checkpoints 0 through 10, so the UI should present eleven checkpoint states while retaining 10 as the phase maximum. Generic job `progress`/`total` cannot also represent the current entity batch: phase state, current entity names, and entity range/total must be separate structured fields.

**Why:** The orchestrator can overwrite generic job progress with bounded entity-batch counters while the overall phase is unchanged. Inferring one from the other makes the reactor show misleading phase numbers or entity activity.

**How to apply:** Keep phase state, entity-batch state, and live rod endpoints as distinct inputs. Historical sessions are output records, not reactor activity; idle mode must not animate waves or light synthesis rods. Feedback routes should light only when a live endpoint reports activity.

The Reactor's quick operational summary belongs in a persistent responsive header on both desktop and mobile. It should include the current checkpoint/live detail plus real database totals, hot leads, assets, research sessions, and outreach count; the idle state must not replace those totals with zeroes.

**Why:** Operators need progress and dataset context without scrolling, and zeroing valid totals during standby makes the UI look disconnected from the actual workspace.

**How to apply:** Use compact metric chips or a two-row mobile summary, keep the pipeline visualization below, and remove duplicate footer meters once the header carries the same information. For active target work, publish a target-scoped telemetry payload with stage, tool IDs, safe prompt purpose, evidence/result counts, and review status; parse malformed payloads as absent rather than inferring activity.

The reactor route must own its scroll region: the outer routed content wrapper should be non-scrolling while the mobile flow uses the available flex height and `overflow-y-auto`. Idle mode should state that Atlas is intentionally waiting, not imply a broken or disconnected reactor.

**Why:** Nested page-level and component-level scroll containers clipped the lower mobile phases, and a visually quiet manual pipeline looked inactive without an explicit standby explanation.

**How to apply:** When changing the reactor shell or layout, preserve `min-height: 0` through the flex chain, keep the route-specific outer wrapper from competing for scroll, and show live/standby status from the actual Atlas status endpoint.