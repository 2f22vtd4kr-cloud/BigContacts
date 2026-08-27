# Volume 248 — Implementation Progress

## Batch status (methodical)

| Item | Status | Notes |
|------|--------|-------|
| Present layer (`presented-contacts.ts`) | Done (pre-existing) | API attaches `contacts[]` |
| ContactSurface UI | **Shipped** | entities mobile + reach vectors use contacts |
| Org routes visible | **Shipped** | entityReachVectors prefers presented contacts |
| Discovery agent module | **Shipped** | `discovery-agent.ts` free dig people hunt |
| Atlas wire | **Shipped** | runs before templates when discoveryFirst; `APEX_DISCOVERY_AGENT=0` disables |
| Admit candidates | **Shipped** | `discovery-agent-admit.ts` |
| Dig owns card / agentCardReady | Pre-existing | orchestrator skips parallel when ready |
| Boss/RH no tools | Pre-existing orientation | enforce in prompts |
| Full discovery replace templates | Not yet | templates remain fallback |
| Profile page ContactSurface | Pending | next |
| Live Desk ContactSurface | Pending | next |

**Overall plan implementation (this wave): ~35% of architecture+discovery+surface scope**  
(Contact path UI + discovery agent MVP; deeper dig observation work and template retirement remain.)

