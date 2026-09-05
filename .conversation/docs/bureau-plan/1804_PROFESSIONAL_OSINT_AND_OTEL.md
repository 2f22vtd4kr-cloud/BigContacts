# Volume 1804 — Professional OSINT + OTel GenAI (external practice)

## OSINT discipline (applied in code)

| Practice | Implication for Apex | Code |
|----------|----------------------|------|
| Two-source / independence | Aggregator mirrors ≠ independent corroboration | `source-corroboration.ts` |
| Primary over people-search | SEC IR company pages beat ZoomInfo-only | promote + identity hosts |
| URL + method on every claim | sourceUrls required on dig findings | agentic dig + persist |
| Separate verified vs lead | outcome honesty org vs personal | computeContactOutcome |
| Notice ≠ issuer on SC13 | EDGAR notice-line phone is distinct field | EDGAR-Notice-Phone |

## Agent observability (applied in DigSpan)

| OTel GenAI concept | Apex field |
|--------------------|------------|
| gen_ai.operation.name | operationName: chat / execute_tool / invoke_agent |
| gen_ai.agent.name | agentName |
| gen_ai.tool.name | toolName (tool spans) |
| conversation / session | conversationId = jobId |

Spans show *what ran*; scoreboard + COMPARE measure *whether the card is good* (industry note: traces ≠ quality).

## References (method only)

- Phone OSINT validation / chain of evidence — theosintvault.io phone OSINT guide
- Two-source rule — lawful locating OSINT guides
- Email OSINT attribution — Molfar OSINT email methods
- OTel GenAI agent timeline — Honeycomb instrumenting AI agents guide; OpenTelemetry GenAI conventions
- Multi-agent eval: milestone scores + failure profiles — MAST / multi-agent eval literature
