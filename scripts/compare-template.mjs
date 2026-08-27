#!/usr/bin/env node
/** Emit COMPARE_YYYY-MM-DD.md template for live scoreboard (Vol 16/68/76). */
const d = new Date().toISOString().slice(0, 10);
const sha = process.argv[2] || "TIP_SHA";
console.log(`# COMPARE_${d}

Tip: \`${sha}\`
Integrity: (from /api/healthz bureauIntegrity)
Depth: standard
Fixtures: (singleTargetId re-cook)

## Scoreboard

| id | target | Apex outcome | phone | phoneSource | baseline note | score | loss code |
|----|--------|--------------|-------|-------------|---------------|-------|-----------|
| A1 |  |  |  |  |  |  |  |
| A2 |  |  |  |  |  |  |  |
| B1 |  |  |  |  |  |  |  |
| B2 |  |  |  |  |  |  |  |
| C1 |  |  |  |  |  |  |  |
| C2 |  |  |  |  |  |  |  |
| D1 |  |  |  |  |  |  |  |
| D2 |  |  |  |  |  |  |  |

## Summary
- mean score:
- any -1 (wrong person): yes/no
- milestone pass (≥8 rows, mean ≥ 1.0, zero -1): yes/no

## Trajectory notes
- free dig web_search/visit seen: yes/no
- force_* lines seen: must be no

## Loss codes
L-EMPTY L-ISSUER L-ORG-AS-DIRECT L-COLLISION L-SCRIPT L-TIMEOUT L-PROMOTE
`)
