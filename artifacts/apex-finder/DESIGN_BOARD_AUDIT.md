# Apex Atlas — Ledger design implementation audit

## Scope and constraints
- Design source: supplied Apex Atlas design board and the user-provided Ledger handoff.
- Target files: `artifacts/apex-finder/src/pages/board-ledger.tsx` and `artifacts/apex-finder/src/flat-round.css`.
- Backend, database, API contracts, routes, research pipeline, worker and launch controls are unchanged.
- Existing five primary routes remain unchanged. No sample people or invented records are introduced.
- Isolated on `work/ledger-board-fidelity`; not merged or deployed.
- API order remains authoritative. Wealth score is displayed as a separate signal, never used for local sorting.
- Seven filters (All plus six API outcome buckets) and all summary counts derive from the live API response.

## Direction
- Product: a source-attributed register of people discovered by Apex Atlas.
- Character: exact, archival, quietly technical.
- World: paper register, ink, evidence marks and restrained heraldic red.
- Moments: patterned search console and source-attributed people register.
- Signature: paper-console frame and API-backed outcome marks, always paired with readable labels.

## Implementation chronology
1. Re-composed the page into a two-column desktop grid: title, console and summary on the left; register on the right.
2. Added a three-number summary from real API records: people, direct verified, direct candidates.
3. Preserved the seven live contact-outcome filters and exact outcome categories.
4. Added API-name-derived initials and source display on desktop and mobile.
5. Added mobile register cards instead of shrinking the dense desktop table.
6. Kept loading, empty, API-error, saved-data/API-down and retry states.
7. Kept API order explicit and wealth score separate; did not add client-side ranking.

## Exact code changes
### `artifacts/apex-finder/src/pages/board-ledger.tsx`
- Added `initials(name)` and `entitySources(entity)`.
- Initial visible record count changed from 5 to 8; “Show 25 more” remains incremental.
- Added `.atlas-ledger-summary` with API-derived People, Direct verified and Direct candidates values.
- Desktop table now includes actual-name initials, explicit contact outcome, wealth score and source attribution.
- Mobile cards display the same real record details and retain existing `/profile/:id` links.
- Existing API fetch, entity filtering, API order, outcome classification and refetch behavior retained.

### `artifacts/apex-finder/src/flat-round.css`
- Replaced the existing Ledger CSS block with the new page-specific layout.
- Desktop grid: `minmax(280px,.78fr) minmax(0,1.22fr)`, 48px column gap.
- Console and summary occupy the left column; register spans the right column.
- Console frame uses red check pattern on the left and blue dotted pattern on the right.
- Mobile breakpoint: 760px; title, console, summary and cards stack in DOM order. Table is hidden only at this breakpoint.
- Contact outcome styles are keyed by the actual `data-outcome` value; all states retain text.

## Verification status
- Branch commit `e2e97084260bc5cde355b42688bc367ff6251859` was built by Vercel successfully: deployment state READY; Vite reported `✓ built in 1.64s`.
- Build-time launch, source-boundary, API error-boundary, operator-auth and generated-reactor checks passed.
- The branch-triggered Frontend responsive contract workflow failed at `Check Apex frontend polish contract` before dependency installation/build. The new mobile Ledger styles had three 10px metadata declarations, violating the repository-wide 11px minimum. Corrected all three to 11px in the follow-up commit; the workflow rerun is pending.
- Browser rendering and desktop/390px screenshots have not yet been run. Do not claim visual verification until completed.
- No backend process was started; no Bureau/research execution was triggered.

## Follow-up verification
1. Run frontend build only; do not run `scripts/replit-boot.sh`, API, worker, database or Bureau.
2. Run `board-ledger-person-contract.test.ts` and relevant UI contract tests.
3. Render desktop and 390px mobile with populated, empty and API-down retained-data states.
4. Check overflow, focus visibility, button targets and long source labels.
5. Append exact code changes and actual results after every correction.

## Attribution
This pass follows Unslop by Damir Sokolovsky, licensed CC BY 4.0: https://github.com/heydamir/unslop


## Follow-up correction — minimum mobile type size
- CI failure identified: the existing Apex frontend polish contract enforces an 11px minimum for active-board metadata.
- Corrected the new Ledger CSS declarations from 10px to 11px:
```css
.atlas-round .atlas-ledger-register-meta { font-size:11px; }
.atlas-round .atlas-ledger-mobile-card-meta { font:400 11px/1.5 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-ledger-mobile-card-meta strong { font:400 11px/1.5 "Geist Mono",ui-monospace,monospace; overflow-wrap:anywhere; }
```
- No component logic, backend, route, or data behavior changed in this correction.


## Follow-up correction — spacing and radius contract
- The first rerun passed the responsive, Reactor Live, Home UI, and frontend polish source contracts, plus the Vite build. The remaining responsive workflow failure was in the shared `board-spacing-grid-contract.test.ts` (not a Ledger runtime or backend failure).
- The new Ledger CSS introduced 10px gaps/table side padding and an 8px “Show more” radius, which violated the repository's 4px spacing grid and documented radius scale.
- Corrected those literal declarations:
```css
.atlas-round .atlas-ledger-person { gap:8px; }
.atlas-round .atlas-ledger-table th { padding:12px 8px; }
.atlas-round .atlas-ledger-table td { padding:12px 8px; }
.atlas-round .atlas-ledger-mobile-card-top { gap:8px; }
.atlas-round .atlas-ledger-view-all { border-radius:10px; }
```
- The mobile metadata remains 11px after the prior correction. No component, API, route or backend code changed.
