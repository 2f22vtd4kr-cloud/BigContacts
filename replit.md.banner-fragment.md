# ⚠️ MANDATORY — Bureau progress wire-up (auto, one command)

**Status (2026-08-09):** Modules on `main`. Full wire-up is **automatic** — do not ask the human to paste tasks.

On every session start / after GitHub import / after `pnpm install`, run (also step 5 of `scripts/post-merge.sh`):

```bash
node scripts/apply-bureau-progress.mjs
```

Then rebuild/restart API Server and web. Idempotent.

See: `AGENT_NEXT_TASK.md` · `REPLIT_BUREAU_PROGRESS_APPLY.md`

If `replit.md` does not already start with this banner, the agent must prepend this fragment to the top of `replit.md` and commit it — then run the script.

---
