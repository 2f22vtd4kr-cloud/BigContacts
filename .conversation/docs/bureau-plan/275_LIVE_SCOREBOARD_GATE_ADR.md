# Volume 275 — Live Scoreboard Gate (ADR-Depth)

## Status
Accepted as the **sole remaining product-completion gate** for the dig-desk wave (see vols 255, 258, 273, 274).

## Context

In-repo work made free dig, promote locks, ContactSurface, discovery agent, DigSpan trajectory, and single-target entry points operational. Operators can still believe the desk is “done” while cards on a real deployment score below a careful open-web baseline. Architecture completion without live proof is the same class of error as claiming force-hop dig was “research.”

## Decision

**Definition of done for this wave** is not another UI control. It is:

1. Deploy tip ≥ `6b9413c` (or later) on a real host (Replit or equivalent).
2. `GET /api/healthz` → `bureauIntegrity` not `critical`; search + dig LLM slots live.
3. Re-cook a fixed fixture set via `singleTargetId` + `researchDepth: standard` (or deep for hard names).
4. Fill or generate scoreboard rows (snapshot API / `scripts/replit-live-scoreboard.md`).
5. **`milestonePass: true`** under the analytic rubric (vols 87, 68) with **n ≥ 8** entities where possible.
6. No win claim if integrity was critical during the run.

Until those six hold, overall product superiority vs a single web agent remains **unproven**, regardless of commit count.

## Why this is the right gate

- **Card is the answer** (product law): only live cards can fail the metric.
- **Evaluation without fake wins** (vol 273): self-grade on empty or dishonest outcomes is theater.
- **Industry practice**: agent systems are accepted on eval harnesses and traces, not README diagrams (LangSmith / Honeycomb Agent Timeline culture).

## Non-goals for this gate

- Automating a competing chat agent inside Apex.
- Expanding fixture count before the first honest pass fails clearly.
- Changing free dig into a script to chase the rubric.

## Operator path

Follow `scripts/replit-live-scoreboard.md`. Prefer **Dig contacts** on known thin cards over a full discovery-first burn if the goal is promote proof.

## Consequences

Planning energy after pass shifts to COMPARE archive, citation UX, and cost board (vol 274 remaining list)—not more dig entry CTAs.
