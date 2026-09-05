# Volume 177 — Full-Circle Contact Inventory (What “Done” Means for a Target)

## Definition

A target research pass is **contact-complete** only when the system has either:

**(A)** Placed the best available public routes on the card surface (primary + chips), with sources, or  
**(B)** Proven via DigSpan + empty non-trash evidence that no public route was findable under the depth budget, with integrity ok.

“Phases finished” is not contact-complete. “cookedAt set” is not contact-complete. “Job done” is not contact-complete.

## Inventory checklist (operator + future automated audit)

For each cooked target, audit:

1. **Primary phone** present? source? mark?
2. **Primary email** present? source? mark?
3. **LinkedIn** present?
4. **Additional phones** in chips or evidence?
5. **Additional emails** in chips or evidence?
6. **Related people** listed if issuer known?
7. **Company/domain** anchor in metadata?
8. **DigSpan** shows search and preferably visit?
9. **Outcome** honest vs sources?
10. **Baseline gap** — did chat find something missing here?

If 1–3 are all empty and 8 shows weak dig, the pass is **failed** even if status is done.

## Automated inventory (future batch)

`GET /api/ingest/scoreboard-snapshot` is the seed. Extend with `inventoryFlags[]` per row: `no_phone`, `no_email`, `no_spans`, `org_only`, `notice`, `missed_public_suspected`.

## Why inventory beats vanity metrics

Vanity: entities cooked, phases, embeddings built.  
Product: **reachable public routes per target**.

This volume exists so roadmaps cannot prioritize embeddings over REACH.

## Relationship to maximum public surface

Vol 166 defines what to hunt. This volume defines how to know whether the hunt **stuck to the card**. Promote, protect, and UI are the glue; inventory is the audit.

## Batch implication

Any batch that ships new enrichment without improving inventory fill rate on fixtures is mis-ordered relative to the north star.

