# Apex Atlas — Light Board Fidelity Corrections

Date: 2026-11-24

## Scope and authority

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Target: current light Apex Atlas design board, `https://design-board-812905.netlify.app/`
- Work branch: `fix/light-board-visual-fidelity-2026-11-24`
- The light design is authoritative. The obsolete dark-green interface and all legacy/dark styles are explicitly out of scope.
- Frontend-only. No backend routes, API contracts, generated clients, database/schema/data, workers, Bureau, research launch behavior, authentication, or production architecture were changed.
- No fixture data was added or persisted.

## Screenshot-driven findings

The supplied mobile screenshots show the design-board Overview API-down specimen and the current app rendering. The visible discrepancies are concrete:

1. The board's launch-console frame is neutral grey while the research API is down. The app retained the red/yellow checker and blue wave regardless of API state.
2. The app's Home frame tiled the checker and wave as separate left/right pseudo-element halves. Reactor instead paints a continuous wave field from the frame's origin and overlays the checker on the left. The split Home layers shift the wave phase.
3. The Home frame's compact square checker and short wave repeat do not match the longer board pattern rhythm.
4. The app header rendered as a distinct translucent bar with a bottom rule, unlike the single continuous paper surface in the board reference.
5. The desktop sidebar was constrained to the area below the header instead of spanning the viewport. Its active item used a red inset stripe, contrary to the requested text-only bold active state.
6. The global error notice reset only component state when dismissed. A repeated event with the same missing-credential/API error could immediately display the notice again.

## Changes implemented

### Home launch frame

- Added a truthful `data-api-state` attribute to the existing Home launch-console section, derived from the existing API health state.
- Reworked Home's frame layering to match Reactor's geometry: a single continuous wave background starting at the frame origin, with the checker field overlaid on the left.
- Increased the wave repeat to a 64×24 tile and changed checker cells to a 22×14 rectangular rhythm.
- Added the neutral API-down palette: grey wave field and grey checker field. The normal ready state retains the existing blue wave and red/yellow heraldic checker.
- No API request, health rule, launch control, or backend behavior was changed.

### Header and sidebar

- Removed the light-shell header's separate bottom border and translucent/blurred surface so it shares the page's paper background.
- Reflowed the desktop light-shell grid so the sidebar spans the full viewport height, with the header and page content in the main column.
- Removed the active sidebar's red inset stripe and selected background. The selected destination is emphasized by bold text only.
- Preserved the existing five primary destinations, desktop collapse control, mobile drawer, escape/backdrop close behavior, and responsive navigation.

### Error dismissal

- Dismissal is now remembered in `sessionStorage` for the current browser tab session, keyed by the same error's code/provider/title/message fingerprint.
- Repeated copies of the same missing-credential or API error no longer reopen the notice after dismissal during that session.
- A distinct error can still be shown. Existing System Status navigation and backend health/credential checks remain intact.
- Storage failures degrade safely to in-memory dismissal for the mounted app.

### Regression contracts

Extended `board-spacing-grid-contract.test.ts` to assert:
- API-state binding on the Home console.
- Continuous wave origin and longer pattern repeat.
- Neutral grey API-down palette.
- Full-height sidebar and text-only active emphasis.
- Session-persistent dismissal of repeated identical user-facing errors.

## Files changed

- `artifacts/apex-finder/src/pages/dashboard.tsx`
- `artifacts/apex-finder/src/flat-round.css`
- `artifacts/apex-finder/src/components/apex-error-notice.tsx`
- `artifacts/apex-finder/src/lib/board-spacing-grid-contract.test.ts`

## Verification status

- Source changes were committed to the isolated work branch.
- The changes are intentionally limited to the current light-shell selectors/components; legacy/dark styling files were not edited.
- Automated tests, typecheck, production build, and live desktop/mobile browser screenshot comparison are still pending. Do not treat the implementation as visually signed off until those checks run.
- Expected comparison viewports: desktop 1440×1000 and mobile 402×874 (plus the supplied 390px mobile reference).
- API-down visual check must use the existing local UI mode or controlled request interception only. Do not start the backend, Bureau, workers, or research.

## Remaining review points

- Verify the Home frame against the exact API-down design-board screenshot at phone width and desktop width.
- Verify sidebar viewport height, collapsed/expanded states, and mobile drawer behavior.
- Trigger the same missing-credential error more than once, dismiss it, and confirm it stays dismissed for the session; verify a different error still appears.
- Confirm the API-down frame state updates from actual existing API health state, not a hard-coded preview flag.


### Follow-up found during browser rendering

- The first live browser render showed the Home frame still colorful in `?mock=1`. This is because that safe local mode deliberately skips API-health polling, so the dashboard's API-unavailable boolean is false even though no API is running.
- Corrected the frame's visual state binding to treat local mock mode as API-down (`apiUnavailable || mock`). This changes only the frame's truthful presentation in the offline preview; mock fixtures remain local and no API call or backend behavior is added.
- Added a regression assertion for this case.
