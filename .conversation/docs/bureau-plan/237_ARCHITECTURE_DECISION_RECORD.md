# Volume 237 — ADR: Apex Bureau Topology (2026)

## Status

Accepted for plan; implement incrementally.

## Context

Apex mixed role names (Boss, right-hand, investigators) with phase pipelines and template discovery. Industry 2026 favors planner–executor separation, explicit handoffs, sharp tool subsets, and per-agent observability. Operator demand: LLM-native research, no scripts, contacts on cards.

## Decision

1. **Custom orchestrator retained** (no mandatory LangGraph migration).
2. **Planner roles:** Boss (case), Orchestrator (job graph). **No tools.**
3. **Executor roles:** Dig (contacts), Discovery (people). **Tools allowed per subset.**
4. **Advisor role:** Right-hand. **No tools.**
5. **Deterministic verifiers:** promote, sanitize, collision, sourceUrl — outrank LLM.
6. **Handoff ownership** per Vol 233 matrix; dig owns card contacts when engaged.
7. **Observability** per agent name + job conversation id.
8. **Templates** = degraded/fallback library, not primary discovery controller.

## Consequences

- Single-target path stays dig-centric (correct for outreach proof).
- Case Bureau optional; cannot steal dig ownership.
- Fewer parallel contact writers.
- Clearer Live Desk lanes.

## Non-decision

Not adopting CrewAI/LangGraph as runtime dependency in this ADR.

