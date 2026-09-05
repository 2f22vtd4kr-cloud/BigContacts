# Volume 18 — Detailed Implementation Specifications (Wave Tickets)

Each ticket is implementable. Acceptance is observable. No force_* regressions.

## Ticket A1.1 — Grep and quarantine force controllers

**Context:** Historical force_* paths killed free dig.

**Primary files:**
- `artifacts/api-server/src/src/lib/agentic-web-research.ts`
- `artifacts/apex-runtime/lib/agentic-web-research.ts`

**Implementation steps:**
1. Search for force_ and GROK-PARITY
2. Ensure no controller path on healthy llmStep loop
3. Leave only optional log recognizers if needed

**Acceptance tests:**
- grep clean on dig controller; one live dig trajectory without force_ lines

**Risks:** Accidentally removing det recovery when all LLMs fail

---

## Ticket A1.2 — Parity api-server vs apex-runtime dig

**Context:** Dual stack drift revived dead models and scripts.

**Primary files:**
- `apex-runtime/lib/agentic-web-research.ts`
- `groq-models.ts`

**Implementation steps:**
1. Match free ReAct, model list, done gate, tool actions
2. Or document runtime as non-production and block imports from prod routes

**Acceptance tests:**
- Same action enum; same model failover order

**Risks:** Holdout scripts still import runtime

---

## Ticket A2.1 — Expose full tool schema to dig model

**Context:** Tools existed in product but model could not choose them.

**Primary files:**
- `agentic-web-research.ts`
- `orientation module`

**Implementation steps:**
1. Ensure parseAction supports all actions
2. Orientation lists all
3. Repair prompt lists all

**Acceptance tests:**
- Trajectory can show registry_search, footprint_email, browser_fetch on healthy keys

**Risks:** Token bloat in prompt — keep descriptions short

---

## Ticket A3.1 — Boss prompt lint

**Context:** Boss brief drifted into checklists.

**Primary files:**
- `case-bureau / adaptive prompts`

**Implementation steps:**
1. Remove mandatory surface checklists
2. Goals only
3. Add CI grep for banned phrases

**Acceptance tests:**
- Banned phrase scan passes

**Risks:** Over-linting legitimate examples in docs

---

## Ticket A4.1 — DigSpan completeness

**Context:** Reactor empty while dig worked.

**Primary files:**
- `dig-span.ts`
- `bureau-agentic-pass`
- `atlas-status`

**Implementation steps:**
1. Span on every tool
2. jobId mirror to log
3. promote span
4. clear on stop

**Acceptance tests:**
- atlas-status.recentSpans grows during dig; clears idle policy

**Risks:** Span buffer memory — ring buffer cap

---

## Ticket B1.1 — Promote after dig always

**Context:** Icahn dig with empty card.

**Primary files:**
- `bureau-contact-persist`
- `rehydrate helpers`

**Implementation steps:**
1. After evidence write, promote best
2. rehydrateEntityCardFromEvidence
3. invalidate list cache

**Acceptance tests:**
- singleTargetId re-cook fills phone when evidence has URL-backed phone

**Risks:** Promoting collision values — rely on gates

---

## Ticket B2.1 — Lock agentic sources against issuer overwrite

**Context:** Feinberg/Gund issuer phones won.

**Primary files:**
- `in-house enricher`
- `edgar query path`

**Implementation steps:**
1. If phoneSource agentic-web*, skip EDGAR-Phone overwrite
2. Notice-line may replace issuer only

**Acceptance tests:**
- Unit test: agentic phone survives EDGAR pass

**Risks:** Missing notice-line still leaves org phone — OK if organization_contact

---

## Ticket B3.1 — Outcome mapping for agentic-web-org

**Context:** Czirr/Philip over-claim direct.

**Primary files:**
- `computeContactOutcome`

**Implementation steps:**
1. agentic-web-org without personal email → organization_contact

