# Volume 266 — Breadth Then Narrow (Apex Translation)

## Why this volume exists

Anthropic’s multi-agent Research system and classical OSINT tradecraft both favor **broad recall then precise exploitation**: first assemble the right candidate set, then spend expensive depth budget on identities that can actually yield attributable public routes. Apex under delivery pressure inverted this pattern—running deep scripted enrichment across registry-scale name dumps (FAA-style bulk)—and produced an honest ledger of thin cards. Discovery-first plus free dig is the architectural correction. This volume states the phase contract so plan authors do not “optimize” by digging everyone or by asking discovery to invent phones.

## External pattern

Anthropic Research: lead plans coverage; workers explore **independent facets**; synthesis merges; effort scales with question breadth. Simple questions stay single-executor. Broad questions pay the multi-agent token multiplier.

OSINT: collection plan → source survey → target prioritization → deep collection → analysis. Skipping prioritization burns sources and creates false confidence.

## Phase A — Breadth (discovery)

**Goal:** Admit people worth digging. Not contacts.

Mechanisms on main:

- Free discovery agent (LLM people hunt) with a soft objective; trajectory under DigSpans `agentName: discovery`.
- Template and registry lanes may still run but are **soft-retired after the agent admits** (override only with `APEX_FORCE_TEMPLATE_DISCOVERY=1`).
- Admit fitness cares about name quality and public footprint hints—not fabricated Personal vectors.

**Outputs:** Entity (or candidate) rows; thin cards allowed; optional evidence anchors.

**Non-outputs:** Personal phone/email as discovery’s deliverable. Discovery that writes Personal is a defect, not a feature.

**Budget:** Discovery agent hard timeouts scale with `researchDepth` (fast/standard/deep) when discovery-first Launch sets depth. Breadth spend must leave dig budget for Phase B.

## Phase B — Narrow (dig)

**Goal:** Public, attributable routes for **one** identity at a time.

Mechanisms:

- `singleTargetId` path or research queue over admitted ids.
- Free ReAct dig (`runTargetContactAgent` → `runAgenticWebResearch`); no `force_*` hop controllers.
- Promote + auto-rehydrate; Live Desk binds ContactSurface via telemetry `entityId`.

**Outputs:** Card columns + `contact_evidence` bag + outcome enum under honesty rules.

**Non-outputs:** Parallel dig agents on the same `entityId`; MCTS as a substitute for dig (MCTS may run only when dig left routes empty on single-target).

## Phase relationship to Anthropic workers

Correct parallelization lives in **Phase A lanes** (independent discovery facets) or in **tool calls inside one dig** (multiple searches over time in one context). Incorrect parallelization is multiple promote owners in Phase B.

## Operator mapping

| Desk action | Phase |
|-------------|-------|
| Launch discovery-first | A then B on admits |
| Dig contacts (profile/entities) | B only |
| Dig selected (≤5) | B sequential |
| Rehydrate | Post-B promote only |
| Stop dig | Ends B early; keeps partial evidence |

## Scoreboard relationship

The analytic scoreboard (vol 87, 255) grades **Phase B outcomes** on cooked cards. Discovery volume, job count, or span count cannot pass `milestonePass`. Empty cards after pure breadth are expected; empty cards after dig are the product problem.

## Anti-patterns (normative refusals)

1. Narrow without breadth on a cold desk (digging noise ids).
2. Breadth that writes Personal contacts.
3. Narrow × N parallel on the same id.
4. Breadth forever without dig spend.
5. Raising depth tier to “fix” discovery quality—depth is dig budget, not admit magic.

## Implementation anchors

- Orchestrator: `discoveryFirst` vs `singleTargetId` branch (vol 254).
- Discovery agent module + soft-retire templates.
- Desk CTAs: vols 251, 270.
- Live gate: vol 255, `scripts/replit-live-scoreboard.md`.

## Planning rule

If a proposal spends tokens, label it **A-spend** or **B-spend**. If it writes `entities.phone`, it is B-spend and must go through dig + promote ownership—not a new breadth agent.
