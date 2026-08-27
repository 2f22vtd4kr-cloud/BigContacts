# Volume 287 — Done Policy for Free Dig

## Decision

The dig model may `done` when it judges the public surface for this pass is exhausted or sufficient. The harness may reject `done` **only** when the model has done nothing: zero searches, zero visits, and zero findings in the bag.

## Forbidden done-funnels (regressions)

- “Must find a related officer before done.”
- “Must visit about/contact even if findings exist.”
- “Must run ≥N searches” when findings already include source-backed routes.
- Soft-reject loops that burn the iteration budget without new information.

## Allowed

- One soft hint that more surface might exist—then accept `done` if the model insists.
- Keep auto-extracted CONTACT FACTS in the bag even when the JSON `findings` array is empty.

## Rationale

A general research agent stops when the page evidence is enough. Scripted refuse-done policies were a major reason Apex looked weaker than a single chat agent on public targets.
