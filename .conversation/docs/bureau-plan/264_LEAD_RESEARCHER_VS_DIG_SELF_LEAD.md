# Volume 264 — LeadResearcher vs Dig Self-Lead

## Why this volume exists

Anthropic’s multi-agent Research system centers a **LeadResearcher** that plans, spawns workers with separate context windows, synthesizes results, and optionally runs a citation pass. Apex adopted the *language* of multi-agent early (Boss, right-hand, dig, discovery) without always adopting the *constraint*: workers must own **independent facets**, not the same card columns.

This volume locks the translation after the dig-desk wave (vols 251–263) so future plan work does not re-introduce ownership conflict.

## Anthropic pattern (compressed)

1. **Lead** receives a research question and produces a strategy (what to cover, how much effort).
2. **Subagents** receive explicit task briefs and structured output schemas; each has its own context.
3. **Parallelism** is justified when facets do not share a write target (e.g. different companies, different claim types, different time periods).
4. **Synthesis** merges worker outputs; a **citation** pass attributes claims to sources.
5. Token cost is high (~orders of magnitude vs single chat). Breadth justifies cost; depth on one identity often does not.

## Apex contact recovery is depth-first

Finding a public phone/email for **one named person** is not “research 65 companies in parallel.” It is iterative search → observe → visit → extract → validate → promote. That loop is **one ReAct executor** (the dig / investigator). Calling three agents that all try to write `entities.phone` is not LeadResearcher architecture; it is concurrent mutation.

### Self-lead dig

For single-target dig, the dig agent **is** its own lead:

- Soft orientation in the system prompt (what “done” means, identity discipline).
- Tool choice free (no `force_*` hop list).
- Observation quality gates (identity fit, public vs private ambiguity).
- Promote is a **workflow step after** the agent returns findings — outer TypeScript owns the card write policy.

Boss may still set *case-level* goals (“prefer attributable routes,” “avoid inventing Personal”). Boss must not run a second dig trajectory against the same columns during the same job without a clear handoff (see vol 233, 246).

## When LeadResearcher-style multi-agent *does* fit Apex

| Scenario | Lead | Workers | Shared write? |
|----------|------|---------|---------------|
| Cold desk discovery | Orchestrator / discovery lead | Lanes (SC13, IR, registries) → candidate lists | No — merge candidates, then dig per person |
| Multi-entity batch | Orchestrator | Sequential digs per entity (or strictly rate-limited parallel digs) | No — one dig per entityId |
| One hard VIP dig | Dig self-lead | Optional *read-only* critics after dig | Critic does not promote |
| COMPARE baseline | Human lead | Chat agent vs Apex dig (offline) | Evaluation only |

## Explicit non-mapping

| Anthropic element | **Not** Apex |
|-------------------|--------------|
| 3–5 parallel contact researchers on one CEO | Parallel OSINT scripts + dig all writing phone |
| Subagent “find phone” + subagent “find email” racing | Vector-specialized force paths |
| Lead rewriting worker claims without sources | Promote without sourceUrl |

## Implementation anchors (main)

- Single-target: `runSingleTargetPipeline` — discovery forced off (vol 254).
- Dig: `runTargetContactAgent` → `runAgenticWebResearch` free ReAct.
- Promote: `persistBureauContactsForEntity` / rehydrate — workflow, not a second agent brain.
- Trajectory: DigSpans `agentName: investigator | discovery` (vol 257).

## Planning rule going forward

Before proposing a new agent, answer:

1. What **facet** does it own that nothing else writes?
2. What is its **structured output** schema?
3. Who **synthesizes**, and who **promotes**?
4. Does breadth justify the token multiplier?

If the answer to (1) is “contacts on entity X” and dig already owns that, **do not spawn**.
