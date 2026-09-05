# Volume 15 — Frontend / Responsive Audit

**Status:** active engineering specification

## 15.1 Scope

This volume audits the actual `artifacts/apex-finder` application rather than the standalone reactor mockups in `artifacts/reactor-preview`.

The frontend is a Vite/React application. Routing currently exposes `/reactor`, `/search`, `/profiles`, `/network`, `/jobs`, `/research`, and supporting workspace pages. The application shell is implemented in `src/components/layout.tsx` and the reactor surface in `src/pages/reactor.tsx`.

## 15.2 Current findings

### Desktop shell

- Desktop navigation is explicitly collapsed below the `md` breakpoint and defaults to a 250px rail on desktop.
- The main content uses `min-w-0`, which is important for preventing flex children from forcing horizontal overflow.
- The desktop navigation collapse control is edge-triggered and intentionally hidden until the pointer reaches the left edge.
- The header uses a horizontally scrollable status/action row on narrow widths.
- The application shell uses `100dvh`/`100svh` and safe-area insets, which is appropriate for mobile browser chrome.

### Mobile shell

- Mobile navigation becomes an overlay drawer below `md`; the drawer is capped at `min(300px, 86vw)`.
- The mobile header deliberately puts the menu control first and makes the status/action strip horizontally scrollable.
- The page shell uses safe-area padding and `overflow-x: clip`.
- Text in the page shell uses aggressive wrapping to prevent long names/URLs from widening the viewport.

### Reactor surface

The production reactor already contains real mobile/desktop-specific components and interaction logic, including pointer-based scheme panning, a minimap/zoom model, live-only node illumination, a Live Desk, and recent DigSpan telemetry.

However, the reactor source still contains **presentation concepts that look like a predetermined pipeline**. In particular, the mobile surface defines `MOBILE_PHASES` with seven named stages (TARGET ACQUISITION, PUBLIC REGISTRIES, BROAD DISCOVERY, AI EXTRACTION, VECTOR SYNTHESIS, REACTOR CORE, EVIDENCE REVIEW) and renders those as a fixed rail. This is acceptable only if it is clearly presented as a visual vocabulary and never as the actual research trajectory.

The canonical Bureau contract says the model owns the next research action. Therefore the UI must derive the active trajectory from observed `DigSpan`/Bureau events, not from a predeclared sequence.

### Standalone reactor prototypes

`artifacts/reactor-preview` contains multiple QA/prototype HTML surfaces. These are useful visual references but are not equivalent to the production React application. They must not be treated as proof that the deployed frontend renders correctly.

## 15.3 Responsive acceptance contract

Every future UI change affecting the reactor must be checked at at least:

- 320 × 568 — small phone
- 390 × 844 — modern phone
- 768 × 1024 — tablet / desktop breakpoint boundary
- 1280 × 800 — normal laptop
- 1440 × 900 — large desktop

The following must hold:

1. **No horizontal document overflow** on the tested viewport.
2. **No clipped primary controls** — Launch, Pause, Resume, Stop, menu, and target controls must remain reachable.
3. **Safe-area aware mobile chrome** — content must not hide behind browser/system insets.
4. **Touch targets** — primary interactive controls should remain comfortably tappable on mobile.
5. **Live state truthfulness** — the UI must not show a live activity state from stale/zombie telemetry.
6. **Trajectory truthfulness** — fixed phase labels must not be presented as the actual order or required length of a Bureau run.
7. **Evidence visibility** — the user must be able to reach the active evidence/contact surface without requiring desktop-only interactions.
8. **Reduced motion** — `prefers-reduced-motion` must disable decorative animation without disabling information or controls.
9. **Long strings** — names, URLs, source titles, provider identifiers, and tool arguments must wrap or scroll without widening the page.
10. **Desktop density** — the right Live Desk must not consume the research surface when idle.

## 15.4 Required browser-level QA

Static source inspection is not enough. The release gate should eventually launch the actual Vite application and capture browser screenshots at the five viewport sizes above. The test should inspect both:

- `document.documentElement.scrollWidth <= window.innerWidth`
- visibility/reachability of the primary controls

and save screenshots for idle, live search, live visit, paused, and provider-offline states.

A screenshot of a standalone HTML prototype does not satisfy this requirement.

## 15.5 Next implementation gate

The next frontend implementation should remove any ambiguity between **visual grouping** and **actual trajectory**. The UI should label fixed groups as categories/lenses if retained, while the live trajectory should be generated exclusively from observed Bureau events/DigSpans.

The frontend should never manufacture a step count merely because a visual component has a fixed number of sections.

## 15.6 Relationship to Bureau architecture

The frontend is a consumer of Bureau state. It must not become an orchestration layer.

Backend owns:

- model-selected research actions;
- tool execution;
- evidence and provenance;
- identity integrity;
- stopping/budget decisions.

Frontend owns:

- truthful presentation of current state;
- navigation;
- interaction controls;
- visualization of observed trajectory;
- evidence inspection.

This separation is part of the Apex Atlas acceptance standard.
