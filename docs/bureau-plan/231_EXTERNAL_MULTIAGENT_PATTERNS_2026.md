# Volume 231 — External Multi-Agent Patterns (2026) Mapped to Apex

## Why this volume exists

Architecture decisions must track **what production systems actually do**, not only internal lore. Sources consulted (2025–2026): multi-agent framework comparisons (LangGraph, CrewAI, AutoGen/MAF, OpenAI Agents SDK), planner–executor literature, OpenAI orchestration/handoff docs, Honeycomb Agent Timeline / OTel GenAI instrumentation guides, MCP-as-tool-layer practice.

## Dominant production patterns

### 1. Orchestrator–worker (planner–executor)

A central planner decomposes work; workers execute with tools. Dominant for research and analysis products. Strict separation: planner decides *what*, executor decides *how* (tool sequence).

**Apex map:** Atlas orchestrator + Boss ≈ planner layer; dig / discovery agents ≈ executors with tools. Boss must **not** execute web tools (matches planner purity).

### 2. Role-based crew (CrewAI metaphor)

Named roles (researcher, writer, critic) with hierarchical or sequential process. Fast to prototype; weaker on long durable state unless graduated to graph orchestration.

**Apex map:** Boss / right-hand / investigator / dig is already a role crew. Risk: too many roles without clear handoff contracts → token waste and conflicting writes (our card-overwrite history).

### 3. Handoff vs agents-as-tools (OpenAI Agents SDK)

| Pattern | Who owns the reply | When |
|---------|-------------------|------|
| **Handoff** | Specialist takes over | Different instructions/tools/policy needed |
| **Agents as tools** | Manager keeps control; specialist is a bounded call | Manager synthesizes final answer |

**Apex map:**
- Single-target dig = **handoff** to dig agent (dig owns contact recovery).
- Boss calling an investigator brief = closer to **agents-as-tools** or brief-then-worker (Boss keeps case ownership; investigator returns findings).
- Do **not** hand off card ownership to deep-web enricher while dig already owns it.

OpenAI guidance: **start with one agent**; add specialists only when contracts truly differ. Apex violated this by stacking phases that all “research contacts.”

### 4. Graph / state-machine orchestration (LangGraph class)

Explicit nodes, edges, checkpointable state, HITL interrupts. Production default when runs are long and must be debuggable.

**Apex map:** Atlas phases are a coarse graph; DigSpan + job state are the checkpoint trail. Prefer **explicit ownership edges** (e.g. `agentCardReady → skip parallel contact writers`) over implicit “everyone enriches.”

### 5. Tools via shared pool / MCP layer

2026 stacks increasingly expose tools once (MCP or equivalent), agents bind subsets. Harness research stresses tool presentation quality over model swaps.

**Apex map:** Tools pool is shared; dig gets full set; Boss/RH get empty set; discovery gets search/visit/registry. Failover stays inside the tool implementation.

### 6. Observability: unique agent names + conversation id

Honeycomb Agent Timeline requires `gen_ai.conversation.id` on all spans and unique `gen_ai.agent.name` per agent; caller emits `invoke_agent` for handoffs. Missing names → “Unknown” lanes.

**Apex map:** jobId = conversation id; agentName = boss | right_hand | dig | discovery | system. DigSpan is desk-native Timeline.

## What industry does *not* recommend

- Infinite multi-agent debate for simple retrieval
- Every specialist with the full tool universe (context bloat)
- Orchestrator that both plans and silently runs all tools
- No audit trail of tool calls

## Apex-specific synthesis

Apex is **custom TypeScript orchestration** (valid — large share of production is still custom) with role names that look Crew-like and dig loops that look ReAct/executor-like. The fix is not “adopt LangGraph tomorrow”; it is **align contracts** with planner–executor + handoff ownership + sharp tool subsets + observable agent names.

