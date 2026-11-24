# Apex Atlas — Discover frontend audit and implementation handoff

## Purpose

This is the implementation record for the Discover page visual pass. It is intended to let another coding agent reproduce the frontend work without access to this browser session.

- Repository: https://github.com/2f22vtd4kr-cloud/BigContacts
- Base: `main`
- Work branch: `agent/discover-frontend-board-match-2026-11-24`
- Design reference: https://design-board-812905.netlify.app/
- Route: `/search` (rendered by `BoardDiscover`)
- Scope: Discover page composition and shared shell elements that directly affect Discover (top navigation, status placement, and shield wordmark).

## Non-negotiable guardrails

- Do not change API, database, workers, server routes, schemas, generated clients, identifiers, auth, search behavior, saved-search storage, or source-status calculations.
- Do not start the API, database, worker, bureau, or research workflows. Visual inspection must be frontend-only.
- Do not submit a search, save a sample query, or invoke any launch/research action while checking the page.
- Do not add tabs or routes. Keep the five existing primary destinations: Overview, Ledger, Discover, Connections, Reactor. Card remains a detail route, not a new tab.
- Do not copy sample data or sample status text from the board into the application. The API remains authoritative.
- Keep the legacy layout and the existing route architecture intact.
- Keep this audit updated as each implementation change is made. The code snippets below are the literal resulting implementation for the changes in this branch.

## Design direction carried forward from the supplied handoff

- Paper `#FAFAF8`, white cards, raised surface `#F3F3F0`.
- Ink `#18181A`, secondary `#55555A`, muted `#74747A`.
- Red `#C8321E`, green `#1F8A4D`, blue `#2757C6`, gold `#EDB92B`.
- Geist for interface text and Geist Mono for source metadata/figures.
- Brand mark: quartered red/gold shield, clipped to a shield silhouette, without outline or internal divider strokes.
- Desktop Discover: 500px search console, 64px gap, right rail for saved searches and source register.
- Mobile: compact header and stacked Discover content. Keep the source status truthful and visible.

## Baseline inspection

- Confirmed the source files live under `artifacts/apex-finder/` in the repository.
- `artifacts/apex-finder/src/router.tsx` already maps `/search` to `BoardDiscover`; no route change is needed.
- `BoardDiscover` already owns local saved-search storage and reads live system/registry status from the API. Those behaviors were left unchanged.
- The actual `main` branch still had the sidebar shell and outlined shield mark described in the supplied handoff; the previous Replit workspace changes were not present in GitHub.
- The supplied audit's first CSS rule was not the final effective Discover grid rule. The final effective rule was also 1.15fr/.85fr with a 36px gap, so both declarations and later duplicate overrides were checked.
- The design-board URL could not be fetched by the available browser reader in this session. The supplied Replit inspection/audit is therefore the visual reference for the exact proportions and composition. No claim is made that a new browser pixel-diff was run here.

## Change log

### Change 1 — Restore the horizontal navigation shell and replace the brand mark

Files:
- `artifacts/apex-finder/src/components/layout-round.tsx`
- `artifacts/apex-finder/src/flat-round.css`

Result:
- Replaced the sidebar/drawer shell with the existing five-item horizontal primary navigation.
- Kept the same five routes and active-route logic.
- Added a compact mobile navigation panel using the existing menu toggle and existing `NavItems`.
- Kept the real `WorkspaceStatus` component in the header; mobile displays its short status rather than hiding it or fabricating readiness.
- Replaced the outlined shield with the clipped four-color mark. `useId()` provides a unique clipPath id when multiple logo instances render.
- Removed the floating desktop/mobile status positioning so status sits in the header actions.

Literal resulting logo implementation:

```tsx
function ApexAtlasMark() {
  const clipPathId = useId().replace(/:/g, "");

  return (
    <svg className="atlas-round-brand-mark" viewBox="0 0 20 22" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipPathId}>
          <path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12V0z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        <rect width="10" height="11" fill="#C8321E" />
        <rect x="10" width="10" height="11" fill="#EDB92B" />
        <rect y="11" width="10" height="11" fill="#EDB92B" />
        <rect x="10" y="11" width="10" height="11" fill="#C8321E" />
      </g>
    </svg>
  );
}
```

Literal resulting header/shell implementation (the existing `NavItems` function and route list are unchanged):

```tsx
<header className="atlas-round-header">
  <div className="atlas-round-brand">
    <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
  </div>
  <nav className="atlas-round-primary" aria-label="Primary navigation">
    <NavItems />
  </nav>
  <div className="atlas-round-actions">
    <WorkspaceStatus compact />
    <button ref={mobileToggleRef} className="atlas-round-mobile-toggle" type="button"
      aria-controls="atlas-round-mobile-nav" aria-expanded={mobileOpen}
      aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
      onClick={() => setMobileOpen((value) => !value)}>
      {mobileOpen ? <X /> : <Menu />}
    </button>
  </div>
</header>
<nav id="atlas-round-mobile-nav" className="atlas-round-mobile-utilities"
  aria-label="Primary navigation" hidden={!mobileOpen}>
  <div className="atlas-round-mobile-utilities-heading">Workspace</div>
  <NavItems />
</nav>
<main id="main-content" tabIndex={-1} className="atlas-round-main">
  <div className="atlas-round-content">{children}</div>
</main>
```

Literal resulting shell CSS:

