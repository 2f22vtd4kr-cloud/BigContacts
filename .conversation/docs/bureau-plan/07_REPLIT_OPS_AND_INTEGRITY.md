# Volume 07 — Replit Ops and Integrity

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**See also:** `docs/PRE_REPLIT_GO.md`, `docs/REPLIT_FROM_ZERO_PROMPT.md`, `docs/RUN_BUREAU.md`

---

## 1. Boot gate

1. `git pull origin main` — record SHA  
2. Secrets in Replit Secrets UI (full name list in from-zero prompt; **one Redis** preferred)  
3. `pnpm install` as needed; desk build: `pnpm --dir artifacts/apex-finder run build`  
4. API on **8080**, public `/` = desk, `/api/*` = API  
5. `GET /api/healthz` → ok, **bureauIntegrity not critical**, autoPipeline false  
6. Smoke Launch → Stop → idle before long batches  

---

## 2. Secrets discipline

- Ask **all** official secret names; operator may leave optional empty  
- **REDIS_URL_1 only** on free Upstash—extra slots + status polls burn quota  
- Never commit values; never print values in chat  
- Restart API after secret or api-server changes  

---

## 3. Failure modes and fixes

| Symptom | Likely cause | Direction |
|---------|--------------|-----------|
| Launch jobId then idle | Redis down / sticky exhausted / no memory fallback | Recover PING; memory jobs; pin lock |
| DB 0/5 after good run | Sticky in-process exhausted flag | Auto-clear on PING |
| LIVE after stop | Stale events / zombie job | Hard-idle; clear lock; age-out |
| Status timeout under dig | Event loop blocked | Yields; Redis budgets; later worker |
| Blank public URL | SPA path / port publish | dist/public; publish desk port |

---

## 4. Acceptance tests (ops)

1. healthz ok with Serper + Groq + Gemini keyed  
2. Launch 202 → Stop 200 → idle  
3. Second Launch works after Stop  
4. status returns during a short dig  
5. Desk HTML on public URL contains Apex Atlas  

---

## 5. Handoff to Volume 08

Volume 08 is the **implementation roadmap** ordered by ROI for bureau superiority.
