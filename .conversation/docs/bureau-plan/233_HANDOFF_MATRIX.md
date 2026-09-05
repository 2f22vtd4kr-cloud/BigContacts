# Volume 233 — Explicit Handoff Matrix

Inspired by OpenAI handoff vs agents-as-tools: every edge states who owns the outcome.

| From | To | Type | Owns after handoff |
|------|-----|------|---------------------|
| Operator | Orchestrator | command | Job lifecycle |
| Orchestrator | Discovery agent | handoff | Candidate list for intake |
| Orchestrator | Dig agent | handoff | Contact evidence + card promote |
| Orchestrator | Case Bureau | handoff | Case file updates |
| Right-hand | Boss | advice (not handoff) | Boss still owns decision |
| Boss | Case investigator | brief / agents-as-tools | Findings into case file; Boss may loop |
| Dig agent | Tools pool | tool call | Observation returns to dig |
| Dig agent | Promote | artifact | Card columns + present |
| Discovery | Intake | artifact | Ledger admission |

## Forbidden edges

| From | To | Why forbidden |
|------|-----|----------------|
| Boss | web_search | Planner must not dig |
| Deep-web enricher | card phone when dig ready | Steals executor ownership |
| Discovery | entity.phone | Wrong phase |
| Tool | tool (chained without model) | Script theater |

## UI

Handoffs should appear as DigSpan/live events: `invoke_agent dig`, `invoke_agent discovery`.

