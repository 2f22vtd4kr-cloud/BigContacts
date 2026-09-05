# Testing research capacity

## Full stack

1. Start `api-server` with Redis + DB + research keys.  
2. Start `apex-finder`.  
3. Launch Atlas from the UI (not mock mode).  
4. Inspect Entity ledger and contact evidence for the target cohort.

## Holdout scripts (no UI)

```bash
node scripts/holdout-walker-apex-run.mjs
node scripts/holdout-griffin-extract.mjs
```

These use Tavily/SerpAPI/Whois + HTML extractors.  
**Important:** raw holdouts do **not** automatically import `contact-validation` / `ai-extractor` gates unless the script does so. Treat raw holdout output as scrape capacity; apply the same gates as production before scoring “Apex quality.”

## Floor checks

```bash
node scripts/check-discovery-stack-floor.mjs
node scripts/check-trash-phone.mjs
```

Static assertions that required code paths and trash gates remain present.
