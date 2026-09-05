# Volume 239 — ReAct Observation Discipline (External + Apex)

## External consensus (ReAct literature + 2026 practice)

- Grounding each thought in **tool observations** cuts factual hallucination vs pure CoT
- Trajectory (thought → action → observation) is the debug artifact
- Native structured tool calls beat fragile text-parsed “Action:” lines when available
- Context growth is the tax — compress old steps; don’t delete findings

## Apex dig rules

1. Every tool returns an **observation string the model can trust** (errors included)
2. Findings for promote must cite **sourceUrls** observed, not parametric memory
3. Soft nudges only when stagnation — never replace the model’s next action
4. DigSpan records action/observation summaries for operator Timeline
5. On timeout: preserve findings already extracted (partial executor success)

## Citation = product law

Anthropic’s citation agent attaches claims to URLs. Apex promote **refuses** phone/email without URL when policy requires it. That is the verifier step, not optional polish.

