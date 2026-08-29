#!/usr/bin/env node
/** Emit COMPARE_YYYY-MM-DD.md template with trajectory + evidence fields. */
const d = new Date().toISOString().slice(0, 10);
const sha = process.argv[2] || "TIP_SHA";
console.log(`# COMPARE_${d}

Tip: \`${sha}\`
Host:
Integrity: (from /api/healthz bureauIntegrity — must not be critical)
Depth: standard
n fixtures:
check-no-force-dig: OK / FAIL

## Fixtures (document before dig)

| id | entityId | name | class (issuer-trap/org-only/collision/thin/easy) | public hook |
|----|----------|------|--------------------------------------------------|-------------|
| A1 |  |  |  |  |
| A2 |  |  |  |  |
| B1 |  |  |  |  |
| B2 |  |  |  |  |
| C1 |  |  |  |  |
| C2 |  |  |  |  |
| D1 |  |  |  |  |
| D2 |  |  |  |  |

## Scoreboard

| id | jobId | Apex outcome | phone | phoneSource | baseline primary | evidence URLs | score | L-code |
|----|-------|--------------|-------|-------------|------------------|---------------|-------|--------|
| A1 |  |  |  |  |  |  |  |  |
| A2 |  |  |  |  |  |  |  |  |
| B1 |  |  |  |  |  |  |  |  |
| B2 |  |  |  |  |  |  |  |  |
| C1 |  |  |  |  |  |  |  |  |
| C2 |  |  |  |  |  |  |  |  |
| D1 |  |  |  |  |  |  |  |  |
| D2 |  |  |  |  |  |  |  |  |

L-codes: L-EMPTY | L-ISSUER | L-ORG-AS-DIRECT | L-COLLISION | L-NO-DIG | L-OVERWRITE | L-SCRIPT | L-STALE-UI | L-INTEGRITY | (none)

## Process
- Free dig spans (search/visit) present for each dig?
- discoveryFirst used? (should be false for single-target proof)
- tool calls: count and ordered action sequence for each dig
- evidence URLs: at least one source supporting every promoted contact fact
- trajectory note: record any strategy change, dead-end recovery, or early stop

## Summary
- mean score:
- any -1 (wrong person): yes/no
- milestone pass (≥8 rows, mean ≥ 1.0, zero -1, integrity ok): yes/no
- verdict: Apex wins / tie / Apex loses

## Next fix (one class only)
`);
