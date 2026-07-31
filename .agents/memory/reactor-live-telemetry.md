---
name: Reactor live telemetry
description: Durable rules for representing Atlas execution truthfully in the Intelligence Reactor UI
---

Atlas uses numbered checkpoints 0 through 10, so the UI should present eleven checkpoint states while retaining 10 as the phase maximum. Generic job `progress`/`total` cannot also represent the current entity batch: phase state, current entity names, and entity range/total must be separate structured fields.

**Why:** The orchestrator can overwrite generic job progress with bounded entity-batch counters while the overall phase is unchanged. Inferring one from the other makes the reactor show misleading phase numbers or entity activity.

**How to apply:** Keep phase state, entity-batch state, and live rod endpoints as distinct inputs. Historical sessions are output records, not reactor activity; idle mode must not animate waves or light synthesis rods. Feedback routes should light only when a live endpoint reports activity.