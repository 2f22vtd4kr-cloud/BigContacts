# Apex Atlas final frontend polish audit

Date: 2026-11-24  
Repository: https://github.com/2f22vtd4kr-cloud/BigContacts  
Base revision: 1322be1a52332dab8691ac684538d9f75227580c  
Scope: shared board shell, global error notice, Card mobile navigation and spacing

## Design direction

- **Product:** A public-record research bureau that finds people, establishes evidence and traces contact routes
- **Character:** Archival, exact and restrained
- **World:** Paper, ink, registers and filing marks
- **Moments:** Evidence records, subject cards and relationship routes
- **Signature:** Checky, wavy and bent evidence marks with one consistent meaning each

## Why this was a polish pass

The existing board routes already contain the intended paper-and-ink system, five primary destinations, page-specific compositions and backend-derived data. The in-repository Unslop audit describes the nine design passes and explicitly says not to claim visual conformance from source contracts alone. I therefore kept the page content, page order, navigation destinations, data contracts and backend behavior intact and corrected only defects confirmed in the merged source.

## Confirmed defects and fixes

### 1. Global error notice was still the old dark popup

The stylesheet already defined the design-board alert classes (`.atlas-error-notice`, `.atlas-error-notice-card`, `.atlas-error-notice-layout`, semantic severity accents and phone placement above the bottom navigation). The React component did not use any of those classes: it still emitted the old Tailwind sky/amber/lime/orange/rose dark surfaces, which made the CSS completely ineffective.

**Change:** The component now renders the existing light-card class contract, keeps the severity-specific icon and marker, preserves Retry, System Status and dismissal behavior, and retains the Reactor-only suppression for duplicate API connectivity errors. No error classification, event source, request, route or action behavior changed.

### 2. Card mobile navigation used desktop-only links

The shared navigation renderer applied `.atlas-card-shell-navlink` to both the Card desktop header and the fixed mobile tab bar. It also suppressed icons whenever the current route was a Card. The bottom bar is styled only for `.atlas-round-navlink`, so Card phone navigation could not inherit the same five-icon dock as the other board pages.

**Change:** Desktop Card-header links retain `.atlas-card-shell-navlink` and remain text-only. The mobile dock now always uses `.atlas-round-navlink` and displays the existing Lucide icon for all five current destinations. Card still marks Ledger active; no tab or route was added.

### 3. Card mobile content could finish underneath the fixed tab bar

The Card-specific phone rule overrode the shared 112px content clearance with only 24px, even though the same fixed bottom navigation is rendered on Card routes.

**Change:** Card mobile content now reserves 112px plus the device safe-area inset below the dossier, matching the other board pages and preventing the final content/actions from being hidden behind the dock.

## Files changed

- `artifacts/apex-finder/src/components/apex-error-notice.tsx`
- `artifacts/apex-finder/src/components/layout-round.tsx`
- `artifacts/apex-finder/src/flat-round.css`
- `artifacts/apex-finder/src/lib/board-spacing-grid-contract.test.ts`

A new visible audit is stored at `audits/APEX_ATLAS_FINAL_FRONTEND_POLISH_2026-11-24.md`.


### 4. Final responsive-contract follow-up (CI)

The first PR check exposed two precise source-contract misses in the shared global error notice: the component's markup did not expose the responsive max-height utilities expected by the mobile/desktop contract, and its action controls did not declare explicit 44px minimum dimensions in the component source. The stylesheet already constrained the fixed notice and its close control; the markup now declares the same 38dvh phone / min(52dvh, 360px) larger-screen cap and explicit 44px minimum height/width for Retry, System Status and Dismiss. A final source review caught that the System Status link had been described as covered but was missing the utility classes; the link now declares the same 44px minimum target explicitly. This preserves the existing CSS placement, scrolling, actions and safe-area behavior while making the touch-size contract explicit to Tailwind and source checks.

**Follow-up commit:** `b1656a86c735adba02200f383e539d60849bfebe`.

## Guardrails preserved

- The five existing primary destinations remain Overview, Ledger, Discover, Connections and Reactor.
- Card remains the existing profile-detail route; no new route or tab was introduced.
- No backend, database, schema, API client, worker, bureau, launch flow or research behavior was changed.
- No design-board sample people, counts, relationships, sources, routes or statuses were copied into application data.
- Existing classic/legacy routes were not altered.
- The Connections page continues to show only the existing entity/asset relationship API projection; no user-owned contacts source was fabricated.

