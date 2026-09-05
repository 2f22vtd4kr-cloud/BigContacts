# Volume 72 — Promote Code Walkthrough (Implementer Notes)

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Primary file:** `lib/bureau-contact-persist.ts`

## Entry points

1. After dig vectors ready → promote with items list  
2. `rehydrateEntityCardFromEvidence(entityId)` → promote from DB evidence only  
3. Batch rehydrate helper for backfill  

## Selection logic (conceptual)

- Load entity current phone/email/sources  
- Rank candidate items (agentic preferred over stranded evidence_only)  
- Patch phone/email when better source wins  
- Set phoneSource agentic-web vs agentic-web-org from source suffix  
- Recompute outcome; force organization_contact for *-org sources  
- Write entities row; invalidate caches upstream  

## Test matrix (must automate)

| Setup | Expect |
|-------|--------|
| evidence phone + url, empty card | phone filled |
| card EDGAR-Phone, new agentic phone | agentic wins |
| card agentic-web, incoming EDGAR-Phone | agentic remains |
| source ends with -org | organization_contact |
| collision risk true | no personal direct |

## Live proof recipe

```
POST atlas-run singleTargetId=<id> runResearch true
GET entity card
Compare to contact_evidence rows
```

If evidence has values and card empty → bug in this module or caller not awaiting promote.
