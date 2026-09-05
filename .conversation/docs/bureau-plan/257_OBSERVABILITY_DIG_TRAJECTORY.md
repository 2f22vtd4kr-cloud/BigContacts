# Volume 257 — Observability: Dig Trajectory

## Channels

| Channel | Sink | Use |
|---------|------|-----|
| DigSpan | In-memory ring (`dig-span.ts`) | Reactor recentSpans; status plane |
| Bureau live log | Redis list | SSE / Live Desk story |
| Job log | `appendJobLog` | atlas-status eventLog |

## Agent names

- `investigator` — target contact dig
- `discovery` — free discovery people hunt
- stage spans — orchestrator `setAtlasTelemetry`

## Clear on stop

`clearDigSpansForJob` on atlas-stop / lock clear so the next dig does not show stale trajectory.

## Debug

Volume 247 (ReAct trajectory debugging) remains the method guide.
Trajectory is for operators and postmortems — not a second controller of dig.
