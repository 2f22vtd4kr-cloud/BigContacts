# Apex Atlas — Current Light Design Pixel-Fidelity Audit

**Date:** 2026-11-24  
**Base:** `main` at `642979564449699a142b0a8336a6f2d64ab03406`  
**Work branch:** `fix/light-board-pixel-fidelity-2026-11-24`  
**Visual authority:** [Current Apex Atlas design board](https://design-board-812905.netlify.app/)  
**Explicit exclusion:** the obsolete dark-green design is not a target and is not modified.

## Scope and decisions

- Match the current light board's paper, surface, border, typography, console geometry, and spacing.
- User-requested navigation overrides the board's horizontal desktop tabs and mobile bottom tabs: use a collapsible desktop sidebar and a mobile drawer.
- Frontend only. No API routes, database, workers, Bureau services, generated API contracts, or production research behaviour changed.
- Safe review uses `?mock=1`; mock content is local-only and visibly disclosed. No research or live search is launched.

## Reference tokens verified

| Token | Board value |
|---|---:|
| Page paper | `#FAFAF8` |
| White card/window | `#FFFFFF` |
| Raised/input surface | `#F3F3F0` |
| Border | `#E4E4DF` |
| Primary ink | `#18181A` |
| Secondary ink | `#55555A` |
| Muted ink | `#74747A` |
| Console accents | red checker + blue wave |

The round shell already defined `--round-paper: #FAFAF8`, but `html.light main` and `html.light body` overrode it with `#f7f7f7`. The page was therefore visibly darker than the board despite the intended token being present.

## Findings and changes

### 1. Global light canvas and neutral surfaces

- Reconciled the light theme's global canvas with the board's `#FAFAF8` paper token.
- Updated the light-theme neutral variables to the board's white, raised, border, and ink values.
- Kept all changes scoped to `html.light` and `.atlas-round`; the dark-green legacy palette is untouched.

### 2. Sidebar was hidden while its grid column remained reserved

- An older rule hid `.atlas-round-sidebar` with `display:none`, but the shell still reserved its 240px grid column. This produced a large blank offset and made the menu appear absent.
- The sidebar now renders. Desktop defaults to a compact 46px icon rail and expands to 240px with the header button.
- Mobile retains a full-width 288px off-canvas drawer, opened and closed with the same accessible button.
- The current light shell has no horizontal primary navigation or bottom tab bar.

### 3. Home launch console geometry

- Desktop objective textarea and Launch action now occupy the same row, matching the board composition.
- Depth and target controls sit in a separate row; the explanatory text sits below the controls.
- Mobile switches to a single-column stack: textarea, Launch, settings, explanatory text.
- Desktop objective field is 76px high; mobile field has a 120px minimum height.
- The disabled preview button uses the same raised neutral surface and border language as the board.
- Retained the existing red checker and blue wave frame. The frame remains an inset decoration around the white console; it was not replaced with an unrelated pattern.

### 4. Safe preview data and network isolation

- Dashboard statistics, launch configuration, run status, workspace status, and Reactor live polling no longer call the API in `?mock=1`.
- Ledger and Card use the repository's existing demo entities in local preview; the Ledger marks them as local fixtures and does not persist them.
- Discover shows clearly labelled local saved-search fixtures and does not fetch live source status in mock mode. Search execution is blocked in mock mode.
- Connections does not invent personal contacts or contact routes; the local preview remains empty when no relationship fixture exists.
- Card external enrichment, contact evidence, relationship mutations, and research actions are not run in mock mode.
- Reactor remains an idle preview. No Bureau job or research operation was started.

## Visual review

The live design board was opened and visually reviewed for Home, Ledger, Discover, Reactor, Card, and Connections. The app's corresponding routes were checked at:

- Desktop: 1280 × 800
- Mobile: 402 × 874

The board's own desktop/phone specimens are scaled inside its documentation layout; screenshots were compared by component structure and relative geometry rather than treating the documentation page's outer margins as app margins.

### Confirmed visual changes

- Page canvas computes to `rgb(250, 250, 248)`, i.e. `#FAFAF8`.
- Home textarea and Launch button share the same desktop row; their top coordinates match.
- Mobile console stacks controls and remains within the viewport.
- Desktop sidebar toggle changes the rail from 46px to 240px.
- Mobile sidebar drawer opens from off-canvas to its full 288px width.
- The Home frame retains the red checker and blue wave placement around the white inset panel.

## Verification

- `pnpm --dir artifacts/apex-finder build` — passed.
- Playwright route smoke checks — 6 routes × 2 viewports (Home, Ledger, Discover, Connections, Reactor, Card).
- All 12 route/viewport combinations: no uncaught page errors; no `/api/` requests in mock mode; document width equals viewport width.
- Computed page paper on all checked routes: `rgb(250, 250, 248)`.
- Sidebar desktop expand/collapse and mobile drawer open/close were exercised.
- No research, Bureau, or backend process was started.

## Data-state differences that are intentionally not fabricated

The board includes populated specimens to demonstrate layout. The safe app preview has no backend:

- Home strongest routes therefore remain empty/unavailable; no personal contact routes are invented.
- Ledger shows the repository's existing local demo people, not the board's unrelated sample identities or counts.
- Discover source readiness is unreported because no live source-status request is made.
- Reactor stays idle rather than fabricating a live nine-step run.
- Connections is an entity/asset relationship projection, not a user-owned contacts-and-routes database.
- Card does not invent claim-level evidence, relationships, or assets that are absent from the existing fixture.

These are data-contract differences, not colour or spacing differences. The current pass fixes the shared light shell and the Home console's major geometry; any further route-specific refinement should preserve the above boundaries.


## Follow-up corrections — API-down screenshot and shell

The supplied mobile comparison exposed a mismatch missed by the earlier pass: the board shows a neutral grey decorative frame when the API is down, while Home kept the red/gold checker and blue wave. The earlier statement that Home's frame was aligned was incomplete.

- Home now derives an `is-api-down` frame class from the existing `apiUnavailable` state. No health endpoint, API contract, or backend logic was added.
- Home uses the same neutral grey frame colours already present in Reactor for API-down state.
- Checker tiles are now rectangular (`24 × 16px`) and the wave repeat is wider (`48 × 24px`) to reduce the square-looking pattern.
- The light header shares the page-paper background and no longer draws a separate bottom rule or shadow.
- Desktop navigation opens expanded by default and remains collapsible. The active destination has no red selection stripe or filled block; its label is bold.
- The sidebar is constrained to the full viewport height beneath the header.
- Dismissed error codes are remembered for the browser session. Repeated emissions of the same error no longer reopen the same notice after dismissal.
- Missing credentials now recognize “keys not set”, “not configured”, “not provided”, and equivalent wording, with safe instructions to use System Status and deployment secrets.

The changes are frontend-only and scoped to the current light shell. The legacy dark-green UI, backend, database, generated client, workers, Bureau, and research behaviour remain untouched. Build/tests/browser recapture are pending on this branch.


### Browser verification on the follow-up branch

- Installed and ran the branch in a Vercel Chromium sandbox with the API intentionally absent; no backend, Bureau, worker, or research process was started.
- Captured the Home route at **402 × 874** and **1440 × 1000** using Playwright Chromium.
- Visually confirmed the mobile API-down console now uses the neutral grey checker/wave frame rather than the red/blue active frame.
- Visually confirmed the light header has no separate bottom divider, the desktop sidebar starts expanded, and the active navigation label is bold without a red selection stripe or filled highlight.
- The global notice appeared once for the intentionally unavailable local API. Dismissing it suppressed subsequent emissions of the same classified error code for the remainder of that browser session.
- The screenshot preview also exposed the expected inline API-unavailable notice; the generic 404 toast was a consequence of deliberately running the frontend without its API and is not a provider-key diagnosis.

**Verification:** `pnpm --dir artifacts/apex-finder build` passed, including all frontend contract gates; the Apex user-error boundary passed **14/14** checks, including the new credential-wording and session-dismissal checks. The visual captures are local sandbox evidence, not committed screenshot assets.

**Still not claimed:** this pass is not a complete pixel-by-pixel review of every page and state. It fixes the specific Home API-down comparison and shared frame pattern geometry identified in the supplied screenshots. The API-key classification change improves diagnosis and guidance; it does not provision or repair deployment secrets.


Additional focused checks after the final CSS adjustment:
- Executed the real TypeScript classifier under Node 24: `API keys not set`, `SERPER_API_KEY is not configured`, and `provider credential missing` each returned `MISSING_CREDENTIAL`.
- In the same browser tab, dismissed the API-down notice, reloaded the app, and confirmed the same error code did not reopen during that session.
