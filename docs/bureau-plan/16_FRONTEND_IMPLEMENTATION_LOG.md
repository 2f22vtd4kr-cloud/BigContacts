# Frontend Implementation Log

## 2026-08-31 — Reactor Live semantic foundation

The first implementation slice of the frontend master plan is now in the application source.

### Added

- `artifacts/apex-finder/src/lib/reactor-live-model.ts`
  - explicit semantic event contract;
  - method classification for search/browser/registry/domain/social/graph/LLM/case;
  - research-text sanitisation;
  - source URL validation/deduplication;
  - explicit-query extraction;
  - hard rule against inventing a query from a target name;
  - renderability gate.
- `artifacts/apex-finder/src/components/reactor-live-surface.tsx`
  - browser-like renderer for actual search/browser events;
  - semantic renderer for non-browser research actions;
  - source links and status rendering;
  - responsive compact mode for narrow layouts;
  - empty state that explicitly says evidence has not arrived instead of simulating work.

## 2026-08-31 — Reactor Live theatre integration

The implementation is on the `feat/reactor-live-theatre` branch / draft PR #49. It has intentionally not been merged yet: the frontend build is green, but a real browser screenshot pass is still required before calling the visual work production-ready.

### Implemented

- `reactor-live-surface.tsx` is the semantic research-theatre renderer used by the Bureau workstage.
  - current observable action receives the dominant visual area;
  - recent actions form an under-the-hood activity feed;
  - search/page work uses an Apex-owned browser metaphor rather than impersonating Google;
  - actual submitted queries can be replayed character-by-character as presentation only;
  - no query is displayed when the Bureau did not record one;
  - source cards are built only from event-backed URLs;
  - live/source/evidence counters are derived from observed events.
- `bureau-ops-stage.tsx` is now a compact compatibility adapter into the semantic theatre.
  - legacy telemetry is normalized into the shared Reactor event contract;
  - stale active telemetry is demoted rather than shown as LIVE;
  - target-name query fabrication was removed from this renderer;
  - synthetic Google/search URLs are not produced by the workstage;
  - the same event contract drives compact and desktop-capable rendering.
- `scripts/check-reactor-live-integrity.mjs` enforces explicit-query provenance, event-backed sources, and regression protection against target-name query fabrication.
- `.github/workflows/frontend-responsive.yml` now runs both the source contracts and a real `pnpm`/Vite frontend build in CI.

### Current CI evidence

On the current branch head, the repository-runtime frontend job has completed the source contract successfully and the Apex Finder Vite build successfully. The dedicated no-fabrication contract also passes. This proves source/build integrity, not visual quality.

### Design evidence incorporated

The 2026 design pass deliberately follows observable-work patterns rather than generic chatbot chrome. Amazon's April 2026 BrowserLiveView work emphasizes giving users a real-time view of an agent's browser session. Steel's 2026 Agent Traces couples a semantic activity timeline to the actual browser recording, while Honeycomb's Agent Timeline unifies LLM calls, tool invocations, handoffs and failures into one chronological investigation surface. Current Behance work such as Novair's August 29, 2026 agent-orchestration dashboard emphasizes command-centre hierarchy, always-visible health metrics, consistent running/success/failure states, and a responsive hierarchy that survives mobile compression. Apex keeps its existing dark bureau identity, but uses these patterns to make research legible rather than turning Reactor into a chat transcript. citeturn8search8turn10search3turn10search0turn13search1

### Integrity rule

The UI is not allowed to pretend that Apex opened a page, issued a query, or found a source when the backend did not record that event. Animation is presentation of real telemetry, not a substitute for telemetry. Hidden model reasoning remains private; the user sees observable actions, evidence, sources, state transitions, and concise adaptive narration.

### Important architectural caveat

This slice intentionally centralizes the visual workstage, but the compatibility adapter is a large simplification of the previous Bureau scene engine. Before merging, compare the old and new stage behavior against the existing mobile flow, provider-health indicators, swipe/history behavior, and any route-specific controls. If any of those are lost, restore them around the shared Reactor surface rather than reintroducing a second renderer.

### Next gates

1. Run a real browser screenshot pass at desktop, tablet, and phone widths against representative live-event fixtures.
2. Verify the Reactor surface in the actual desktop route; confirm the page does not force the compact/mobile presentation on wide screens.
3. Exercise real Bureau events from the provider-backed runs already in progress and compare displayed queries/URLs/results with telemetry byte-for-byte where possible.
4. Add normalized fixtures for search, browser, registry, domain, graph, LLM, rejection, contradiction, provider failure, and empty-result events.
5. Add evidence/card visualization, network/asset map surfaces, and wealth-estimate presentation with explicit provenance and uncertainty.
6. Only after those checks, decide whether this branch should merge or whether the theatre should be integrated more conservatively into the existing stage engine.
