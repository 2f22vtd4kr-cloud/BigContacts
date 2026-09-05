# Volume 230 — Architecture Implementation Notes (Code Map)

| Concept | Primary modules |
|---------|-----------------|
| Orientation | `apex-bureau-orientation.ts` |
| Boss prompts | `case-bureau-prompt.ts` |
| Right-hand | `nvidia-nim-case-reasoning.ts` |
| Case loop | `case-bureau.ts` |
| Dig | `target-contact-agent.ts` → `agentic-web-research.ts` |
| Tools | functions inside agentic-web-research + registry-client, browser-fetch, … |
| Promote | `bureau-contact-persist.ts` |
| Live actors | `bureau-live-log.ts` |
| DigSpan | `dig-span.ts` |
| Orchestrator | `atlas-orchestrator.ts` |
| Discovery (today) | `broad-discovery.ts`, `discovery-intake.ts`, `discovery-source-mixer.ts` |
| Discovery (target) | future `discovery-agent.ts` per Vol 219 |

## Consistency chores (when implementing)

1. Unify dig `agentName` string
2. Document Mode 1 does not need Boss
3. Live Desk legend for actors
4. Tools pool doc page in operator FAQ pointing here

