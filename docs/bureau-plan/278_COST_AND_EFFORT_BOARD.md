# Volume 278 — Cost and Effort Board

## Why this exists

Multi-tool dig is expensive: SERP providers, browser fetch, multi-LLM steps, optional footprint CLIs. Public write-ups of multi-agent research systems report large token multiples vs single-chat answers when work is parallelized for breadth. Apex must scale **on purpose**.

## Decision

Ship a **cost/effort board** only **after** the live scoreboard gate (vol 275) produces an honest pass or a clear failure class. Empty-card crises are not solved by cheaper digs; they are solved by free dig quality, observation fidelity, and promote integrity.

## What the board should show (when built)

| Signal | Use |
|--------|-----|
| Depth tier (fast / standard / deep) | Operator intent vs spend |
| Steps, searches, visits per target | Trajectory density |
| Provider mix (SERP / LLM / browser) | Attribution |
| Outcome vs spend | Rubric points per target or per $ |

## Rules

- Depth selectors (vol 252) already express effort; the board **observes**.
- Never auto-downgrade depth mid-dig via a heuristic that blocks visits the model requested.
- Discovery-first burns more tokens than single-target; use single-target for card-quality proof.
- Footprint tools remain model-chosen with soft caps—not a mandatory stage.

## Non-goal

A dashboard that encourages operators to disable search providers to “save money” while still claiming bureau quality.
