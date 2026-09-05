# Volume 236 — Observability Industry Alignment

## Honeycomb / OTel GenAI (2026)

Required mental model:

- `gen_ai.conversation.id` = Atlas `jobId`
- `gen_ai.agent.name` unique: `boss`, `right_hand`, `dig`, `discovery`, `orchestrator`
- `gen_ai.operation.name`: `invoke_agent` | `chat` | `execute_tool`
- Caller records handoff invoke_agent span

## Apex desk

DigSpan + bureau live log are the operator Timeline. Optional OTLP later.

## Debug questions industry trains

1. Which agent was active?
2. Which tools fired?
3. Where did ownership hand off?
4. Did the executor return artifacts before timeout?

If the desk cannot answer these, architecture is invisible — and invisible multi-agent systems fail closed into “job done, empty card.”

