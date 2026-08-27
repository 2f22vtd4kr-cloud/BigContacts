#!/usr/bin/env node
/** Emit COMPARE_YYYY-MM-DD.md template (Vol 16/276/552/1602). */
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

| id | jobId | Apex outcome | phone | phoneSource | baseline primary | score | L-code |
|----|-------|--------------|-------|-------------|------------------|-------|--------|
| A1 |  |  |  |  |  |  |  |
| A2 |  |  |  |  |  |  |  |
| B1 |  |  |  |  |  |  |  |
| B2 |  |  |  |  |  |  |  |
| C1 |  |  |  |  |  |  |  |
| C2 |  |  |  |  |  |  |  |
| D1 |  |  |  |  |  |  |  |
| D2 |  |  |  |  |  |  |  |

L-codes: L-EMPTY | L-ISSUER | L-ORG-AS-DIRECT | L-COLLISION | L-NO-DIG | L-OVERWRITE | L-SCRIPT | L-STALE-UI | L-INTEGRITY | (none)

## Process
- Free dig spans (search/visit) present for each dig? 
- discoveryFirst used? (should be false for single-target proof)

## Summary
- mean score:
- any -1 (wrong person): yes/no
- milestone pass (≥8 rows, mean ≥ 1.0, zero -1, integrity ok): yes/no
- verdict: Apex wins / tie / Apex loses

## Next fix (one class only)
`);

# postmortem template
cat > scripts/postmortem-template.mjs << 'EOF'
#!/usr/bin/env node
/** L-code postmortem template (Vol 1002/1003/1402). */
const d = new Date().toISOString().slice(0, 10);
const lcode = process.argv[2] || "L-EMPTY";
const entity = process.argv[3] || "ENTITY_ID";
const sha = process.argv[4] || "TIP_SHA";
console.log(`# POSTMORTEM_${lcode}_${d}_${entity}

Tip: \`${sha}\`
Entity id: ${entity}
L-code: ${lcode}
jobId:
Integrity:

## Symptom
(card fields / UI)

## Spans (quote 3–10 lines)
\`\`\`
\`\`\`

## Evidence bag
count:
sample values:

## Root cause
(one of: promote not called | final-review null | enricher overwrite | present layer | cache | identity gate | no dig | issuer priority)

## Fix
PR / tip:
tests run:

## Re-cook
before phone/source/outcome:
after:
`);

# fixture registry template
cat > scripts/fixture-registry-template.mjs << 'EOF'
#!/usr/bin/env node
/** Fixture registry template (Vol 1005/1328). */
const d = new Date().toISOString().slice(0, 10);
console.log(`# Fixture registry ${d}

| entityId | name | class | public hook | last score | last L-code | last tip | last jobId |
|----------|------|-------|-------------|------------|-------------|----------|------------|
|  |  | issuer-trap |  |  |  |  |  |
|  |  | org-only |  |  |  |  |  |
|  |  | collision |  |  |  |  |  |
|  |  | thin |  |  |  |  |  |
|  |  | easy |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
`);

# Expand replit-scoreboard-check.sh
cat > scripts/replit-scoreboard-check.sh << 'EOF'
#!/usr/bin/env bash
# Operator scoreboard check after re-cook (Vol 68/76/551/1501).
set -euo pipefail
HOST="${1:-http://127.0.0.1:8080}"
echo "== tip =="
git rev-parse --short HEAD 2>/dev/null || true
echo "== check-no-force-dig =="
bash "$(dirname "$0")/check-no-force-dig.sh" || true
echo "== healthz =="
curl -sS "$HOST/api/healthz" | head -c 3000 || true
echo
echo "== scoreboard-snapshot =="
curl -sS "$HOST/api/ingest/scoreboard-snapshot?limit=30"
echo
echo "== next =="
echo "If integrity critical: fix keys before claims."
echo "If milestonePass false: assign L-codes, one fix class, same-id re-cook."
echo "Template: pnpm run scoreboard:compare-template"
