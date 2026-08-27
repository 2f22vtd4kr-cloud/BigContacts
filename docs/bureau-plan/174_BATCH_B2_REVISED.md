# Volume 174 — Batch B2 Revised: Show Everything Public

## Goal

Card and list UI surface **all** promoted and presentable routes; evidence-rich empty gets rehydrate CTA; org never filtered out.

## Deliverables

1. ContactSurface shared component
2. Entities row uses it
3. Live Desk preview uses it
4. present layer includes organization phones/emails
5. Tests: org-only fixture not empty in present output

## Explicit non-goal

Any code path that drops org contacts “to reduce noise.”

## Acceptance

- Org-only → visible org chip
- Notice → primary with source
- Personal + org → both visible
- Empty columns + evidence → CTA
- tel: href clean

