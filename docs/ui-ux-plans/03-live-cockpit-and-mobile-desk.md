# Phase 3/4 Plan — Live Cockpit & Mobile Desk

## Existing work to preserve
- One canonical Reactor telemetry model.
- Desktop topology remains available.
- Mobile uses the live surface without topology.
- History is searchable and jump-to-live is supported.
- Empty, terminal, rate-limit, and reduced-motion states are explicit.

## Additional hardening
- Keep visual state transitions derived from real event timestamps/statuses.
- Do not infer tools from parent progress text.
- Do not keep topology illuminated after terminal states.
- Keep mobile event density compact while retaining source affordances.
- Treat missing telemetry as missing telemetry.

## Verification
- Idle, running, paused, done, failed, cancelled and empty-live states are all truthful.
- Mobile topology remains disabled.
- Desktop topology only lights nodes justified by recorded spans.