```css
/* Board navigation: horizontal workspace tabs with a compact mobile menu. */
.atlas-round-shell { display:flex; min-height:100dvh; min-width:0; flex-direction:column; background:var(--round-paper); }
.atlas-round-brand .atlas-round-wordmark { flex-direction:row; align-items:center; gap:8px; }
.atlas-round-brand .atlas-round-wordmark strong { font:500 16px/1 "Geist",sans-serif; letter-spacing:0; white-space:nowrap; }
.atlas-round-brand-mark { display:block; width:20px; height:22px; flex:none; }
.atlas-round-primary { margin-inline:auto; }
.atlas-round-main { min-height:calc(100dvh - 68px); min-width:0; }
.atlas-round-content { max-width:1280px; padding:12px 40px 36px; }
.atlas-round-footer { padding-inline:40px; font-size:11px; letter-spacing:0; text-transform:none; }
.atlas-round-mobile-utilities[hidden] { display:none!important; }
@media (max-width:1000px) and (min-width:761px) {
  .atlas-round-content { padding-inline:28px; }
}
@media (max-width:760px) {
  .atlas-round-main { min-height:calc(100dvh - 60px); }
  .atlas-round-content { padding:24px 16px 28px; }
  .atlas-round-footer { padding:16px; }
  .atlas-round-status { display:flex; }
  .atlas-round-status-full { display:none; }
  .atlas-round-status-short { display:inline; }
}
```

Also retain the existing mobile-menu CSS already present earlier in `flat-round.css`. Its direct-child grid layout is why the `NavItems` wrapper was removed; do not re-wrap those links in an extra div.

### Change 2 — Match Discover desktop proportions and remove conflicting overrides

File: `artifacts/apex-finder/src/flat-round.css`

The effective desktop grid is now:

```css
/* Discover board: a focused search desk beside saved searches and the source register. */
.atlas-round .atlas-discover-layout { display:grid; grid-template-columns:minmax(0,500px) minmax(320px,1fr); gap:64px; align-items:start; }
```

Specific CSS corrections:
- The earlier Discover grid declaration was changed from `minmax(0,1.15fr) minmax(300px,.85fr)` / `36px` to the 500px / 320px-minimum / 64px board proportions above.
- Removed the later duplicate `1.15fr/.85fr` grid declaration; it had overridden the earlier 500px declaration.
- Removed the Discover one-column declaration from the late `max-width:820px` block. The page already has its responsive stacking rules at the tablet/mobile breakpoints.
- Removed the redundant Discover one-column declaration from the later `max-width:760px` block while retaining the console's mobile min-height/padding corrections.
- Changed the earlier Discover mobile rule to leave the grid breakpoint to the shared tablet rule; the existing tablet rule stacks Discover at 1000px and below.
- Changed the global `max-width:1100px` status-hiding rule to `max-width:1100px and (min-width:761px)`, so the compact mobile status remains visible.

### Change 3 — Keep the mobile menu flow and status semantics intact

File: `artifacts/apex-finder/src/components/layout-round.tsx`

The mobile navigation is rendered as direct children of `.atlas-round-mobile-utilities`:

```tsx
<nav id="atlas-round-mobile-nav" className="atlas-round-mobile-utilities"
  aria-label="Primary navigation" hidden={!mobileOpen}>
  <div className="atlas-round-mobile-utilities-heading">Workspace</div>
  <NavItems />
</nav>
```

No route, destination, search action, backend call, or status mapping was changed.

## Verification status

- GitHub changes are committed on the isolated work branch listed above; `main` was not changed.
- Replit app lookup did not identify an editable Replit workspace for the supplied design-board URL or the title “Apex Atlas Discover”. No Replit workflow was started.
- The supplied design board could not be fetched by the browser reader in this session.
- No API, bureau, worker, database, or research process was started.
- No Discover query was submitted and no launch/research action was invoked.
- A frontend build and desktop/mobile browser preview still need to be run in a safe frontend-only workspace before merging. Do not use the normal package dev/build scripts if they run source-mutating checks or start managed backend services; use the direct Vite-only procedure from the supplied handoff.
- A standalone TypeScript check should only be considered valid if the workspace has its normal React, Node, and test type declarations installed. Do not add unrelated dependencies solely to silence cascading type errors.

## Safe frontend-only preview procedure from the supplied handoff

- Start only the frontend Vite workflow for `artifacts/apex-finder`.
- Do not start `artifacts/api-server`, database, worker, bureau, or research workflows.
- Use the direct Vite invocation described in the handoff, not the package `dev` script that runs source-boundary checks.
- Expect API-backed status/source requests to show truthful unavailable states and 502s while the API is stopped.
- Verify desktop at 1280×900 and mobile at 390×844. Do not submit the search form.


### Change 2a — Remove the final effective duplicate Discover grid rule

A post-write source check found that the later “Correct the Discover board composition” block still contained its own 1.15fr/.85fr grid declaration. That declaration would have overridden the 500px desktop grid despite the earlier change. It has now been removed.

The later block now begins:

```css
/* Discover grid proportions are defined once in the page layout rules above. */
.atlas-round .atlas-board-discover .atlas-discover-search .atlas-discover-search-console {
  position:relative;
  isolation:isolate;
  min-width:0;
  min-height:420px;
  padding:8px;
  overflow:hidden;
  border:0;
  border-radius:20px;
  background:transparent;
}
```

Verification of the source after this correction confirms there is no remaining `1.15fr/.85fr` Discover grid declaration. The single desktop grid rule is the 500px / 320px-minimum / 64px-gap rule recorded in Change 2.
