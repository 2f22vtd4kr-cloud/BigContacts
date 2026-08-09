# Bureau Live log (Intelligence Reactor)

## What shipped
- Redis-backed event list (`apex:bureau:live:events`)
- SSE: `GET /api/ingest/bureau-stream` with **15s heartbeats**
- Snapshot: `GET /api/ingest/bureau-events`
- Job log lines mirrored into Bureau feed
- Intelligence Reactor: **Bureau Live** panel (SSE + poll fallback)
- Discovery mix: `buildSourcesToRun` via apply script

## Timestamp format
Wire: ISO-8601 UTC with milliseconds — `2026-08-09T07:42:18.347Z`  
UI: local `HH:mm:ss.S`

## After Replit import
```bash
node scripts/apply-bureau-live.mjs
node scripts/apply-discovery-intake.mjs
```
Or `scripts/post-merge.sh`

No tab IA changes — uses existing Intelligence Reactor page.
