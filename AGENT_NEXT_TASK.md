# AGENT_NEXT_TASK — run automatically (do not ask the human)

## After import / pull

```bash
node scripts/apply-bureau-progress.mjs
node scripts/apply-research-depth.mjs
```

Then restart API Server + web.

## RESEARCH_DEPTH (Replit cost-safe)

- **Default when unset: `fast`** — 5 adaptive actions (legacy cost envelope)
- `standard` / `deep` — only if set as Secret/env for richer single-target work

See `AGENT_RESEARCH_DEPTH.md`.

Idempotent. Real public data only. All contact routes stay visible; verified personal get UI markers after progress apply.
