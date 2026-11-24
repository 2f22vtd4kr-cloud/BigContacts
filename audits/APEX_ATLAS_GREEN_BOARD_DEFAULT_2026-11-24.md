# Apex Atlas green design-board default and safe preview

Date: 2026-11-24
Repository: https://github.com/2f22vtd4kr-cloud/BigContacts
Reference: https://design-board-812905.netlify.app/
Basis: Replit's supplied Apex Atlas frontend design audit and its green-accented desktop/mobile reference captures.

## Scope

Frontend shell and local preview behavior only. No API routes, database/schema, workers, research services, generated API contracts, or production launch behavior were changed.

## Applied changes

- Made the existing collapsible left-sidebar shell the default when there is no explicit `?ui=` override or saved round preference. The round shell remains available through `?ui=round` and a saved `round` preference.
- Removed the visible "Flat Round UI" switch from the default shell.
- Added the Apex Atlas mark/wordmark to the mobile header, moved the menu control to the right, exposed its expanded/controls relationship, and gave the sidebar a matching ID.
- Kept the theme control in the sidebar footer and hid the duplicate header theme control on smaller screens.
- Made Vite development preview default to local mock mode; `?mock=0` or `?demo=0` explicitly opts out. Production behavior remains live by default.
- In mock preview, status/key chips now report that live status is not checked; they do not poll health/status endpoints.
- In mock preview, launch controls are read-only, launch configuration and active-run polling are skipped, dashboard/entity generated queries are disabled, the operator scoreboard is hidden, and Reactor polling is skipped.
- Reactor preview now presents an idle demo state instead of representing a fabricated active research run.

## Guardrails

- No backend, database, schema, generated API client, worker, Bureau, or research implementation changes.
- No new routes or navigation destinations.
- Local mock data remains preview-only; production remains live unless explicitly opted into mock mode.
- No design-board people, routes, relationships, counts, sources, or research statuses are asserted as live application data.

## Verification status

This PR was prepared from the current `main` revision after merged PR #955. Source-level checks were performed while applying changes. A complete local install/build and fresh desktop/mobile browser comparison against the live Netlify board have not yet been performed in this pass; do not treat this audit as a pixel-perfect visual sign-off. CI and preview screenshots remain the verification gate.
