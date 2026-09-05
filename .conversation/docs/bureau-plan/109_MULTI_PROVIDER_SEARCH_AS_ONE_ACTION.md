# Volume 109 — Multi-Provider Search as One Logical Action

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

When the model chooses `web_search` with a query, runtime may fan out Serper/Tavily/Exa and merge results. That is **harness parallelization**, not a dig script.

The model still chose **search** and **the query string**.  
Runtime must not replace the query with a forced template.
