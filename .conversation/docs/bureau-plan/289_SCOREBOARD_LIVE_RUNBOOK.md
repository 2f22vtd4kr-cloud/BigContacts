# Volume 289 — Scoreboard Live Runbook

## Preconditions

- Tip includes dig-desk wave + promote locks.
- `bureauIntegrity` not critical.
- `ENABLE_AUTO_PIPELINE=false`.

## Steps

1. `git pull origin main` && restart API (and UI if desk changed).
2. Pick ≥8 fixture entities (thin cards, known public surface).
3. For each: **Dig contacts** at `standard` (or `deep`), wait idle.
4. Optional: **Rehydrate cards from evidence** on Entities.
5. `GET /api/ingest/scoreboard-snapshot` — record mean, per-id scores, `milestonePass`.
6. If fail: open DigSpan for worst ids; assign L-codes; one fix; re-cook same ids.
7. Archive results under `docs/comparisons/` when claiming a pass.

## Do not

- Discovery-first full burn for promote proof.
- Quote pass under integrity critical.
- Change free dig into a checklist to chase the rubric.
