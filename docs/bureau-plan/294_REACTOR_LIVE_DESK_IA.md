# Volume 294 — Reactor Live Desk Information Architecture

## Primary panes

1. **Trajectory / DigSpan** — what ran (tool, agentName, target, NOW/done)
2. **Right-hand narration** (optional) — adaptive prose, not ATLAS_EVENT dumps
3. **Card routes** — ContactSurface bound by entityId
4. **Scheme** — live tools mode by default; full map optional; pan/zoom/minimap

## Idle rules

- No fake LIVE from stale Redis events
- Clear DigSpans on stop
- Scoreboard strip may remain (honesty gated by integrity)

## Anti-patterns

- Fixed “step N of 6” plan language
- Scheme lighting all catalog tools
- Pause/Stop clipped under browser chrome
