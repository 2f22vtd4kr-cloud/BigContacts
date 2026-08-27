# Volume 22 — Redis, Jobs, and Launch Integrity

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Problems seen in production use

1. Five free Upstash URLs + frequent UI status polls → command quota pressure
2. Sticky in-process `exhausted` flags → UI shows 0/5 after recovery
3. Job state only in Redis → Launch returns jobId, nothing runs, looks like dead button
4. Zombie running status with frozen telemetry

## Policies

### Redis topology

- **Prefer one** `REDIS_URL_1` on free tier
- Optional `REDIS_URL` = copy of _1 for code paths expecting local name
- Do not require REDIS_URL_2..5 for bureau correctness

### Exhausted flag

- Set only on explicit max-requests class errors
- Clear on successful PING / reconnect (periodic recovery)
- Never treat sticky flag as permanent account death without PING proof

### Job store

```
setActiveJob(job):
  try redis
  always keep memory mirror for this process
getActiveJob():
  memory first or redis with budget
  if redis fails, memory
```

Launch must succeed for single-instance Replit even when permanent Redis is briefly unhappy.

### Status reads

- Budget every Redis call (e.g. 1.2s)
- Cache status 2s class
- Never await unbounded Redis in healthz/status

### Zombies

- Heartbeat on job log append
- Boot: clear running jobs without recent heartbeat
- Stop: DELETE atlas-lock + clear spans + hard idle UI

## Operator checks

```
GET /api/healthz → redis slots + integrity
GET /api/ingest/atlas-status → idle|running|paused
DELETE /api/ingest/atlas-lock → stop
```

## Acceptance

1. With Redis healthy: Launch→running→Stop→idle
2. With Redis forced down (test): memory job still progresses on single node
3. After simulated exhausted + PING ok: slot shows ready again
