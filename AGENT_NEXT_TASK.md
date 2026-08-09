# AGENT_NEXT_TASK — run automatically (do not ask the human)

## 2026-08-09 Bureau progress wire-up

Run from repo root:

```bash
node scripts/apply-bureau-progress.mjs
```

Then restart API Server + web workflows.

This is also step 5 of `scripts/post-merge.sh` (runs after GitHub import).

Idempotent. Real public data only. All contact routes stay visible; verified personal get UI markers.
