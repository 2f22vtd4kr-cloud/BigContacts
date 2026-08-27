# Volume 225 — Investigators vs Dig Agent

## Two research roles (do not merge carelessly)

### A. Case investigator

- Lives under Case Bureau loop
- Briefed by Boss
- Returns structured findings into **case file**
- May use tools through case tool bridge
- Good for multi-step case narratives, graph, adaptive research director paths

### B. Dig agent (Target Contact Agent → agentic-web-research)

- Lives under entity full-circle / single-target
- Orientation: dig_agent
- Free ReAct over **tools pool**
- Findings → contact_evidence → **promote → card**
- This is the **product path for outreach routes**

## Naming in telemetry

| agentName | Meaning |
|-----------|---------|
| `boss` | Case decision spans |
| `right_hand` | Advisory spans |
| `investigator` | Case investigator or dig (prefer `dig` / `investigator` consistently) |
| `discovery` | Discovery agent |
| `system` | Orchestrator / promote |

**Recommendation:** DigSpan for target contact uses `investigator` or explicit `dig` — pick one in implementation and stick to it. Live log actors already: boss, right_hand, web, tool, system, registry, discovery.

## Parallelism

Never run case investigator and dig **both** writing the same entity phone columns in the same pass without source locks. Prefer dig as sole contact writer.

