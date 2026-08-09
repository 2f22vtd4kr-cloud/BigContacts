# Research depth (Replit-optimised)

## Env (Replit Secret or Shared env)

```
RESEARCH_DEPTH=fast|standard|deep
```

**Default when unset: `fast`** (5 adaptive actions — same cost envelope as the legacy director, safe for thousands of targets).

| Value | Adaptive actions | Person follow-ups | Domain follow-ups | Use when |
|-------|------------------|-------------------|-------------------|----------|
| `fast` (default) | 5 | 2 | 1 | Bulk / auto-pipeline / cost control |
| `standard` | 8 | 4 | 2 | Normal single-target Bureau cases |
| `deep` | 12 (hard cap) | 6 | 3 | VIP / explicit thorough pass only |

## Auto-apply after GitHub import (no manual paste)

```bash
node scripts/apply-bureau-progress.mjs
node scripts/apply-research-depth.mjs
```

Both run from `scripts/post-merge.sh` step 5.

## Rules

- Real public data only — never invent contacts
- Adaptive / gap-driven — not a rigid pipeline
- All routes visible; verified personal marked after progress wire-up
