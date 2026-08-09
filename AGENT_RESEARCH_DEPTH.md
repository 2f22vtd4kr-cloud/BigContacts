# Research depth + adaptive improvements (on main)

## Env

```
RESEARCH_DEPTH=fast|standard|deep
```

Defaults to `standard` (8 adaptive actions, 4 person follow-ups, 2 domain follow-ups).

- `fast` — bulk scale (5 actions)
- `deep` — VIP thorough pass (12 actions max)

## Auto-apply after import

```bash
node scripts/apply-bureau-progress.mjs
node scripts/apply-research-depth.mjs
```

Both are hooked in `scripts/post-merge.sh`.

## What improved

1. Depth tiers control adaptive budget without a rigid pipeline
2. Multi person/domain follow-ups inside adaptive director
3. Prefer `contact_routes` once people/domains exist
4. Boss prompts embed creative OSINT angles + pending vectors
5. Right-hand prefers follow-up on existing leads
6. Real public data only — no synthetic contacts
