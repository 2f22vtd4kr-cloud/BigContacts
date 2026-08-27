# Volume 252 — Research Depth Tiers (Operator Product)

## Source of truth

`artifacts/api-server/src/src/lib/research-depth.ts`

| Tier | Agentic iterations (approx) | Hard timeout | Use |
|------|----------------------------|--------------|-----|
| fast | 10 | 120s | Smoke / cheap pass |
| standard | 16 | 210s | Default single-target dig |
| deep | 20 | 360s | Hard targets / VIP |

`forcePendingVectorBias` is **false** on all tiers — depth is budget, not a scripted pending-vector path.

## UI

- Profile: fast | standard | deep
- Entities: fast | standard | deep
- Launch button (non-header): same when `opts.researchDepth` not fixed

## Pipeline

Launch body `researchDepth` sets `process.env.RESEARCH_DEPTH` for the job.
Single-target defaults to **standard** when depth omitted.

## Honesty

Deeper does not guarantee a phone. Scoreboard still grades attributable public routes only.
