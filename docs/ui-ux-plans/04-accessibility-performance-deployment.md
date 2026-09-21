# Phase 6/7 Plan — Accessibility, Performance & Deployment Gate

## Accessibility
- Keyboard focus remains visible.
- Interactive controls are at least 44px on touch surfaces.
- prefers-reduced-motion removes decorative motion without hiding state.
- Screen-reader announcements use bounded/polite regions.

## Performance
- Keep heavy workspace routes lazy-loaded.
- Keep rendered live event counts bounded.
- Avoid decorative live animation while idle.
- Preserve the existing production chunk-size improvement.

## Deployment checks
1. Frontend responsive contract.
2. Reactor Live no-fabrication contract.
3. Reactor Live integrity contract.
4. Typecheck.
5. Production build.
6. Inspect changed-file diff for accidental API/research behavior changes.
7. Verify the final branch SHA and CI runs.
