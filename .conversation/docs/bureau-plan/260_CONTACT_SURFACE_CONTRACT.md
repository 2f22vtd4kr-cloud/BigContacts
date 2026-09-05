# Volume 260 — ContactSurface Contract

## Role

Maximum **public** route surface on the desk — not a second promote engine.

## Inputs

- Presented `contacts[]` from API (preferred)
- Fallback entity columns: phone, email, linkedinUrl
- `evidenceCount` for empty-state CTA
- `onRehydrate` optional

## Marks

- **Personal** vs **Org** vs candidate — never upgrade org to Personal in the UI
- Empty + evidenceCount > 0 → prompt rehydrate / dig, do not invent values

## Placements

Entities (row + mobile card), profile hero, Live Desk (via `entityId` + fetch)

## Live Desk dependency

`atlasTelemetry.entityId` must be set during dig (`setAtlasTelemetry` third arg bound into JSON).
