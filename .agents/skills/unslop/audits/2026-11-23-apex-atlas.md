# Apex Atlas board UI — unslop audit

Date: 2026-11-23  
Scope: active board routes and their rendered components; the classic interface is intentionally preserved as a rollback.

## Direction

- Product: public-record research bureau that finds people, establishes evidence and traces contact routes
- Character: archival, exact and restrained
- World: paper, ink, registers and filing marks
- Moments: evidence records, subject cards and relationship routes
- Signature: checky, wavy and bent evidence marks with one consistent meaning each

## Signs found and fixes

### Surfaces and color
- Legacy neon green accents in Home, Discover and Card (dashboard.tsx, deep-search.tsx, profile.tsx) → mapped to the board's muted green evidence tincture; primary actions remain red.
- Glowing search-step shadows and neon borders (deep-search.tsx) → neutral hairlines and raised paper surfaces in the active Discover route.
- Dark neon Reactor cards and radial topology treatment (reactor-live-surface.tsx, reactor.tsx) → the board route now renders a paper logbook from normalized live telemetry; the old topology is only in the classic rollback.
- Red checky and wavy/bend patterns in flat-round.css → retained intentionally as the board's evidence signature, not decorative color wash.
- Dark card backgrounds and colored dossier borders (profile.tsx) → white paper surfaces, hairlines and the four semantic tinctures.

### Type
- Wide uppercase tracking in Discover pipeline labels and Card dossier labels (deep-search.tsx, profile.tsx) → sentence-case/normal tracking on board routes.
- Over-heavy label weights in the old Card dossier (profile.tsx) → board-scoped 400/500 treatment; page titles remain the main hierarchy.
- Tiny source/status metadata in Discover and Reactor (deep-search.tsx, reactor-live-surface.tsx) → board typography and spacing overrides; source text remains secondary.

### Icons
- Location emoji in the Card asset row (profile.tsx) → Lucide MapPin line icon.
- Unused Sparkles imports in Home and Card (dashboard.tsx, profile.tsx) → removed; no sparkle-as-AI decoration remains in those screens.
- Mixed decorative icon treatment in the old topology → excluded from board navigation; preserved only in classic rollback.

### Spacing and components
- Full-pill status/filter controls in the inherited search and dossier UI (deep-search.tsx, profile.tsx) → compact rectangular tags and hairline controls.
- transition-all and broad glow transitions in Discover and Card (deep-search.tsx, profile.tsx) → color, background, border, opacity and transform only.
- Animated Home skeleton (dashboard.tsx) → static loading placeholder; live Reactor activity remains live-only.
- Oversized Discover pipeline cards and filter sidebar (deep-search.tsx) → board-scoped neutral treatment; filters remain available through the Filters control.
- Legacy feed polling that was not rendered on Home (dashboard.tsx) → removed; Home now requests only its visible stats and API health.

### Copy and data integrity
- Home's long prefilled objective (launch-atlas-button.tsx) → empty board prompt; launch stays disabled until an objective is entered.
- Discover's missing saved-search and source-status surfaces (board-discover.tsx) → added device-persisted saved queries and live API/registry checks; unknown states are not called live.
- Ledger evidence labels without explicit verification metadata (board-ledger.tsx) → only explicit verified or corroborated metadata receives those labels; all other records remain In review.
- Specimen contact counts/routes without a user-owned contacts model (board-connections.tsx) → honest empty state; recorded relationship count is read from dashboard stats.
- Reactor activity synthesized from a second event model (reactor.tsx) → removed; board Logbook consumes the shared normalized useReactorLiveTelemetry store through ReactorLiveSurface.
- Unavailable API state presented as idle (reactor.tsx) → added a health check, API down label and retry action while retaining last recorded evidence.
- Discover search endpoint that ignored the app base path (deep-search.tsx) → fetch now respects import.meta.env.BASE_URL.
- Classic Graph and topology screens with the previous visual language (router.tsx) → kept in the classic rollback tree, not exposed as board utilities.

## Visual verification limits

The repository CI can compile and run the responsive/UI contracts. No authenticated browser screenshot or live Replit preview was available in this pass, so visual pixel comparison against the supplied board remains unverified and must be done against the deployed preview before merge.

## Unresolved data-model dependency

Connections needs a user-owned contacts source and a route query that connects those contacts to target records. The current API/schema exposes entity relationships, not a dedicated user-owned contacts collection; the board therefore shows an explicit empty state rather than fabricated contacts or routes.

---

Part of unslop by Damir Sokolovsky (@heydamir), CC BY 4.0.
