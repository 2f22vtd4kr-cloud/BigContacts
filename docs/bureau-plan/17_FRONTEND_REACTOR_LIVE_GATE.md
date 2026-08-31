# Frontend Gate — Reactor Live Evidence Surface

Status: active implementation gate

## Purpose

Reactor Live is an analyst-facing visualization of what the Bureau actually did. It is not a cinematic reconstruction of an imagined trajectory.

The UI may animate recorded tool input, source loading, result arrival, and semantic transitions. It must not manufacture a search query, URL, result, or private model reasoning merely because the screen would otherwise look empty.

## Canonical event flow

`Bureau event → normalized live model → semantic scene → responsive surface`

The event remains authoritative. The renderer may classify an observed action into a visual method such as search, browser, registry, domain, social, graph, LLM, or case review, but it cannot create evidence that is absent from the event.

## Browser-style scene

When a real search/browser event contains an explicit query, the desktop surface can present a browser-like frame containing:

- recorded URL;
- recorded research query;
- recorded result summary;
- recorded tool input, when available;
- source links actually attached to the event.

If the event contains no explicit query, the UI says that no explicit query was recorded. It must not silently substitute `target + contact email phone` or another synthetic query.

## Semantic scene

Not every Bureau action is a browser action. Registry lookups, domain resolution, graph operations, social investigation, evidence review, and model decisions should have distinct visual language. The user should understand *what kind of work happened* without being told that every action was web browsing.

## Desktop

Desktop Reactor should eventually combine:

1. the existing spatial Reactor topology;
2. the live semantic event stream;
3. a detailed active-scene viewport;
4. source/evidence affordances;
5. a compact provenance/status rail.

The topology is explanatory, not a claim that every investigation follows a fixed route.

## Mobile

Mobile Reactor should preserve the same event semantics while collapsing the topology into a chronological, thumb-friendly live stream. The user should be able to jump between the current action, the latest evidence, and completed research without losing the research state.

## Integrity rules

- No hidden chain-of-thought exposure.
- No fabricated query.
- No fabricated URL.
- No fabricated source result.
- No organization contact presented as a direct personal contact without evidence.
- No animation may imply a tool ran when telemetry does not show that tool.
- Historical events must remain distinguishable from currently active events.
- A stale backend heartbeat must not be represented as live work.

## CI gate

`scripts/check-reactor-live-integrity.mjs` is a source-level regression contract. It verifies that the normalized model, live surface, and legacy Bureau Ops surface retain the evidence-aware boundaries above.

This gate is intentionally modest: passing it proves source invariants, not that the visual experience is aesthetically complete or that a provider-backed Bureau run produced good research. Those remain separate acceptance gates.

## Next implementation increments

1. Wire the semantic live surface directly into the desktop Reactor without duplicating event state.
2. Wire the same surface into the mobile Reactor flow.
3. Remove remaining legacy synthetic-query fallbacks from operator-facing scenes.
4. Add event-to-scene provenance indicators for every rendered URL/query.
5. Add Playwright viewport tests for desktop and mobile scene transitions.
6. Validate the surface against real provider-backed Bureau event logs.
