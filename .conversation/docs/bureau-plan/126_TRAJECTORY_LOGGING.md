# Volume 126 — Trajectory Logging

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Purpose

Human-readable history lines for debug and scoreboard process checks — not a dig script.

## Typical lines

- stepN: model=groq action=web_search q=...
- stepN: visit url=... facts=K
- stepN: done findings=N
- stepN: done_rejected (no research yet)

## Rules

Never log secrets. Prefer short. Spans are structured twin of trajectory.
