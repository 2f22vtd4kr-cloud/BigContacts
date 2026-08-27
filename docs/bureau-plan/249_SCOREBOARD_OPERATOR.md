# Volume 249 — Scoreboard Operator Use

## Endpoint

`GET /api/ingest/scoreboard-snapshot?limit=20`

Returns mean score (−1…2 rubric), milestonePass, and per-card rows on **cooked** entities.

## Live Desk

Reactor shows `ScoreboardStrip` above DigSpan. Refresh ~60s.

## COMPARE discipline

1. Run Atlas on fixture cohort (or cooked desk sample).
2. Snapshot scoreboard.
3. Optionally run the same names in a strong chat agent; mark `baselineBetterPrimary` in offline review.
4. File under `docs/comparisons/COMPARE_YYYY-MM-DD.md` using template — **do not claim win** if integrity critical or n < 8.

## Milestone

`passesScoreboardMilestone`: n ≥ 8, no −1, mean ≥ 1.0.

