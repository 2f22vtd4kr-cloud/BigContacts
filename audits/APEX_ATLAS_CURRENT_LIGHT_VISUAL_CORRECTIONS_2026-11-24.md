# Apex Atlas current-light visual correction audit

Date: 2026-11-24  
Reference: https://design-board-812905.netlify.app/  
Source base: main at the merged Apex light-interface baseline  
Scope: current-light frontend only

## Non-negotiable design direction

The current light Apex Atlas board is the sole design authority. The obsolete dark-green interface is explicitly out of scope and has not been restored, edited, or made the default. This change does not switch UI modes and does not touch the legacy shell.

## Evidence reviewed

Reviewed the user's two mobile screenshots:
- Current app: route data unavailable panel, horizontal-navigation remnants in the header, fixed bottom icon dock.
- Design board: contained rounded route/evidence card, clear inner spacing, light-gray secondary controls, patterned launch console with a red checker left rail and blue wave right rail.

The Replit audit is useful for source provenance, route inventory, and safe-preview constraints, but its claim that the Home composition broadly matches is not supported by the screenshots. It also records an API-offline app state while the board screenshot shows a no-routes empty state. These are different data states and must not be treated as a like-for-like content comparison.

## Confirmed visual discrepancies

1. **Home route card containment:** current source rendered the route empty state as a transparent, full-width section with only top and bottom rules. The board presents a nested, rounded white card with internal padding and a divider before the evidence legend.
2. **Evidence legend layout:** current source laid the legend out as a compact three-column row with four statuses. The board uses vertically stacked evidence rows inside the inset card. Existing product status meanings were retained; this change does not relabel statuses or fabricate evidence.
3. **Launch-console frame:** source defined the two-half frame but only provided the blue wave field in the final rule. The red checker left field was missing from that final frame contract. Added the red checker field and aligned both sides to the existing 8px frame inset.
4. **Navigation:** current layout rendered horizontal desktop navigation and a fixed mobile bottom tab bar. The user's explicit requirement is a collapsible sidebar with a button and a mobile drawer. Implemented the sidebar in the current light paper/ink styling; did not reuse the old green sidebar styling.

## Implementation

- `artifacts/apex-finder/src/components/layout-round.tsx`
  - Replaced horizontal navigation and bottom tabs with a collapsible sidebar.
  - Desktop toggle switches between 240px expanded and 68px icon-only states.
  - Mobile toggle opens a light drawer with backdrop; Escape and route navigation close it.
  - Retains the five existing destinations only: Overview, Ledger, Discover, Connections, Reactor.
  - Preserves the current Apex Atlas mark and workspace status.
- `artifacts/apex-finder/src/flat-round.css`
  - Adds inset rounded surfaces for the Home route panel and evidence legend.
  - Restores the two-part launch-console frame: red checker left, blue wave right.
  - Adds responsive light-shell sidebar/drawer styling and removes bottom dock from this shell.
- `artifacts/apex-finder/src/pages/dashboard.tsx`
  - Groups the route empty state and evidence legend inside the contained card without changing API/data logic.
- `artifacts/apex-finder/src/lib/board-spacing-grid-contract.test.ts`
  - Adds source-contract assertions for sidebar, removal of bottom navigation, contained route card, and split console patterns.

## Safety and scope

- No backend, database, schema, generated API client, worker, Bureau, authentication, launch, or research behavior changed.
- No design-board sample people, counts, routes, or evidence were copied into application data.
- Existing route availability and status semantics remain unchanged.
- Old dark-green/legacy shell files were not modified.

## Verification status

- Source-level implementation and diff review completed.
- Regression assertions added but not yet executed in this environment.
- Production build and browser screenshot comparison are still required.
- The uploaded screenshots establish the Home-page discrepancy; they do not establish conformance across Ledger, Discover, Connections, Reactor, or Card. Those pages still require a separate page-by-page desktop/mobile visual pass.
- The board host could not be opened through the available browser tool in this run. No pixel-perfect or full-board sign-off is claimed.

## Remaining work

1. Run the PR CI build and frontend contract tests; fix any regressions introduced by this branch.
2. Capture app screenshots at desktop 1440x1000 and mobile 402x874 with a consistent mock/API-down state.
3. Compare all six primary pages with matching design-board specimens and record concrete deltas before making further page-specific changes.

### Follow-up: gray disabled launch controls

The board's disabled launch state uses a quiet raised-gray treatment for the objective field, Launch button, depth selector, and target-count control. The source had a white objective field and the global red CTA treatment could override the disabled state. Added a scoped current-light rule so disabled controls use the board's gray surface and restrained border, while enabled launch styling remains unchanged. The target-count buttons retain white inset surfaces and explicit touch dimensions.

### State parity note

The supplied app screenshot says “Route data unavailable” and “API down”; the board specimen says “No routes yet”. Those are not equivalent states. In the source dashboard, the local mock flag suppresses the API-unavailable branch, so a genuine `?mock=1` capture should render the no-routes state. Replit should verify that its captured app URL actually retains `?mock=1` before treating the content difference as a design discrepancy.
