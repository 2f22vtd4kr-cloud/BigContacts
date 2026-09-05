# Volume 113 — Replit Operator Extended

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## After git pull

1. Confirm tip SHA matches origin/main  
2. API restart if server code changed  
3. UI build if apex-finder changed: pnpm --dir artifacts/apex-finder run build  
4. healthz  
5. Cold load desk — no demo HNWI  

## Secrets checklist (names only)

SERPER_API_KEY, GROQ, GEMINI/GOOGLE, NVIDIA/Integrate, MISTRAL, optional Tavily/Exa/Scrapfly/ZenRows, DATABASE_URL, REDIS_URL_1 preferred single  

## When Redis bleeds

Collapse to one URL; slow status polls; memory job fallback for single node.
