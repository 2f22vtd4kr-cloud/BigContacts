# Discovery source mixer (Western ally, randomized)

## What changed

Primary discovery no longer leans on one fixed sequential list. Each Atlas discovery cycle builds a **randomized mix** of:

- **Registries** — UK Companies House, US EDGAR, Norway BRREG, France BODACC, EU/GLEIF
- **FAA** — US aircraft (N-number) owners when the mix schedules an FAA slot
- **Web recipes** — e.g. Nordic investment companies, Dubai tech/investment, Japan principals, UK/US family offices & PE, European operators

Geography: **Western allies from Japan to the USA**, plus **UAE (Dubai)** routes. Default broad rotation **excludes** Latin America / non-ally Eastern Europe category noise.

## Auto-apply (Replit)

```bash
node scripts/apply-discovery-mixer.mjs
```

Also runs from `scripts/post-merge.sh` after progress + depth applies.

## Module

`artifacts/api-server/src/src/lib/discovery-source-mixer.ts`

## Rules

- Real public data only — review-only candidates until attribution
- Adaptive mix, not a rigid pipeline
- Replit-cheap: pure selection logic, no new services
