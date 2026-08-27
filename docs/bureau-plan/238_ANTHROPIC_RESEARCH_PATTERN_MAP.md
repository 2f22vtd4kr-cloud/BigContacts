# Volume 238 — Anthropic Multi-Agent Research Pattern → Apex

## Source

Anthropic engineering write-up on their Research multi-agent system (2025, widely discussed through 2026): orchestrator–worker with a **LeadResearcher** that plans, spawns **subagents** with separate context windows, synthesizes, optional **citation** pass. Reported large gains on breadth-first internal evals; multi-agent uses ~15× tokens vs chat — use when breadth justifies cost.

## Pattern elements

| Element | Anthropic Research | Apex map |
|---------|-------------------|----------|
| Lead plans | LeadResearcher strategy + memory of plan | Boss (case) or Orchestrator (job); dig is often **self-lead** for one person |
| Parallel subagents | 3–5 workers, own context, distinct facets | **Only when facets are independent** — e.g. discovery lanes, not three agents all writing the same phone |
| Explicit task + output format for workers | Required for delegation quality | Dig orientation + done findings schema; discovery candidate schema |
| Effort scaling | Don’t spawn 50 workers on a simple query | depth tiers + researchLimit; single-target = one dig |
| Broad then narrow | Search strategy principle | Soft orientation, not forced query list |
| Citation pass | Separate attribution of claims to URLs | Promote requires sourceUrl; present shows sources |
| Token honesty | Multi-agent is expensive | Prefer one strong dig over parallel contact writers |

## Critical Apex translation

Anthropic parallelizes **independent search facets** of one research question. Apex historically parallelized **redundant contact pipelines** (dig + deep-web + secondary) on the **same entity columns** — that is not the Anthropic pattern; that is ownership conflict.

**Correct parallel examples for Apex:**
- Discovery: lane A (SC13 filers) and lane B (IR executives) as separate discovery workers → merge candidates
- One dig exploring multiple *queries* inside one ReAct loop (sequential or limited parallel tools), not multiple promote owners

**Incorrect:** Boss + dig + deep-web all “research contacts” with write access.

## When Apex should stay single-executor

Per-target contact recovery is **depth-first on one identity**, not breadth-first across 65 companies. Anthropic’s own guidance: multi-agent shines on breadth. **One dig agent per target** remains the default. Multi-agent discovery is the breadth layer.

