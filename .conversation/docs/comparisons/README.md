# COMPARE archives

Store live evaluation writeups here:

- `COMPARE_YYYY-MM-DD_label.md` — scoreboard vs baseline (Vol 276/552)
- `postmortems/POSTMORTEM_LCODE_YYYY-MM-DD_entity.md` — single-target failure analysis

No API keys. Always include tip SHA, integrity, depth, and L-codes.

Generate skeletons:

```bash
pnpm run scoreboard:compare-template $(git rev-parse --short HEAD)
node scripts/postmortem-template.mjs L-EMPTY 123 abcdef1
node scripts/fixture-registry-template.mjs
```
