# Apex Atlas — Current Light Design Pixel-Fidelity Audit

**Date:** 2026-11-24  
**Base:** `main` at `642979564449699a142b0a8336a6f2d64ab03406`  
**Work branch:** `fix/light-board-api-down-frame-and-alerts-2026-11-24`  
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

## Follow-up regression found while resuming work

The first user screenshot comparison exposed a state mismatch that the previous browser note did not cover: the workspace header could report API-down while the Home decorative frame remained red/blue in the local `?mock=1` preview. The cause was the Home page's `apiUnavailable` expression explicitly excluding mock mode, even though mock mode intentionally has no API.

- Corrected Home's existing visual-state derivation so `mock` is treated as API unavailable; no request or backend behavior is added.
- The existing `.is-api-down` CSS now activates the neutral grey checker and wave for the safe mock preview, matching the board's API-down specimen.
- Added a regression assertion to `scripts/check-apex-user-error-boundary.mjs` so the mock/API-down state relationship cannot silently regress.
- Confirmed the shared frame selectors target the actual Discover, Ledger, and Connections console class names; the common final override sets the rectangular checker to `24 × 16px` and wave repeat to `48 × 24px`.
- Confirmed the current light shell's final sidebar overrides keep the sidebar full-height and remove the red active stripe/fill; active destination text remains bold.
- These changes remain isolated to the current light frontend and its test/audit. The legacy dark-green layout and palette remain untouched.

**Verification status for this additional correction:** GitHub file updates committed to the existing PR branch. The new source-level regression assertion has been added; rerunning the complete build and browser screenshot check is still required after this follow-up.

## Second follow-up — frame wave origin aligned with Reactor

The user correctly pointed out that merely lengthening the checker/wave tiles did not fix the placement. The Home, Discover, Ledger, and Connections frames still used split left/right pseudo-element layers, while Reactor uses one continuous wave field with a checker overlay on the left. That seam restarted the wave phase and made the frame visibly different.

- Changed the four current light-shell console frames to use the same layering model as Reactor: one continuous wave background across the entire frame, plus a left-side checker overlay.
- Extended the wave tile to **64 × 24px** and set the checker rhythm to **22 × 14px** rectangular cells (not square tiles).
- Home's API-down state keeps the same geometry but switches the wave and checker to neutral greys.
- This supersedes the earlier 48 × 24 / 24 × 16 split-layer adjustment recorded above; that earlier adjustment was insufficient and should not be treated as the final pattern.
- Added a source-level regression check covering the shared frame geometry and tile dimensions.
- The API-down state is now true for ?mock=1, because mock mode intentionally disables the API. The local preview therefore reproduces the board's grey API-down Home frame rather than showing a false ready-state red/blue frame.

**Remaining verification:** CI checks were still running after these commits. A fresh Chromium capture at 390px and 402px phone widths plus 1440px desktop is required before this follow-up is visually signed off.

## Verification after the continuous-wave correction

**Local production build:** passed on the current PR head after the mock API-down, shared frame geometry, and sidebar test correction.

- `pnpm --dir artifacts/apex-finder build` — **passed**; Vite production bundle completed.
- Apex user-error boundary — **17/17 checks passed**, including provider-key wording, mock/API-down state, shared Reactor-style continuous wave geometry, full-height text-only sidebar, and repeated-notice dismissal.
- Operator-auth boundary — **12/12 checks passed**.
- Profile route contract — **8/8 checks passed**.
- Generated Reactor TSX syntax — **passed**.
- The first run exposed an over-broad regression assertion that searched the entire stylesheet for an old red active stripe. The stylesheet intentionally retains earlier cascade rules overridden by the final light-shell rule. The assertion now checks the final active-navigation rule itself; the rerun passes.

**Browser access limitation:** the current Vercel deployment is READY, but its URL redirects automated Chromium to Vercel Login. The Netlify deploy previews also show Team Protection. The local Vite dev server started, but the browser session could not reach its port from the Playwright process. Therefore no new screenshot-level visual sign-off is claimed for this latest CSS correction. The earlier user-provided screenshots remain the visual comparison basis; inspect the protected preview in the user's authenticated Replit/browser session once the PR is available there.

**Deployment status at latest check:** GitHub commit status is success; Vercel deployment READY and Netlify deploy previews READY. This means the deploy artifacts completed, not that an unauthenticated browser can view them.

No API service, worker, Bureau, research operation, database, or persistent fixture was started or modified.


## Cross-page API-down frame correction

