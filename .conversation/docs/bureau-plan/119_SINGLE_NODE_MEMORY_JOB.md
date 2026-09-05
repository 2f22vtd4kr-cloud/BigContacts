# Volume 119 — Single-Node Memory Job Mirror

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

Replit single instance must Launch even if Redis is briefly unhappy.

- setActiveJob: redis try + memory mirror  
- getActiveJob: memory first or redis with budget  
- Stop clears both  

Prevents “dead Launch button” false product death.
