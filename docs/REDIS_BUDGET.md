# Redis command budget (Upstash free = 500k cmds/month)

## Why 521k commands with ~368 KB storage?
Commands ≠ storage. The desk was burning quota with:
- Full `SCAN apex:job:*` on every idle `atlas-status` when `latestjob` pointer missing
- Reactor polling `/atlas-status` + `/jobs` + `/system/status` every 5s
- Short process caches (1.5–2s) so almost every poll hit Redis

## Fixes in code
- `getLatestJob`: pointer only — **no SCAN**
- Longer caches on active-job + atlas-status
- Slower UI polls when idle
- If Redis quota is exhausted: **in-process Atlas lock** so single-API Launch still runs

## Operator
1. Create a **new** Upstash DB if current is over 500k cmds (month resets).
2. Set `REDIS_URL_1` only (one DB). Map `REDIS_URL=$REDIS_URL_1` if needed.
3. Restart API after secret change.
4. Avoid leaving Reactor open 24/7 on free tier during idle.
