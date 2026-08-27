# Volume 78 — PR2 Detail: Agentic Source Lock

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Queue:** Vol 70 item 2

## Goal

`phoneSource` in `agentic-web*` cannot be replaced by `EDGAR-Phone` or CH main line in later enrichers.

## Files to audit

- bureau-contact-persist (already partial)  
- EDGAR query / attach phone  
- in-house enricher / website phone  
- companies house attach  

## Test

```
entity.phoneSource = agentic-web
run edgar phone attach
assert phoneSource still agentic-web
```

## Done when

Test green + Feinberg-class live does not regress after full circle.
