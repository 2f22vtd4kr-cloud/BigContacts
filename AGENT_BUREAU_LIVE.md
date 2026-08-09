# Bureau Live + discovery (background)

## Live path
- `appendJobLog` → `mirrorJobLogLine` (classify actor, drop noise, max 40 events / 10s)
- Redis `apex:bureau:live:events` (cap 300)
- SSE `GET /api/ingest/bureau-stream` (15s heartbeats, CORS `*`, snapshot on connect)
- JSON `GET /api/ingest/bureau-events`
- Reactor panel via `node scripts/apply-bureau-live.mjs`

## Discovery
- Module: `discovery-intake.ts` (`buildSourcesToRun`, approachable ranking)
- Wire on Replit: `node scripts/apply-discovery-intake.mjs` (samples broad themes, not fixed Europe-first slice)

## After pull
```bash
node scripts/apply-bureau-live.mjs
node scripts/apply-discovery-intake.mjs
```
Restart API + web. No tab changes.
