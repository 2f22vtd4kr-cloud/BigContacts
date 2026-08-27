# Volume 108 — Illustrative Free Trajectories (Examples, Not Scripts)

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

These are **examples** of what free dig *might* look like. They are **not** required hop lists. Different targets produce different paths.

## Example 1 — Public company CEO

1. Model thought: need employer official site  
2. web_search: "Jane Doe ExampleCorp CEO"  
3. Observation: links to example.com/about and SEC filing  
4. visit example.com/about  
5. CONTACT FACTS: optional IR email  
6. Model thought: confirm via filing  
7. registry_search EDGAR  
8. done with findings bag  

Another run might visit the filing first. Both are valid.

## Example 2 — SC 13D reporting person

1. web_search name + issuer  
2. visit SEC filing URL from SERP  
3. extract notice block / reporting person  
4. web_search firm name HQ  
5. visit firm site  
6. done  

## Example 3 — Collision risk

1. web_search common name + city  
2. visit wealth-advisor directory hit  
3. Observation shows different employer  
4. Model avoids promoting; searches issuer specifically  
5. done with org-only or evidence_only  

## Anti-example (banned)

1. Runtime force_company_surface_search  
2. Runtime force_org_email  
3. Model only says continue  
4. Budget exhausted  

That anti-example is what Vol 101 forbids.
