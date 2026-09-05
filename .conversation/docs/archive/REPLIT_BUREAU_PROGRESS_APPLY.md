# Replit: Bureau progress wire-up (automatic)

## Primary method — one command (preferred)

From repo root, after import / pull / `pnpm install`:

```bash
node scripts/apply-bureau-progress.mjs
```

Idempotent. Wires:

1. `case-bureau.ts` → imports, `investigationProgress`, Boss prompt, route markers, `buildActions` priorities, `parseCaseFile` backfill
2. `research.tsx` → types, progress grid, verified-personal badges, all routes visible

Then restart **API Server** and **web** workflows.

## Already on main (no action needed)

- `artifacts/api-server/src/src/lib/investigation-progress.ts`
- `artifacts/api-server/src/src/lib/case-bureau-prompt.ts`
- `artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts` (progress-aware right-hand)
- `replit.md` mandatory banner pointing at this script
- `scripts/post-merge.sh` step 5 runs the script after every import

## Design rules

- Real public data only — never invent contacts
- Show **all** discovered routes; mark verified personal in the UI
- Adaptive gap-driven research — not a fixed ordered pipeline
- Bureau stays sentient about pending vectors (Instagram, Telegram, phones, TikTok, LinkedIn, registries, Sherlock/Maigret, etc.)
