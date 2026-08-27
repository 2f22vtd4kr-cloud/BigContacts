# Volume 83 — OpenTelemetry GenAI Alignment for DigSpan

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Sources:** OpenTelemetry GenAI semantic conventions; Honeycomb agent instrumentation (`gen_ai.conversation.id`, `gen_ai.agent.name`, `gen_ai.operation.name`, tool attributes).

## 1. Required conversation binding

All spans in one atlas job should share:

- `gen_ai.conversation.id` ≈ **jobId**  
- `gen_ai.agent.name` ∈ { boss, right_hand, investigator, enricher, orchestrator }  
- `gen_ai.operation.name` ∈ { chat, execute_tool, invoke_agent, … }

## 2. Map Apex DigSpan → GenAI ops

| DigSpan spanType | name examples | gen_ai.operation.name |
|------------------|---------------|------------------------|
| llm | groq, gemini, nvidia | chat |
| tool | web_search, visit, registry_search | execute_tool |
| stage | foundation_filings | invoke_agent or custom stage |
| promote | card_promote | execute_tool or internal |
| error | parse_fail | chat/execute_tool with error type |

## 3. Tool attributes

When emitting tool spans:

- `gen_ai.tool.name` = action  
- inputSummary = query or URL (never secrets)  
- resultSummary = short observation  

## 4. Why this matters for winning

Production agent debugging is **conversation-first**. Apex Live Desk is the product UI for the same idea. Incomplete spans = un-debuggable empty cards.

## 5. Future exporter

Optional OTLP export can follow without changing dig logic if DigSpan fields stay aligned.

## 6. Apex must / must not

**Must:** jobId on every dig-related span.  
**Must not:** invent spans for tools that did not run; show LIVE with empty span set while idle.
