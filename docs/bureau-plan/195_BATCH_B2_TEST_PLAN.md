# Volume 195 — Batch B2 Test Plan

## Unit

- present helper returns org routes when evidence has org phone
- honesty normalizer maps issuer+direct → organization_contact
- ContactSurface builds tel: without source in href

## Integration

- rehydrate on entity with evidence fills or preserves card
- list endpoint includes presentedContacts

## Manual

- Org-only fixture visible in UI
- Personal+org both visible
- Mobile dial works
- Evidence-rich empty shows CTA

## Scoreboard

- After B2, re-run fixtures; missed_public rate should drop if misses were UI/present

