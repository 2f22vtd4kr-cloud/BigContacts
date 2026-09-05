# Volume 259 — Stop Dig Semantics

## Meaning

**Stop dig** cancels the active `atlas-run` job (and clears dig spans for that job).
It does not roll back evidence already persisted.

## Call path

`stopAtlasPipeline` → `POST /api/ingest/atlas-stop` (preferred) → lock clear fallback.

## UI

- Profile dig banner: Stop dig
- Entities dig banner: Stop dig
- Reactor Launch controls: Stop

## After stop

1. DigSpans cleared for job id.
2. Card may already show partial promotes — operator may **Rehydrate** or dig again.
3. Scoreboard refresh is operator-triggered (ledger bumps `refreshKey` on stop).

## Honesty

Stop is not “delete findings.” Partial dig is valid public evidence under promote rules.
