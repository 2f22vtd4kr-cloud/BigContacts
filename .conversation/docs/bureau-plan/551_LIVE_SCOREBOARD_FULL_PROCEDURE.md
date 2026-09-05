# Volume 551 — Live Scoreboard Full Procedure

## Purpose
Operationalize vol 275 on a real host so Apex can claim or fail the dig-desk wave honestly.

## Preconditions
- git tip includes dig-desk promote locks and free dig
- Secrets: dig LLM + search; REDIS_URL_1 preferred
- ENABLE_AUTO_PIPELINE=false
- RESEARCH_DEPTH=standard unless testing deep

## Procedure
1. git pull origin main && restart API and UI after build if needed
2. GET /api/healthz — refuse quality claims if bureauIntegrity is critical
3. Select ≥8 fixture entity ids spanning issuer-trap, org-only, collision, thin card
4. For each id: Dig contacts (profile or entities) at standard; wait until atlas-status idle
5. Optionally POST rehydrate-contacts bulk
6. GET /api/ingest/scoreboard-snapshot — store mean, milestonePass, per-id rows
7. For each score ≤0: open DigSpan, assign L-code from 402–406 family
8. Ship at most one fix class; re-cook **same** ids
9. Write docs/comparisons/COMPARE_YYYY-MM-DD.md

## Pass criteria
milestonePass true with integrity ok and n large enough (prefer ≥8). Free dig trajectories present (search/visit). No force_* in check-no-force-dig.

## Fail criteria
Empty cards with dig extracts (L-EMPTY), issuer-as-personal (L-ISSUER), no dig spans (L-NO-DIG), integrity critical during run.
