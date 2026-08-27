# Volume 266 — Breadth Then Narrow (Apex Translation)

## Principle

Anthropic Research guidance and classical OSINT both favor **broad recall then precise exploitation**: discover the candidate set, then spend depth budget on the highest-value identities.

Apex historically inverted this under pressure: deep scripted enrichment on registry-scale bulk names (FAA-style), producing thin cards and honest-but-empty outcomes. Discovery-first + free dig is the correction.

## Phase A — Breadth (discovery)

**Goal:** Admit people worth digging, not contacts themselves.

- Free discovery agent (LLM people hunt) with soft objective; DigSpans `agentName: discovery`.
- Template/registry lanes soft-retired after agent admits (unless `APEX_FORCE_TEMPLATE_DISCOVERY=1`).
- Admit fitness: name quality, public footprint hints, not fabricated phones.

**Outputs:** Entity rows (or candidates) with thin cards, evidence anchors optional.

**Non-outputs:** Personal phone/email as discovery’s job.

## Phase B — Narrow (dig)

**Goal:** Public, attributable routes for one identity.

- `singleTargetId` or research queue over admitted ids.
- Free ReAct dig; promote + rehydrate.
- Live Desk shows trajectory + ContactSurface bound by `entityId` telemetry.

## Anti-patterns

1. **Narrow without breadth on a cold desk** — digging random empty ids.
2. **Breadth that writes Personal contacts** — discovery inventing phones.
3. **Narrow × N parallel on same id** — multi-writer conflict.
4. **Breadth forever** — never spending dig budget; scoreboard stays empty.

## Operator mapping

| Desk action | Phase |
|-------------|-------|
| Launch discovery-first | A then B on admits |
| Dig contacts on profile | B only |
| Dig selected | B sequential |
| Rehydrate | Post-B promote only |

## Scoreboard relationship

Scoreboard grades **narrow** outcomes (cooked cards with routes). Discovery volume alone cannot pass the milestone. Vol 255 remains the live gate.
