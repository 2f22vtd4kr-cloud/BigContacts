# Final overall audit — Apex Atlas (2026-08-23)

## Architecture (intended)
- Free dig: `runTargetContactAgent` → entity **card**
- No force playbooks / micro-training preference lists
- Single Redis: `REDIS_URL_1` (permanent)
- Auto pipeline off by default
- API serves desk at `/` on 8080

## Implemented this cycle
| Area | Status |
|------|--------|
| healthz permanent Redis | ok + PING cache 30s |
| atlas-status short cache | 1.5s in-process |
| getActiveJob read cache | 2s |
| Idle vs LIVE single truth | job status only |
| Readable type floor | ≥11px major surfaces |
| Collapsible desktop nav | edge chevron |
| Empty DONE placeholders | yes |
| Jobs/desk poll slowdown | yes |
| School/edu email reject | contact-validation |
| Ghost job clear / no auto-resume | ENABLE_AUTO_PIPELINE=false |

## Remaining risks (product, not one-line CSS)
| Risk | Note |
|------|------|
| LinkedIn common-name false bind | Need stronger person↔issuer bind in dig scoring |
| Org IR email as "direct" | Outcome rules still can promote company mail |
| Upstash free command cap | Polls reduced; long open desk still costs |
| Replit agent quota | Hard-stop prompt; operator Launch only |
| Graph density | Usable; not "beautiful" |

## Operator deploy
```
git pull  # tip with this audit
pnpm --filter @workspace/apex-finder run build
pnpm --filter @workspace/api-server run build
# API only on 8080
```
