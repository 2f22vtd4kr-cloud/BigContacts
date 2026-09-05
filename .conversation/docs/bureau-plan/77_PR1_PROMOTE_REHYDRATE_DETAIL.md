# Volume 77 — PR1 Detail: Promote + Rehydrate Guarantees

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Queue:** Vol 70 item 1

## Goal

No dig that wrote URL-backed contact_evidence may leave the entity card empty unless identity collision blocked promote.

## Implementation steps

1. Trace every caller of agentic dig in bureau-agentic-pass / target-contact-agent / orchestrator  
2. Ensure each awaits `promoteBureauContactsToEntityCard` or `rehydrateEntityCardFromEvidence`  
3. Ensure list API cache/ETag invalidated  
4. Add integration test with fixture evidence rows  

## Done when

- Unit/integration green  
- One live re-cook: evidence nonempty → card nonempty (or explicit collision reason in meta)  
- Span `promote` emitted  

## Out of scope

UI chrome, new tools, force hops.
