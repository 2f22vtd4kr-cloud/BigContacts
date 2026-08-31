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

The next implementation gate is now landed on the `feat/reactor-live-theatre` branch.

### Implemented

- `reactor-live-surface.tsx` is now the primary visual renderer for the Bureau workstage.
  - current observable action receives the dominant visual area;
  - recent actions form an under-the-hood activity feed;
  - search/page work uses an Apex-owned browser metaphor rather than impersonating Google;
  - actual submitted queries can be replayed character-by-character as presentation only;
  - no query is displayed when the Bureau did not record one;
  - source cards are built only from event-backed URLs;
  - live/source/evidence counters are derived from observed events.
- `bureau-ops-stage.tsx` now acts as a compatibility adapter instead of owning a second scene engine.
  - legacy telemetry is normalized into the shared Reactor event contract;
  - stale active telemetry is demoted rather than shown as LIVE;
  - target-name query fabrication was removed;
  - synthetic Google/search URLs are no longer produced by the workstage;
  - desktop and compact/mobile views share the same semantic event renderer.
- `scripts/check-reactor-live-integrity.mjs` was updated to enforce the new contract, including explicit-query provenance and regression checks against target-name query fabrication.

### Design evidence incorporated

The frontend direction was checked against current 2026 patterns rather than copied wholesale from another product. Apollo's current product documentation emphasizes customizable information layouts and activity-rich record surfaces, while its AI Research product treats research as a reusable, inspectable field rather than a chat transcript. Current Vercel AI UI guidance similarly treats tool invocations and streaming states as first-class UI parts. Recent 2026 Behance work shows continued movement toward dense but calm agentic dashboards, strong hierarchy, and operational workflow visibility. Apex retains its dark bureau identity but applies these patterns to research theatre rather than CRM workflows.

### Integrity rule

The UI is not allowed to pretend that Apex opened a page, issued a query, or found a source when the backend did not record that event. Animation is presentation of real telemetry, not a substitute for telemetry. Hidden model reasoning remains private; the user sees observable actions, evidence, sources, state transitions, and concise adaptive narration.

### Validation status

Source changes are committed, but this connector turn does not provide a local Node/Vite execution environment. The integrity script has been updated for the new architecture; the branch still requires repository-runtime execution of the integrity script, TypeScript/Vite build, and responsive browser checks before this slice is called production-validated.

### Next gates

1. Run the integrity script and Vite build in the repository runtime.
2. Exercise desktop and mobile Reactor with real Bureau events from the provider-backed runs already in progress.
3. Capture responsive screenshots at desktop, tablet, and phone breakpoints and fix actual layout defects.
4. Add backend-normalized fixtures for search, browser, registry, domain, graph, LLM, rejection, and contradiction events.
5. Then implement the next master-plan slice: evidence/card visualization, network/asset map surfaces, and wealth-estimate presentation with explicit provenance and uncertainty.
