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

### Architectural significance

Reactor Live is now being implemented as an event renderer rather than a scripted animation layer. A browser scene may only display an explicit query/URL carried by a Bureau event. If the backend did not record a query, the frontend displays that absence instead of fabricating one.

This is intentionally compatible with the existing `useBureauLiveDesk` event stream and the existing `bureau-ops-stage` visual system. The next integration step is to replace legacy scene-local heuristics with this shared semantic model and feed it the normalized Bureau event envelope.

### Validation status

The repository connector permits source inspection and commits but does not expose a local Vite/TypeScript execution environment in this turn. Therefore this change is **source-level implementation**, not a claim of a successful production build. Build validation must be run in the repository runtime before calling this slice complete.

### Next implementation gates

1. Wire `ReactorLiveSurface` into the existing desktop Reactor route.
2. Wire the same event model into the mobile Reactor flow.
3. Replace synthetic query fallback in `bureau-ops-stage.tsx` with `explicitResearchQuery`.
4. Add a backend-normalized event fixture set covering search, browser, registry, domain, graph, LLM and rejection events.
5. Run the actual Vite build and browser responsive checks.
6. Only then proceed to wealth/map/card visualisation.
