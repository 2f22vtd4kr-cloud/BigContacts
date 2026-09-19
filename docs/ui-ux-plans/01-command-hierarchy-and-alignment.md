# Phase 1 Plan — Command Hierarchy & Alignment

## Problem
The reference desktop home screen has a primary green Launch control that does not share the same left/right rail as the Reactor and Discover controls below it. Existing CSS attempted to correct this with DOM-position selectors, which is fragile and can silently stop working when the JSX structure changes.

## Implementation
- Give the home hero action group an explicit semantic class.
- Make the action group a fixed desktop rail with a full-width primary row and an equal two-button secondary row.
- Keep the depth selector next to the primary CTA, but do not let it determine CTA width.
- Stack controls on narrow screens.
- Add explicit focus-visible treatment and keep the launch component's API/behavior unchanged.

## Verification
- Desktop: primary CTA edges equal secondary rail edges.
- Tablet: no overflow.
- Mobile: controls remain full width and >=44px tall.
- Running state still exposes Stop and navigates to Reactor as before.
