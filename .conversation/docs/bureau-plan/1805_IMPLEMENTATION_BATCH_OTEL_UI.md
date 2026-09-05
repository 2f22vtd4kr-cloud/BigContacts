# Volume 1805 — DigSpan OTel UI + attribute export

## Shipped

- DigSpan trajectory UI shows toolName, operationName, agentName, modelId
- `toOtelGenAiAttributes(span)` maps to gen_ai.* for future exporters
  (conversation.id, operation.name, tool.name, agent.name, request.model)

## External alignment

OpenTelemetry GenAI: execute_tool / chat / invoke_agent; Honeycomb Agent Timeline
instrumentation guide — tool failures are first-class spans.

## Note

Traces show process; scoreboard still measures card quality.
