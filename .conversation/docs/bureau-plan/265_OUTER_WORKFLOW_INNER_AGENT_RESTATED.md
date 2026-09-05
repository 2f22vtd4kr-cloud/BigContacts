# Volume 265 — Outer Workflow / Inner Agent (Restated After Dig Desk)

## Lineage

Vol 86 (hybrid orchestration), Vol 81 (workflow vs agent), Anthropic sequential tool-use + evaluator-optimizer patterns. Restated here because the dig-desk implementation wave made the boundary **code-real**, not only aspirational.

## Outer workflow (TypeScript owns process)

The outer loop is deterministic process control. It does not “think” about which SERP query to run next.

1. Accept launch body (canonical defaults + singleTargetId / discoveryFirst / researchDepth).
2. Pin job + lock; emit stage telemetry.
3. Branch:
   - **singleTargetId** → one full-circle enrich (dig-first contact agent, then secondary surfaces under promote rules).
   - **discoveryFirst** → discovery agent and/or soft-retired templates → admit candidates → dig queue.
4. For each dig target: cancel/pause checks → **inner agent dig** → **workflow promote/rehydrate** → optional narrate → yield event loop.
5. Optional MCTS / path research only when dig did not already write routes (single-target skip rule).
6. Terminal status; clear lock and DigSpans on stop.

Outer workflow is allowed to:

- Enforce depth budgets (`research-depth.ts`).
- Enforce integrity soft-gates (warn, still run).
- Skip phases that would fight dig ownership.
- Persist and rehydrate under source locks.

Outer workflow is **not** allowed to:

- Inject forced tool sequences into the ReAct loop.
- Clobber agentic phones with later EDGAR/notice fields (source lock).
- Mark scoreboard pass when integrity is critical.

## Inner agent dig (model owns search trajectory)

The inner agent owns:

- Query formulation and reformulation.
- Which tool to call next (search, visit, browser_fetch, etc.).
- When to stop given observation quality and budget.

The inner agent does **not** own:

- Direct SQL updates to entity columns (promote is workflow).
- Parallel writers on the same vector without synthesis.

### Depth tiers as outer knobs on inner budget

| Tier | Role |
|------|------|
| fast | Smoke / cheap |
| standard | Default dig |
| deep | Hard identity / VIP |

These change iterations and wall-clock only (`forcePendingVectorBias: false` on all tiers). Depth is not a scripted pending-vector mode.

## Evaluator-optimizer (still optional)

A post-dig critic that lists **gaps** (“no attributable mobile,” “only org switchboard”) may trigger **one** additional dig budget if integrity is ok. It must not invent contact values. Not required for scoreboard gate.

## Why operators still click Dig

The desk CTAs (profile, entities, Dig selected) are outer-workflow triggers with fixed payloads. They feel like “one button research” but the *thinking* stays inside the free dig. That is intentional product design aligned with Anthropic’s “effort scaling”: one person → one dig, not a swarm.
