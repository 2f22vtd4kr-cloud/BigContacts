# Volume 255 — Live Scoreboard Gate (Only Remaining Product Proof)

## In-repo vs live

| Layer | Status |
|-------|--------|
| Free dig, promote, rehydrate, source locks | Done |
| ContactSurface + dig CTAs + depth | Done |
| Scoreboard strip + integrity-gated pass | Done |
| **Live `milestonePass` after re-cook on Replit** | **Pending** |

## Gate procedure

See `scripts/replit-live-scoreboard.md`.

1. `bureauIntegrity` not **critical**.
2. Dig 8–12 thin HNWI cards (standard or deep).
3. Confirm routes on ContactSurface.
4. `GET /api/ingest/scoreboard-snapshot?limit=12` → `milestonePass: true`.

## Invalid

- Claiming pass under integrity critical.
- Claiming pass from empty ledger mean tricks.
- Adding `force_*` dig controllers to chase the milestone.

## Analytic rubric

Volume 87 — scores −1…2; milestone mean ≥1 on ≥8 with no −1.
