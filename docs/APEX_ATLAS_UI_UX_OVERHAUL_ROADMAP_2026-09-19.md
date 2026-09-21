# Apex Atlas UI/UX Overhaul Roadmap — 19 Sep 2026

## Objective

Finish the visual system as a deployment-ready product, not a collection of individually polished screens. The reference screenshot exposed a real hierarchy defect: the home-page primary Launch action was visually narrower than the two secondary actions beneath it, and Reactor was represented by a generic CPU/radar language rather than a memorable product-specific mark.

This overhaul treats those observations as acceptance tests and closes the remaining work from the previous UI/UX roadmap at the same time.

## Phases

### Phase 1 — Command hierarchy and alignment
- Replace brittle positional CSS with explicit home hero action rails.
- Make the primary Launch control span the exact visual width of the secondary action rail on desktop.
- Keep the research-depth selector visually subordinate and separate from the CTA.
- Preserve a clean full-width mobile stack.
- Add hover, focus, active, and reduced-motion states without changing launch semantics.

**Acceptance:** on desktop the left and right edges of the Launch CTA align with the Reactor/Discover rail below; on mobile every control remains full-width and touch-safe.

### Phase 2 — Product iconography
- Introduce a reusable Reactor cooling-tower mark.
- Replace generic CPU/radar imagery where it represents Reactor.
- Keep functional method icons (search, browser, registry, etc.) because they describe actual methods.
- Ensure icons have accessible labels/titles where they are interactive.

**Acceptance:** Reactor has one recognizable visual identity across sidebar, home hero, shortcuts, and Reactor launch surfaces.

### Phase 3 — Desktop live cockpit
- Preserve the canonical telemetry model and no-fabrication boundary.
- Separate live evidence from architectural context.
- Make focus, history, and source affordances visually coherent.
- Keep topology activity strictly telemetry-derived.
- Reduce decorative motion when idle and stop it at terminal states.

**Acceptance:** desktop can show the live narrative and topology simultaneously without either implying unrecorded work.

### Phase 4 — Mobile live desk
- Keep the feed-first information architecture.
- Preserve searchable history and jump-to-live behavior.
- Maintain 44px minimum interactive targets and safe-area support.
- Remove desktop topology from the primary mobile flow.
- Keep stale/empty/offline states explicit.

**Acceptance:** a one-handed user can identify the current action, inspect a source, and return to live without opening a desktop-style canvas.

### Phase 5 — Evidence delight without theater
- Make newly recorded evidence visibly arrive once and settle.
- Make actor handoffs legible using existing recorded events only.
- Make completion quiet and terminal.
- Never use animation to imply an event that telemetry did not record.

**Acceptance:** every visual reward corresponds to a real state transition.

### Phase 6 — Accessibility, resilience, and performance
- Verify keyboard/focus behavior.
- Verify reduced-motion behavior.
- Keep screen-reader announcements polite and bounded.
- Bound event rendering and avoid idle animation work.
- Preserve truthful degradation when telemetry is unavailable.

**Acceptance:** the same UI remains understandable with reduced motion, keyboard navigation, and incomplete telemetry.

### Phase 7 — Bug hunt and deployment gate
- Run frontend source-boundary checks.
- Run typecheck and production build.
- Run Reactor integrity/no-fabrication contracts.
- Run responsive contracts.
- Inspect the resulting SHA and changed files.
- Re-run affected CI after every corrective change.

**Acceptance:** no known layout defect, generic Reactor icon, fake live state, build failure, or frontend contract failure remains on the final SHA.

## Carry-forward from the previous roadmap

Already present and retained:
- lazy-loaded workspace routes;
- shared Reactor live telemetry surface;
- desktop topology / mobile feed split;
- truthful empty and terminal states;
- source chips and history filtering;
- reduced-motion and safe-area tokens;
- frontend responsive and Reactor integrity contracts.

This overhaul does not regress those features; it makes their visual language explicit and removes the remaining home-shell/iconography defects.

## Premium details

1. Exact action-rail alignment on the home hero.
2. Reactor cooling-tower product mark.
3. Stable stateful motion: active moves, done settles.
4. Live/history distinction that never masquerades as current activity.
5. Focus rings that remain visible against the dark surfaces.
6. Desktop topology remains spatial context rather than a second fake timeline.
7. Mobile remains feed-first rather than a shrunken desktop.
8. Truthful degradation when live telemetry is missing.

## Final gate

Apex Atlas is not considered finished merely because it builds. The final SHA must have the roadmap and phase plans committed, the frontend contracts green, the production build green, and the empirical backend campaign independently completed before the repository can be called fully certified.
