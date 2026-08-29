#!/usr/bin/env node
/** Emit a reproducible Apex-vs-independent-research comparison record. */
const d = new Date().toISOString().slice(0, 10);
const sha = process.argv[2] || "TIP_SHA";
console.log(`# COMPARE_${d}

Tip: \`${sha}\`
Host:
Integrity: (from /api/healthz bureauIntegrity — must not be critical)
Depth: standard
Trials per fixture: 3 (record actual count; do not silently cherry-pick a run)
Baseline run: independent of Apex outputs (yes/no)

## Fixtures (freeze before Apex run)

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

## Trial-level scoreboard

| fixture | trial | jobId | Apex outcome | primary route | evidence URLs | actions | duration ms | baseline primary | score | L-code |
|---------|-------|-------|--------------|---------------|---------------|---------|-------------|------------------|-------|--------|
| A1 | 1 |  |  |  |  |  |  |  |  |  |

## Aggregate scoreboard

| id | Apex best/median | baseline primary | Apex evidence quality | baseline evidence quality | wrong-person? | final verdict |
|----|------------------|------------------|------------------------|---------------------------|----------------|---------------|
| A1 |  |  |  |  |  |  |
| A2 |  |  |  |  |  |  |
| B1 |  |  |  |  |  |  |
| B2 |  |  |  |  |  |  |
| C1 |  |  |  |  |  |  |
| C2 |  |  |  |  |  |  |
| D1 |  |  |  |  |  |  |
| D2 |  |  |  |  |  |  |

L-codes: L-EMPTY | L-ISSUER | L-ORG-AS-DIRECT | L-COLLISION | L-NO-DIG | L-OVERWRITE | L-SCRIPT | L-STALE-UI | L-INTEGRITY | (none)

## Free-ReAct audit
- Free dig spans (search/visit) present for every trial?
- Was the target supplied without target-specific research hints?
- Did the model choose each research action?
- Were any force-hop, fixed-step, preferred-domain, or scripted-playbook interventions observed?
- Did the model change strategy after a weak/dead lead where appropriate?
- Did it stop when evidence was sufficient rather than chasing a fixed hop count?
- Record the complete ordered action trajectory for every trial.

## Evidence / promotion audit
- Every promoted contact fact has an exact http(s) source URL?
- Identity attribution agrees with the target?
- Personal and organization scope are distinguished?
- Final entity card rehydrates the same promoted facts after reload?
- Any evidence-only finding that failed to reach the card?

## Summary
- fixtures completed:
- total trials actually run:
- mean score:
- median score:
- any -1 (wrong person): yes/no
- milestone pass (>=8 fixtures, mean >= 1.0, zero -1, integrity ok): yes/no
- Apex wins:
- ties:
- Apex loses:
- verdict: Apex wins / tie / Apex loses

## Failure classification
Discovery | Identity | Search | Browsing | Attribution | Contact extraction | Promotion | Memory | Model | Tool | Timeout | Provider | Persistence | UI

## Next fix (one class only)
`);
