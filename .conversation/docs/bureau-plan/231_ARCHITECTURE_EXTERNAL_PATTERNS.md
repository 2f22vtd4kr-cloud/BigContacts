# Volume 231 — Bureau Architecture vs External Multi-Agent Patterns (2025–2026)

## Why this volume exists

Architecture for Boss / right-hand / investigators / tools must be grounded in **what production multi-agent systems actually use**, not only internal naming. This volume maps current industry patterns to Apex.

## External pattern vocabulary (consensus ~2026)

Sources: AgentPatterns composition guide; Openlayer multi-agent architecture guide (Mar 2026); Levelop orchestration patterns; Google ADK multi-agent patterns; Honeycomb Agent Timeline / OTel GenAI; OSINT team role literature.

### Four structural patterns (AgentPatterns)

| Pattern | Structure | When |
|---------|-----------|------|
| **Chain** | Strict A→B→C | Fixed dependencies |
| **Fan-out** | Parallel independent workers, merge | Parallelizable research |
| **Pipeline** | Stages + quality gates | Repeatable CI-like flows |
| **Supervisor** | Coordinator decides *what/whom/when* | Sequence unknown upfront |

### Production topologies (surveys ~2026)

- **Orchestrator–worker** — ~majority of production deployments: one orchestrator decomposes/routes; workers specialize.
- **Hierarchical supervisor** — tree of managers; higher latency/cost; strong audit.
- **Swarm / peer** — flexible, hard to debug; not Apex’s primary desk model.
- **Planner–executor–critic** — quality gate when correctness > speed.

**Critical empirical warning (Openlayer / industry notes):** multi-agent **helps parallel work** but can **hurt sequential reasoning** (reported large degradations when the wrong topology is forced onto linear tasks). **A single capable agent with tools often beats a multi-agent split** when work is linear and one context is enough.

## Map onto Apex Atlas

| External pattern | Apex component | Fit |
|------------------|----------------|-----|
| **Orchestrator–worker** | `atlas-orchestrator` + dig / discovery workers | **Primary** for single-target and discovery-first |
| **Supervisor (dynamic)** | Boss in Case Bureau | **Only** for adaptive case loops where next action is unknown |
| **Critic / advisor** | Right-hand (text-only) | Advisor to Boss — **not** a second digger |
| **Planner–executor** | Boss plans → case investigator executes | Case path only |
| **Fan-out** | Parallel enrichers | **Dangerous on contacts** — use only when dig does not own card |
| **Pipeline + gates** | promote → outcome honesty → present | Deterministic quality gates, not LLM committees |
| **Single agent + tools** | Target contact dig ReAct | **Default outreach path** — matches “don’t split linear research” |

## Design implication (binding)

1. **Do not force Boss/RH onto every Atlas run.** Single-target dig is a **single-agent + tools** topology — the empirically safer choice for sequential contact recovery.
2. **Boss is a supervisor only when Case Bureau is active** — dynamic next-action, not a mandatory global CEO of dig.
3. **Right-hand is critic/advisor**, not peer digger (no tools) — matches generator/critic separation in ADK patterns.
4. **Tools pool = worker capabilities**, not agents — MCP-era consensus: tools are the harness surface; agents choose them (Willison: agent = model + tools in a loop).
5. **Unique `agentName` per role** — Honeycomb/OTel: duplicate or missing names collapse swim lanes to “Unknown.” DigSpan must keep boss / right_hand / dig / discovery distinct.

## OSINT human-team analogy (not copy-paste)

Human OSINT units often separate:

- **Manager / lead** — priority, liaison (≈ Boss + operator)
- **Investigator** — hunt specific leads (≈ dig agent)
- **Analyst** — pattern/story (≈ case investigator / final synthesis)
- **Technical specialist** — tooling (≈ tools pool + harness)

Apex encodes that split in **software roles**, but the **product KPI** remains dig→card, not manager meetings.

## Anti-patterns reinforced by external evidence

| Anti-pattern | Why literature warns |
|--------------|----------------------|
| Many agents on one linear dig | Sequential reasoning degrades |
| Supervisor on every simple task | Cost/latency without gain |
| Peer swarm for contact recovery | Hard to audit; wrong-person risk |
| Tools as autonomous agents | Role blur; script theater |
| Missing agent names in traces | Undebuggable multi-agent |

## Apex default topology (summary)

```
Operator
   → Atlas Orchestrator (deterministic scheduling, budgets)
        → [optional] Discovery agent (single agent + search/visit)
        → Target Contact dig (single agent + full tools)  ★ product path
        → Promote/Present gates (deterministic)
        → [optional] Case Bureau: RH advise → Boss supervise → Investigator
```

## Citations (consult continuously)

- AgentPatterns: composition patterns (chain, fan-out, pipeline, supervisor)
- Openlayer: multi-agent architecture comparison (Mar 2026) — topology vs task structure
- Honeycomb: Agent Timeline GA; unique `gen_ai.agent.name`; caller emits `invoke_agent`
- Google ADK: coordinator/dispatcher; generator/critic
- Industry: orchestrator–worker as production default; harness quality > framework fashion

