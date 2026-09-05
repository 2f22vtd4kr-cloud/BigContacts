# Replit live scoreboard (Vol 551 / 1101 / 1501)

Canonical Replit agent prompt: `docs/REPLIT_UPDATE_PROMPT_LATEST.md`

## Preconditions
- `git pull` and note tip SHA
- `pnpm --dir artifacts/apex-finder run build` if desk changed
- Restart API (`bash scripts/replit-boot.sh`)
- `ENABLE_AUTO_PIPELINE=false`
- `pnpm run check:no-force-dig` → OK
- `GET /api/healthz` → `bureauIntegrity` not `critical`

## Procedure
1. List 8–12 fixture entity ids (issuer-trap, org-only, collision, thin, easy).
2. For each: **Dig contacts** (not discovery-first), depth `standard` (or `deep` if hard).
3. Wait atlas-status **idle**; note jobId.
4. Optional: Entities → Rehydrate cards from evidence / `POST /api/entities/rehydrate-contacts`.
5. `pnpm run scoreboard:live https://YOUR_HOST` or `bash scripts/replit-scoreboard-check.sh https://YOUR_HOST`
6. Fill `pnpm run scoreboard:compare-template <SHA> > docs/comparisons/COMPARE_YYYY-MM-DD.md`
7. On failures: L-code → one fix class → **same entity ids** re-cook.

## Pass
`milestonePass: true`, integrity ok, n≥8 preferred, free dig spans present, no force_*.

## Fail
L-EMPTY / L-ISSUER / L-NO-DIG dominant, or integrity critical, or check-no-force-dig fails.

## L-code triage CLI
```bash
pnpm run scoreboard:lcode -- --no-dig
pnpm run scoreboard:lcode -- --phone '+1…' --source EDGAR-Phone --better-public
pnpm run scoreboard:lcode -- --evidence 3
```