A further review of the shared shell found that the neutral frame was applied only to Home. The header's existing WorkspaceStatus already exposes data-status="offline", so the current light shell now uses that existing state to neutralize the decorative frames on Home, Discover, Ledger, and Connections together. Each keeps the same long 64×24px continuous wave and 22×14px rectangular checker geometry; only the palette changes to grey while the workspace is offline. No extra API request or backend behavior is introduced.

A regression assertion now checks all four real frame selectors and the neutral pattern dimensions. The existing Reactor page remains unchanged.


## Regression contract alignment

The first CI rerun confirmed the responsive frontend contract had hard-coded the superseded horizontal desktop navigation and mobile tab bar. Its assertions were updated to verify the requested full-height sidebar, mobile drawer below the header, Escape dismissal, and bold text-only active destination. The rerun passed all 27 responsive checks. The Home UI contract contained two additional stale horizontal-navigation/tabbar assertions; those are now updated to verify the same sidebar/drawer contract. The final Home UI contract rerun is pending.

## Design direction and unslop audit — 2026-11-24

### Five-line design direction

1. **Purpose:** Apex Atlas is a research workspace that turns a target into sourced, verified leads and relationship context.
2. **Character:** precise, calm, evidence-first, and quietly technical; never flashy or ornamental.
3. **World:** warm paper surfaces, restrained ink, a disciplined grid, evidence ledgers, and a cartographic launch console.
4. **Moments:** a clear launch action, legible active/limited/offline states, and a neutral API-down frame that preserves the page structure.
5. **Signature:** one continuous wave field with a rectangular checker overlay; the selected destination is communicated by bold text alone.

### Reference hierarchy

- The live design board at https://design-board-812905.netlify.app/ is authoritative for its documented values and components.
- Where the board is silent, use the same tokens and hierarchy rather than introducing a new visual language.
- The additional quality review follows the public [heydamir/unslop](https://github.com/heydamir/unslop) design-audit approach. It supplements the board; it never overrides an explicit board rule or the user navigation requirements.

### Board tokens and defaults

- Paper `#FAFAF8`; card `#FFFFFF`; raised surface `#F3F3F0`; border `#E4E4DF`.
- Primary ink `#18181A`; secondary ink `#55555A`; muted ink `#74747A`.
- Red `#C8321E`; green `#1F8A4D`; blue `#2757C6`; gold `#EDB92B`.
- Spacing follows the 4px grid. The source contract rejects off-grid padding, margins, and gaps.
- Corner radii use the documented 6/10/12/16/20px scale; the stray 8px control radii were corrected.
- Geist and Geist Mono remain the type families. Small interface text has an 11px minimum. Small labels are sentence case and untracked; 700 weight is reserved for the selected sidebar destination as explicitly requested.
- Icons use the existing Lucide set. No emoji, neon glow, pulsing status dots, decorative blobs, or unrelated gradients are introduced. The wave/checker field is the intentional product motif, not generic decoration.

### Additional surfaces brought into the same system

- Workspace status popover now uses paper/raised surfaces, restrained green/gold/red state colours, sentence-case labels, and no neon/glow/pulse treatment.
- System status now uses the board palette and type scale, identifies canonical provider-secret names, distinguishes active keys from rate-limited keys, and avoids describing configured model-role credentials as missing search-provider keys.
- API-key health distinguishes `No keys` from `API offline`; the public health bit remains coarse and the authenticated status endpoint remains the detailed source.
- The API-down shell uses a single 64×24px continuous wave tile and 22×14px neutral checker cells across Home, Discover, Ledger, Connections, and Reactor. The header and page share one paper surface with no divider or shadow. The sidebar reaches the viewport bottom; the selected item has no red stripe or filled highlight.

### Automated contract coverage

The board spacing contract now checks the canonical palette, 4px spacing grid, approved radius scale, 11px text floor, continuous wave/checker dimensions, uninterrupted header surface, full-height sidebar, text-only active state, and status-popover restraint. The frontend polish contract no longer encodes the retired horizontal navigation or mobile tab bar.

### Remaining evidence required before sign-off

- Run the updated frontend, API regression, and complete CI suites against the current branch head.
- Capture Home, Discover, Ledger, Connections, Reactor, and System status at mobile, tablet, and desktop sizes, including API-down and key-missing states.
- Compare the captures against the live board. A successful static build or source assertion is not a substitute for the final rendered visual review.

No backend routes, API contracts, database, worker, Bureau, research, or provider-routing behavior was changed by these visual/status corrections. The provider-secret reference documents existing server-side names only; it does not provision secrets.