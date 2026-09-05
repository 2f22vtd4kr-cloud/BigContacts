# Volume 73 — Enricher Overwrite Audit

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Problem class

Later deterministic enrichers (EDGAR phone attach, CH main line, website scrape) run **after** dig and can clobber better agentic values if they assign blindly.

## Audit procedure

1. `rg -n "phoneSource|EDGAR-Phone|entitiesTable.phone" artifacts/api-server/src/src/lib`  
2. Every write to entities.phone must check existing phoneSource  
3. Policy from Vol 11 Table B  

## Patch pattern

```
if (existing.phoneSource starts with agentic-web) skip issuer phone write
if (incoming is notice-line && existing is EDGAR-Phone) allow
```

## Acceptance

Unit test: agentic then edgar enrich → agentic remains.  
Live: Feinberg/Gund re-cook does not regress to issuer-only after full circle.
