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

### Design evidence incorporated

The 2026 design pass deliberately follows observable-work patterns rather than generic chatbot chrome. Amazon's BrowserLiveView work emphasizes giving users a real-time view of an agent's browser session. Steel's Agent Traces couples a semantic activity timeline to the actual browser recording, while current agent tooling increasingly treats streamed tool calls, sources and structured UI state as first-class UI data rather than a monolithic text response. Vercel AI SDK 7 likewise emphasizes lifecycle callbacks, telemetry, multi-step tool/source data and interactive tool UI. citeturn11search0turn11search4

### Integrity rule

The UI is not allowed to pretend that Apex opened a page, issued a query, or found a source when the backend did not record that event. Animation is presentation of real telemetry, not a substitute for telemetry. Hidden model reasoning remains private; the user sees observable actions, evidence, sources, state transitions, and concise adaptive narration.

### Browser-level audit and regression repair — 2026-08-31

Before adding browser automation, the old and new Bureau stages were compared directly against the existing Reactor/mobile specification. The comparison found two real regressions in the first semantic rewrite:

1. the new compatibility adapter ignored the mobile `onEdgeSwipe` callback, which would have broken the existing right-swipe/edge-to-history behavior;
2. the live `/api/ingest/bureau-events` mapper discarded explicit `query`, `prompt`, `inputSummary`, `sourceUrls`, `links`, evidence counts, and adaptive right-hand narration, meaning the new theatre could become visually sparse even when the backend had recorded useful telemetry.

Both were fixed before the browser gate: live Bureau events now preserve the research payload needed by the theatre, the semantic event contract carries adaptive narration, the compact workstage restores horizontal swipe delegation, and explicit query telemetry is passed through without inventing a target-name query. The right-hand note is rendered as a concise operator-facing research note; it is not hidden chain-of-thought.

A real Playwright browser gate now exercises the actual Reactor components in an isolated Vite HTML entry at desktop (1440×1000), tablet (1024×900), and phone (390×844) widths. The fixture contains event-backed search, page-fetch, registry and identity-evidence states, so the browser-like theatre is exercised rather than merely checking an empty shell. The gate checks rendered DOM, horizontal overflow, the no-fabrication strings, the adaptive right-hand note, and mobile swipe delegation, and stores screenshots as CI artifacts. Vite supports direct multi-page HTML entries in development, which makes this isolated component inspection a clean way to test the theatre without requiring unrelated application routes. citeturn10search2turn10search4

### Browser evidence observed

The first browser pass exposed two genuine issues rather than being waved through:

- the full application route has a pre-existing `entities.tsx` duplicate-import error (`Loader2` and `TargetIcon`) in `main` as well as this branch. It does not prevent the isolated Reactor fixture from rendering, but it means the full `/reactor` route should not yet be described as globally clean;
- the first mobile fixture pass did not exercise compact mode because the fixture had not passed `compact=true`. That test was corrected so the phone viewport actually uses the compact workstage and verifies the swipe callback.

The corrected browser run completed successfully: **3/3 browser tests passed** at desktop, tablet and mobile; the Vite build also passed; source and Reactor integrity contracts passed. The uploaded screenshots were manually inspected. Desktop and tablet maintain the command-centre hierarchy without horizontal overflow; mobile compresses the stage, preserves the current-action browser surface, keeps the right-hand note readable, and retains the under-the-hood feed. The mobile screenshot also shows the swipe fixture state changing to `next`, proving that the compatibility callback is live rather than merely present in source.

The screenshots also exposed a small semantic copy issue that is now a follow-up item: the browser surface currently labels a page-fetch's URL area as `ACTUAL SUBMITTED QUERY` when no query exists. The data itself is truthful—the UI explicitly says no query was recorded—but the label should become method-aware (`Recorded search query` for search, `Observed page URL` for browser/page research). This should be fixed in the next surface refinement rather than masked in the test.

### Important architectural caveat

This slice intentionally centralizes the visual workstage, but the compatibility adapter is a large simplification of the previous Bureau scene engine. Before merging, compare the old and new stage behavior against the existing mobile flow, provider-health indicators, swipe/history behavior, and any route-specific controls. If any of those are lost, restore them around the shared Reactor surface rather than reintroducing a second renderer.

### Next gates

1. Make the browser surface labels method-aware so a page visit is not described as a search query.
2. Fix the pre-existing `entities.tsx` duplicate imports as a separate frontend hygiene change; do not hide it with a Vite transform.
3. Add normalized fixtures for search, browser, registry, domain, graph, LLM, rejection, contradiction, provider failure, and empty-result events.
4. Exercise real Bureau events from the provider-backed runs already completed and compare displayed queries/URLs/results with telemetry byte-for-byte where possible.
5. Add evidence/card visualization, network/asset map surfaces, and wealth-estimate presentation with explicit provenance and uncertainty.
6. Only after those checks, decide whether this branch should merge or whether the theatre should be integrated more conservatively into the existing stage engine.
