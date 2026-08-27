# Volume 246 — Anthropic Parallel Subagent Constraints (Detail)

## Primary source

Anthropic Engineering: *How we built our multi-agent research system* (2025), plus secondary analyses and SDK demo prompts (2025–2026).

## Why parallel subagents exist

Search is **compression**: distill a huge corpus into insights. Subagents each get a **fresh context window**, explore **independent facets** in parallel, and return **condensed** findings to the lead. That beats one agent walking sequential searches when the question is breadth-first (e.g. “board members of every IT S&P 500 company”).

Reported: Opus lead + Sonnet subagents ≈ **+90%** on internal research eval vs single Opus; multi-agent ≈ **15×** chat tokens; agents ≈ **4×** chat.

## Constraints and failure modes they fixed

### 1. Spawn explosion
**Failure:** Early agents spawned ~**50 subagents** for simple queries.  
**Constraint:** Embed **effort-scaling rules** in the lead prompt:
- Simple fact-finding → **1 agent**, ~3–10 tool calls
- Comparisons → **2–4 subagents**, ~10–15 calls each
- Complex research → more subagents only with **clearly divided** responsibilities  

### 2. Vague delegation
**Failure:** Short briefs (“research the semiconductor shortage”) → misinterpretation and **duplicate searches** (three agents on the same angle).  
**Constraint:** Every subagent brief must include:
- **Objective**
- **Output format**
- **Tools / sources guidance**
- **Task boundaries** (what not to do / when done)

### 3. Context isolation
**Design constraint:** Subagents **do not share** mid-task coordination. They typically **don’t know** siblings exist. Lead synthesizes after return.  
**Implication:** Facets must be **partitionable**. Tasks needing tight shared mutable state (most coding) are a poor fit.

### 4. Plan persistence
Lead saves plan to **external memory** because the 200k window can truncate mid-run.  
**Constraint:** Long-horizon leads need durable plan storage, not only chat history.

### 5. Parallelism shape
Two levels:
1. Lead spawns **~3–5 subagents in parallel** (not serial) for non-trivial queries  
2. Each subagent may call **3+ tools in parallel**  

Prompt pattern: emit multiple spawn/tool calls in **one assistant turn**.  
Hard SDK-style rule in demos: **subagents must not get the Task/spawn tool** (no recursive spawn storms).

### 6. Token economics
Multi-agent is justified when task value > ~15× chat cost. Token use explained much of BrowseComp variance in their data.  
**Constraint:** Don’t use multi-agent as default for shallow lookups.

### 7. When multi-agent fails
Anthropic-aligned commentary: poor fit when work needs **shared context** and sequential dependency (classic coding). Good fit: **breadth-first research**, many tools, volume exceeding one window.

### 8. Citation separation
Often a **separate citation pass** attributes claims to URLs after synthesis — verification ≠ research worker.

## Apex application (binding)

| Anthropic constraint | Apex rule |
|----------------------|-----------|
| Independent facets only | Parallel OK for discovery **lanes**, not dual contact writers |
| Explicit briefs | Discovery/dig orientation + output schemas |
| Effort scaling | depth + researchLimit; single-target = **1 dig** |
| No recursive spawn | Dig has tools, not spawn-subagent tool |
| Isolation | Dig does not coordinate with deep-web mid-flight |
| Citation | Promote sourceUrl required |
| Token honesty | Prefer one dig executor for one person |