**Acceptance tests:**
- unit table from Volume 11

**Risks:** True personal phone mis-tagged org — monitor

---

## Ticket B4.1 — Collision host registry expansion

**Context:** Wrong-family emails.

**Primary files:**
- `identity-collision.ts`

**Implementation steps:**
1. Add hosts from misses: majesco, bbgi-class, mercer advisors-class, directory brokers
2. Surname gate remains

**Acceptance tests:**
- tests for new hosts

**Risks:** Over-blocking true matches — require surname still

---

## Ticket B5.1 — Graph gate on bulk relationship writes

**Context:** Edges may bypass POST gate.

**Primary files:**
- `relationship auto-detect paths`

**Implementation steps:**
1. Call assessGraphNamePairRisk before insert
2. Skip or mark rejected

**Acceptance tests:**
- bulk insert test with different surname pair

**Risks:** Performance on large graphs

---

## Ticket C1.1 — Status plane budgets

**Context:** Timeouts mid-run.

**Primary files:**
- `atlas-status route`
- `redis client wrappers`

**Implementation steps:**
1. withBudget on every redis read
2. short cache
3. yield between targets

**Acceptance tests:**
- status p95 under dig load

**Risks:** Stale status if cache too long — keep 2s class

---

## Ticket C2.1 — Zombie job sweeper

**Context:** Frozen Phase J.

**Primary files:**
- `job boot clear`
- `heartbeat`

**Implementation steps:**
1. Clear running without heartbeat
2. Stop idempotent

**Acceptance tests:**
- old job cannot stay running across restart without heartbeat

**Risks:** Aggressive clear of long healthy dig — tune threshold

---

## Ticket C3.1 — Single Redis documentation and code default

**Context:** Five free Upstash slots burned.

**Primary files:**
- `docs`
- `redis slot iteration`

**Implementation steps:**
1. Prefer REDIS_URL_1 only in prompts
2. Avoid polling all slots every UI tick

**Acceptance tests:**
- status does not multiply commands per slot needlessly

**Risks:** Multi-slot prod still supported if paid

---

## Ticket D1.1 — Fixture target list file

**Context:** Comparisons ad hoc.

**Primary files:**
- `docs/comparisons/FIXTURE_TARGETS.md`

**Implementation steps:**
1. 20 names with notes on trap type
2. Update when adding

**Acceptance tests:**
- file exists; referenced by runbook

**Risks:** PII — public figures/filers only

---

## Ticket D2.1 — Scoreboard automation assist

**Context:** Manual only.

**Primary files:**
- `docs/comparisons/`

**Implementation steps:**
1. Template generator script optional
2. Human still does independent baseline

**Acceptance tests:**
- template renders

**Risks:** Do not auto-score LLM baseline without human

---

## Ticket E1.1 — Live Desk span consumer

**Context:** Spans unused in UI.

**Primary files:**
- `reactor pages`
- `dig-span-trajectory`

**Implementation steps:**
1. Render recentSpans
2. mobile+desktop
3. idle empty

**Acceptance tests:**
- screenshots idle+live

**Risks:** Performance re-render — memoize

---

## Ticket E2.1 — Scheme live-tools default

**Context:** Poster confusion.

**Primary files:**
- `reactor.tsx scheme`

**Implementation steps:**
1. Default hide unused
2. toggle full map
3. minimap dots

**Acceptance tests:**
- screenshots

**Risks:** Empty scheme if spans lag — show waiting state

---

## Ticket E3.1 — In-flight control layout

**Context:** Pause/Stop clipped.

**Primary files:**
- `layout header`

**Implementation steps:**
1. Dedicated row min-height z-index
2. testids

**Acceptance tests:**
- mobile screenshot

**Risks:** Header height growth on small phones

---

## Dependency order

A1 → A2 → A4 → B1 → B2 → B3 → D2 comparisons.
C1/C2 parallel anytime ops broken.
E* after A4 spans exist.
