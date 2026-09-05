# Volume 107 — Tool Observation Quality

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

Free agents are only as good as what they see after a tool call.

## SERP observations should include

- Title, URL, snippet for top results  
- Provider name if useful for debugging  

## Visit observations should include

- Final URL  
- HTTP status or error class  
- CONTACT FACTS extracted  
- Short text excerpt if no facts  

## Registry observations should include

- Hit count, key fields, source system name  
- Auth errors as clear text (e.g. OC 401)  

## Never

- Silent empty string on failure  
- Fake success HTML  

Better observations → better free next steps → less pressure to script.
