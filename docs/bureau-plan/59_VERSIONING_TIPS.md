# Volume 59 — Versioning and Tip Discipline

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

- Always git log -1 --oneline before claiming a fix is live
- docs/context.md tip may lag; origin/main is truth
- After UI commits: pnpm --dir artifacts/apex-finder run build
- After API commits: restart API process
- Comparison scoreboards record tip SHA
