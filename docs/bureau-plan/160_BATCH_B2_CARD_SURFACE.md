# Volume 160 — Batch B2 Spec: Card Surface Completeness

## Scope

Implement ContactSurface + evidence-rich empty CTA + org chips always visible when evidence has org phones.

## Code touch targets (indicative)

- `presented-contacts.ts` — marks for organization
- `entities.tsx` — use ContactSurface
- `mobile-reactor-flow.tsx` / Live Desk card preview
- rehydrate button → POST `/api/entities/rehydrate-contacts`

## Acceptance

1. Org-only fixture shows org chip without personal phone.
2. Notice fixture shows notice source on primary.
3. Evidence count > 0 and empty columns → CTA visible.
4. CTA rehydrate fills primary when promote rules allow.
5. No tel: href contains source text.

## Non-goals

- New dig tools
- Paid data vendors
- Redesign of entire navigation chrome

