# Volume 93 — Atlas Job State Machine

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## States

idle → running → paused → running → completed | failed | cancelled

## Events

| Event | Effect |
|-------|--------|
| Launch 202 | → running, set lock |
| Launch while running | 409, same jobId |
| Pause | → paused (between targets) |
| Resume | → running |
| Stop / DELETE lock | → cancelled/idle, clear spans |
| Natural end | → completed |
| Zombie sweeper | → idle if no heartbeat |

## UI binding

- idle: Launch visible, no LIVE  
- running: Pause/Stop, spans flow  
- paused: Resume/Stop
