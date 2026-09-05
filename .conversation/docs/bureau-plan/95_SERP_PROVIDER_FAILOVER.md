# Volume 95 — SERP Provider Failover

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Order (healthy)

1. Serper  
2. Tavily  
3. Exa (and secondary key if present)  
4. DDG / other free fallback if implemented  

## Integrity

If **all** commercial SERP slots empty and no working fallback → search leg critical.

## Operator

healthz must count Serper among live search providers (historical bug: Serper keyed but integrity ignored it).
