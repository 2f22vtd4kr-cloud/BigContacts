# Volume 28 — Discovery Subsystem

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Goal

Admit **real public people** into the ledger with provenance, capital relevance signals, and dedupe — without synthetic rows.

## Inputs

- Registry harvests (EDGAR, CH, BRREG, BODACC, …)
- Category / market seeds for broad discovery (not dig scripts)
- Optional aircraft/land registries when enabled historically

## Outputs

- Entity rows with source notes
- Optional company anchors for secondary dig
- Jobs progress under registry taxonomy messages

## Rules

1. No demo HNWI cards on cold boot
2. Shuffle deterministic EDGAR terms/offsets so Launch is not always the same first name
3. Dedupe normalized names (middle initials)
4. Discovery should not mark organization_contact as personal
5. Discovery may attach issuer phones as org only

## Handoff to dig

Selected entities enter free ReAct dig with orientation + objective. Discovery provenance remains in notes/evidence.

## Anti-patterns

- Burning full dig force-playbook during discovery admit
- Inserting Steam/physics “Atlas” false positives from naive name search
- Treating discovery volume alone as product success without dig card quality
