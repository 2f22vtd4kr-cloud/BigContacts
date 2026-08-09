# Bureau Live + discovery (background)

## Live path
- `appendJobLog` → `mirrorJobLogLine` (classify actor, drop noise, max 40 events / 10s)
- Redis `apex:bureau:live:events` (cap 300)
- SSE `GET /api/ingest/bureau-stream` (15s heartbeats, CORS `*`, snapshot on connect)
- JSON `GET /api/ingest/bureau-events`
- Reactor panel via `node scripts/apply-bureau-live.mjs`

## Discovery
- Module: `discovery-intake.ts` (`buildSourcesToRun`, approachable ranking)
- Wire on Replit: `node scripts/apply-discovery-intake.mjs`
  - Regex-replaces fixed `selectedBroadCategories` / `.slice(0,N)` with shuffled mix
  - Ranks broad-discovery admissions (`rankCandidatesForAdmission`)
  - Boss premise prefers operators over trophy names

## After pull
```bash
node scripts/apply-bureau-live.mjs
node scripts/apply-discovery-intake.mjs
```
Restart API + web. No tab changes.