## Verification notes

- Source was inspected on current `main`, not replayed from the earlier per-page audit snippets.
- The existing CSS alert system and the component mismatch were verified directly in the current source.
- Regression assertions were added to the existing spacing-grid contract test, which is already included in the frontend responsive workflow.
- A live side-by-side screenshot comparison with the Netlify design board was not available in this execution environment. The board host did not resolve through the available browser, and this change must not be described as a complete visual sign-off. CI build, source-contract tests and the app's desktop/tablet/phone captures are the remaining verification gate.

---

Part of unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0. Keep this attribution in copies and adaptations.


**Touch-target correction commit:** `092fe03dc8d9d9c2db52100340587f5f707d4407`.

### 5. Regression-test alignment

A follow-up source review found the existing alert assertion still matched the pre-responsive exact class string. Updated the contract test to assert the complete responsive class and require all three actionable controls (Retry, System Status and Dismiss) to declare 44px minimum width and height. This keeps the test aligned with the actual component contract rather than weakening it to a broad substring check.

**Regression-test correction commit:** `3e9663c1adb0d71aad67efbee2e510dbbcd23541`.

The touch-target assertions use literal occurrence counts (three `min-h-[44px]` and three `min-w-[44px]` declarations) to avoid regex escaping ambiguity in the test source.

**Assertion robustness follow-up:** `cd4e66016e6ee8e97a19f4653d8cc01e14a89aa3`.


### 6. Full browser visual QA across the board pages

A browser-capable Vercel desktop was provisioned and the PR branch was checked out locally at `ef5aaccdfd81166b8e72fe94fb9ab79cf74a24ae`. The public design board was opened in Chromium and inspected at its live page sections. The local Apex frontend was run from `artifacts/apex-finder` and captured at desktop (1440px) and phone (390px) widths for Overview, Ledger, Discover, Reactor, Connections and the Card detail route.

For filled-state comparison, a Playwright-only request interceptor supplied fictional records in memory for the duration of each browser page. It did not write to local backend services, a database, the Bureau, or the repository. A visible `LOCAL VISUAL FIXTURES · NOT LIVE DATA` marker was added to the inspection captures. The sample fixture uses clearly fictional board-style names and relationships. It does not create user-owned contacts or assert real research provenance.

**Responsive issue found and corrected:** the final desktop Discover sizing rule (`minmax(0,500px) minmax(320px,1fr)`) appeared after the earlier phone media queries and overrode the one-column mobile layout. With populated saved-search cards, the 390px Discover page expanded to 400px. Added a final phone breakpoint restoring a single minmax(0,1fr) column and constraining the rail/panels to the viewport. The same contract is asserted in `board-spacing-grid-contract.test.ts`.

**Post-fix browser result:** all six routes returned HTTP 200 at both widths; no uncaught page errors were observed; document body width matched the viewport for all twelve captures. The Reactor logbook category controls retain their intentional horizontal scroller on phone and do not expand the document. Card mobile retains the shared bottom dock and safe-area reservation.

**Remaining reference/data differences (not papered over):**
- Overview's sample `Strongest routes` cards in the design board represent contact-mediated routes. The current app/API projection returned no personal contact routes in this isolated preview. Connections is intentionally an entity/asset relationship register, not a user-owned contacts feature. No contacts or contact routes were fabricated to force a match.
- The local Card fixture populates the subject and related entity tabs, but does not include the board's full claim-level evidence bundle. Those sections remain honest empty states.
- Reactor's offline mock state supplies a demo objective and phase telemetry, but it is not a real active Bureau run and cannot reproduce the board's complete 9-step live logbook.

**Verification:** frontend build boundary checks passed (Atlas launch contract, source boundary, user-error boundary 12/12, operator-auth boundary 12/12, generated Reactor TSX syntax, profile route contract 8/8); Vite production build passed. Workspace typecheck was still running at the time of this audit update. The standalone Vitest runner is not installed in this local dependency environment, so the updated Vitest contract file was source-reviewed but not executed locally.

No backend, database, schema, API client, worker, Bureau, launch or research behavior was modified. The visual fixtures and screenshots are local inspection artifacts only.
