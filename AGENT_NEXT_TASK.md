# AGENT_NEXT_TASK — run automatically (do not ask the human)

## After import / pull

```bash
node scripts/apply-bureau-progress.mjs
node scripts/apply-research-depth.mjs
node scripts/apply-discovery-mixer.mjs
```

Then restart API Server + web.

## RESEARCH_DEPTH (Replit)

- **Default: `fast`** — cheap, scale-safe (5 adaptive actions)
- `standard` / `deep` — only if set as Secret/env for richer cases

## Discovery

Randomized **Western ally** mix: registries (CH/EDGAR/BRREG/…) + FAA owners + web recipes (Nordic investment, Dubai tech, Japan, UK/US FO/PE). See `AGENT_DISCOVERY_MIXER.md`.

Idempotent. Real public data only.
