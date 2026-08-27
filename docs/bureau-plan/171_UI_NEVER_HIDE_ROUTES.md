# Volume 171 — UI Must Never Hide Recovered Routes

## Binding UI law

If backend has a non-trash phone, email, or social on the entity or in presented contacts, the **Entities row and card** must show it. Hiding org routes to “declutter” recreates the single-LLM loss: chat shows three lines; Apex shows none.

## Required visible elements

1. Primary value (best tier)
2. Source label (muted, not inside tel:)
3. Mark chip (personal / organization / social)
4. Additional routes as chips until overflow “+N”
5. Evidence count if routes exist only in bag

## Decluttering allowed

- Collapse notes
- Paginate evidence drawer
- Limit related names to 6 + more

## Decluttering forbidden

- Dropping org phone from row because personal email exists
- Dropping second phone
- Filtering hasPhone false for org-marked phones
- “Simplify REACH” that only shows LinkedIn

## Mobile

Horizontal chip scroll is preferred over dropping chips.

## Acceptance

Side-by-side screenshot: chat paste with IR phone + Apex card must both show a phone line when dig succeeded.

