# Phase 2 Plan — Reactor Iconography

## Problem
Reactor is represented by generic CPU/radar imagery in places where it should have a distinctive product mark. That makes the feature feel like a generic developer console rather than Apex Atlas.

## Implementation
- Add a shared ReactorMark component: a restrained cooling-tower silhouette with a subtle plume/heat-wave detail.
- Use it in the main sidebar Reactor navigation item.
- Use it in the home-page Reactor action and shortcut.
- Keep method-specific Lucide icons inside the live activity feed; those icons describe actual observed methods and should not be replaced with decorative art.

## Verification
- No CPU icon remains as the semantic Reactor navigation icon.
- The mark is aria-hidden when paired with text and has no fake state semantics.
- Reduced motion never affects the icon.
