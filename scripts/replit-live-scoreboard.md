# Live scoreboard (Replit) — last product gate

In-repo dig desk is complete. This is the only remaining product proof.

```bash
git pull origin main
pnpm run check:no-force-dig
# restart API + UI after apex-finder build
pnpm --dir artifacts/apex-finder run build
```

1. Fix secrets until `GET /api/healthz` → `bureauIntegrity` is **ok** or **degraded** (not critical).
2. Profile or Entities → **Dig contacts** (depth standard or deep) on 8–12 thin HNWI cards.
3. Wait for idle; confirm ContactSurface routes + evidence.
4. `GET /api/ingest/scoreboard-snapshot?limit=12` → `milestonePass: true` (blocked if integrity critical).
5. Optional: `bash scripts/replit-scoreboard-check.sh`

Do **not** add force_* dig controllers. Dig stays free ReAct.
