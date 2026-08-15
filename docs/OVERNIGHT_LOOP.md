# Overnight Karpathy-style loop

## Metric
- Mean `scripts/score-discovery-case.mjs` score across fixed cohort
- **+15** per target that recovers expected org email domain (primary focus: `info@dyna-products.com`)

## Cohort
`scripts/overnight-targets.json` — DYNA Products (primary) + Mensch Manufacturing (secondary mid-market)

## Keep / discard
- Apply one general experiment (no target hardcoding)
- Rebuild, re-run cohort, score
- **KEEP** (commit + push main) only if metric improves
- **DISCARD** (`git checkout -- .`) otherwise

## Primary focus
Company-domain **org email** recovery on mid-market manufacturer targets — the gap vs Grok Agent.

## Run
```bash
# API keys in env; Redis + Postgres up; built dist/
node scripts/overnight-autoresearch.mjs
# stop next morning:
touch /tmp/apex-overnight-STOP
```

## Status
- Log: `/tmp/apex-overnight-log.jsonl`
- Status: `/tmp/apex-overnight-status.json`

## Not in scope
- Fame CEOs
- Invented contacts
- Full product CRM UI
