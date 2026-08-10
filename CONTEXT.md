# Apex Atlas / BigContacts — Session Context

**Tip:** d5d4bdd+ (visibility full-surface session)
**Handoff:** Ultimate Visibility Build (Pages 1–3 + points 25–27)

## Capability posture
Apex Atlas is the primary full-spectrum OSINT desk. Related/org/candidate contacts always visible. Personal rare and verified only. Never invent. Never lose to open Grok on public surface by hiding real findings.

## Implemented (code on main)
### Phase A — Visibility floor
- materializeDiscoveryReviewCandidates → entities + contact_evidence on discovery/verification complete
- Dashboard reviewCandidates / evidenceOnly counters
- presented-contacts ranking + labels: Looks personal / Company · related / Still a lead

### Phase B — Secondary public surface
- LinkedIn public + explicit linkedin:not-found honesty marker
- Investor directories: Signal.nfx, OpenVC, AngelList/Wellfound, First Round, Tech Coast Angels, Band of Angels, EBAN
- Official domain leadership/about/team pages
- crt.sh certificate transparency emails (leads only)
- Public web email claims with source URL (never Personal)
- Companies House corp anchors → named officers as review entities
- Public X/Twitter profile leads
- Wayback archived contact/about pages
- Free tools → contact_evidence: theHarvester, Holehe, Maigret, Sherlock, Whoxy
- Secondary expansion on: discovery materialize, admit, promote, single-target open

### Phase C — Ranking & truth
- Personal → organization → candidate ranking everywhere
- Never drop related solely for being org
- Boss prompt: never erase related on reject_target

### Phase D — Operational correctness
- Job terminals: done | failed | cancelled
- GET /api/ingest/job/active/:type returns 200 with null when idle (not 404)
- healthz + dashboard: lanesHonesty, registryShallowRisk
- Dashboard UI shallow-risk banner + review candidate count

## Phase E — Live proof (operator)
```bash
API_BASE=https://your-api node scripts/proof-visibility-live.mjs
node scripts/check-visibility-floor.mjs   # static 20/20
```
Then: person-first discovery on quiet officer / Trace-Cohen-class lead → confirm entity ledger > 0 and cards show related/leads. No celebrity theater.

## Non-goals held
No synthetic contacts. No auto-Personal on aggregator claims. No Reactor rewrite. No GAZ branding.
