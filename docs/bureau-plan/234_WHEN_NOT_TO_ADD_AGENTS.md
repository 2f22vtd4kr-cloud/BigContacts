# Volume 234 — When Not to Add Agents (Industry + Apex)

OpenAI orchestration guidance: add specialists only when instructions, tools, or policy **materially differ**. Extra agents cost prompts, traces, and conflict surfaces.

## Do not add a new Apex agent for

- “One more enrichment phase” that also hunts phones
- A model provider swap (that is routing inside one role)
- A single registry call (that is a tool)
- Logging or metrics (that is harness)

## Do add / keep a specialist when

| Specialist | Distinct contract |
|------------|-------------------|
| Dig | Full OSINT tools; owns contact artifacts |
| Discovery | Search/visit; owns candidate people only |
| Boss | No tools; owns case next-action |
| Right-hand | No tools; owns advisory note only |

## Prefer tool over agent

Companies House search is a **tool**, not a “CH agent.” IR page visit is **visit**, not an “IR agent.”

