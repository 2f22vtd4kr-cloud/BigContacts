# Apex Atlas (BigContacts) — Replit

Private OSINT desk: public contact routes on entity cards. **Zero synthetic HNWIs.**

## Replit production path (read this first)

| Item | Rule |
|------|------|
| Workflows | **API Server only** on `PORT=8080` |
| Preview | **`/`** = desk HTML (built `apex-finder`). **`/api`** = API. Never open `/api` as the app. |
| Frontend workflow | **Do not run** on Replit for preview (API serves the desk). |
| Auto pipeline | `ENABLE_AUTO_PIPELINE=false` |
| Redis | **One** of `REDIS_URL_1` or `REDIS_URL` is enough |
| Dig | Free ReAct — **no `force_*` hop scripts**. Models invent queries. |
| Product | **Card is the answer** (phone/email/LinkedIn + honest outcome). Evidence is provenance. |
| Proof | Live **scoreboard** (`milestonePass`) after single-target **Dig contacts** — not commit count. |

**Operator prompt (only one):** `docs/REPLIT_UPDATE_PROMPT_LATEST.md`  
**Boot:** `bash scripts/replit-boot.sh`  
**Gates:** `pnpm run check:no-force-dig` · `GET /api/healthz` (integrity not critical)

## Monorepo map

| Path | Role on Replit |
|------|----------------|
| `artifacts/api-server` | Express API + serves desk static |
| `artifacts/apex-finder` | Desk UI — **build** to `dist/public`, served by API |
| `lib/db` | Drizzle / Postgres |

## Dig contract

- **Dig contacts** → `singleTargetId` Atlas dig → agentic web research → promote onto card.
- Issuer EDGAR switchboard must not wipe dig/notice phones (`phone-source-priority`).
- Org routes stay labeled org; max public surface.
- Stuck job: Stop / `DELETE /api/ingest/atlas-lock`.

## Scoreboard

```bash
bash scripts/replit-scoreboard-check.sh https://YOUR_HOST
```

Integrity critical → fix search + dig LLM secrets, **restart API**, do not claim quality.
