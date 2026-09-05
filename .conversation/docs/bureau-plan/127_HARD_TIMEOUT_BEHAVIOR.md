# Volume 127 — Hard Timeout Behavior

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

When hardTimeoutMs elapses mid-dig:

1. Stop new llmStep  
2. Preserve findings bag  
3. Persist/promote partials  
4. Mark END_TIMEOUT in result  
5. Job may continue next target or complete  

Timeout is a budget fence, not a reason to force remaining hops.
