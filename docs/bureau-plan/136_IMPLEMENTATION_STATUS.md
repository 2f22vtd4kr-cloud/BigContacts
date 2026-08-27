# Volume 136 — Implementation Status (Live Code vs Plan)

**Updated:** tip after depth timeouts, jobId promote path, check:no-force-dig.

## Completion

| Layer | % | Reality |
|-------|---|---------|
| **Code path (in-repo plan items)** | **~92%** | Free dig, promote, source lock, outcomes, depth, spans, collision, CI guard |
| **Product win (scoreboard)** | **~0% proven** | Requires Replit re-cook + COMPARE file |
| **Combined honest overall** | **~82%** | Cannot claim 100% without live scoreboard |

## Done in code

- Free ReAct dig (`agentic-web-research`) — no force_* (CI: `pnpm run check:no-force-dig`)
- Promote + rehydrate after dig; empty list rehydrates evidence
- Agentic phone protected from issuer overwrite (`phone-source-priority`)
- Outcome honesty agentic-web-org / EDGAR / generic
- Identity collision hosts expanded
- DigSpan + jobId on target dig + promote
- Depth profiles: maxIterations + hardTimeoutMs
- Pause/Resume/Stop + DigSpan trajectory UI
- EDGAR notice-line extraction + tests present
- Integrity includes Serper in webSearchActive

## Cannot finish from this environment

1. Deploy tip on Replit  
2. Re-cook fixtures (Vol 68/121)  
3. File `docs/comparisons/COMPARE_*.md`  
4. Mean score ≥ 1.0 → tag `bureau-scoreboard-pass` (Vol 100)  

Until step 4, **product superiority is unproven** regardless of code %.

## Operator next

```bash
git pull origin main
pnpm run check:no-force-dig
# on Replit: deploy, RESEARCH_DEPTH=standard, singleTargetId re-cook, scoreboard
```
