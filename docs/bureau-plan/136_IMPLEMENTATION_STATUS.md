# Volume 136 — Implementation Status

## Honest completion

| Layer | % |
|-------|---|
| In-repo code path | **~97%** |
| Product scoreboard proven | **0%** until live COMPARE on Replit |
| **Overall** | **~91%** |

## Complete in code

- Free dig (no force_*) + `pnpm run check:no-force-dig`
- Promote / rehydrate (+ case promote / index invalidate)
- Source lock: agentic/notice vs issuer in in-house, phase-j, **ingest-enrichment**, **deep-web pipeline**
- Outcome honesty (org dig ≠ personal direct)
- Depth + researchDepth Launch
- DigSpan llm/tool/promote + agentName
- SC13 notice window
- Identity collision + graph gate
- Scoreboard rubric + `scoreboard:shell` / `scoreboard:score` / `scoreboard:compare-template`
- phoneSource on entities UI

## Operator

```bash
git pull origin main
pnpm run check:no-force-dig
pnpm run scoreboard:score
pnpm run scoreboard:compare-template
# restart API — then singleTargetId re-cook — fill COMPARE_*.md
```

## Remaining (cannot finish offline)

Live scoreboard mean ≥ 1.0 on ≥8 fixtures with zero -1s.
