# Volume 197 — DigSpan Alignment with OTel GenAI (2026)

## External standard (summary)

OpenTelemetry GenAI conventions and Honeycomb Agent Timeline expect:

- `gen_ai.conversation.id` on **every** span in a run (jobId is Apex’s practical conversation id)
- `gen_ai.agent.name` unique per agent role (investigator, boss, right_hand, enricher)
- `gen_ai.operation.name`: `invoke_agent` | `chat` | `execute_tool` | …
- Tool spans: tool name, arguments/result summaries (no secrets)

## Apex DigSpan today

In-memory ring with spanType llm|tool|promote|stage|error, agentName, jobId, input/result summaries. This is the **desk-native** L2 trajectory. Optional future: OTLP export mapping:

| DigSpan | OTel-ish |
|---------|----------|
| jobId | gen_ai.conversation.id |
| agentName | gen_ai.agent.name |
| llm | operation chat |
| tool | operation execute_tool |
| stage start | invoke_agent |
| promote | custom / tool-like |

## Rules

1. Never block dig on OTLP export failure
2. Desk must work offline of Honeycomb/LangSmith
3. agentName must not be blank (Unknown lanes are useless)
4. conversation id = atlas job id when present

## Product priority

Ship visible DigSpan on Live Desk before any exporter. Exporter is Batch B8+ territory.

