# Volume 218 — Critique: Template-Farm Discovery

## What exists today (honest)

`broad-discovery` documents **150+ query templates across 15 categories** (family office, luxury aviation, SEC, philanthropy, venues, regions, funds, clubs, estates…). Rotation is tracked in Redis. `discovery-source-mixer` shuffles broad/registry/FAA slots. Intake ranks and filters fame trophies and shells.

## What is good

- Intent: find **new** people without requiring entity ids
- Intake filters for person-scoped admission
- Mixing registries with web is directionally right
- Metrics and review decks exist

## What is the same disease as force-dig

| Template farm | Free agent |
|---------------|------------|
| Fixed queries regardless of intermediate findings | Next query depends on what was just read |
| Category rotation as “diversity” | Diversity from changing lanes and sources |
| Name-regex on SERP snippets | Visit + structured extract + basis URL |
| Volume of templates as quality | Quality of admitted targets + dig success rate |

A playlist of 150 queries is still a **script**. Shuffling the playlist does not create judgment.

## Migration direction (not overnight delete)

1. **Phase A:** Keep templates as a **library resource** the discovery agent may call (`suggest_queries(lane)`), not the only path.
2. **Phase B:** Default discovery path = **ReAct discovery agent** with small tool set; budget N searches/visits; output candidate list.
3. **Phase C:** Templates become fallback when agentic LLM slots are zero (integrity degraded) — explicit degraded mode.

## KPI shift

Old: queries fired, entities inserted.  
New: **% admitted with source basis URL**, **% later dig non-empty card**, **% operator-accepted from review deck**.

