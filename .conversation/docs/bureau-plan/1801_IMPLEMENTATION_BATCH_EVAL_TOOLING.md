# Volume 1801 — Implementation Batch: Eval Tooling

## Shipped (tip after this commit)

- Expanded `phone-source-priority` unit tests (deep-web, in-house, final-review, empty card)
- Scoreboard snapshot includes `bureauIntegrity` and forces `milestonePass=false` when critical
- ScoreboardStrip prefers integrity from snapshot + healthz
- `scripts/compare-template.mjs` — full COMPARE skeleton with L-codes
- `scripts/postmortem-template.mjs` / `fixture-registry-template.mjs`
- `scripts/replit-scoreboard-check.sh` runs no-force + healthz + snapshot
- `scripts/replit-live-scoreboard.md` operator procedure
- `docs/comparisons/README.md`
- package.json: `scoreboard:postmortem-template`, `scoreboard:fixture-template`, `check:bureau` runs no-force + priority tests

## Still host-only

Live milestonePass after fixture re-cook on Replit.
