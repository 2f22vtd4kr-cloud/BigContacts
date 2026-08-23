# Apex Atlas UX full audit (2026-08-23)

## Critical fixed this pass
| ID | Issue | Fix |
|----|--------|-----|
| UX-01 | Reactor 5–9px type | Bumped to ≥11–13px reactor/mobile/bureau-ops/header chips |
| UX-02 | Desktop nav permanent | Collapsible + edge chevron |
| UX-03 | healthz Redis false not_connected | pingRedis + status use permanent REDIS_URL_1 client |
| UX-04 | Free Redis command burn | Idle atlas-status poll slowed; workspace 20s |

## Still broken / high priority
| ID | Surface | Issue |
|----|---------|--------|
| UX-10 | Reactor desktop | Graph node labels still dense; many simultaneous DONE tiles in right rail |
| UX-11 | Reactor desktop | Launch Pause/Stop can sit over LIVE panel on mid widths |
| UX-12 | Reactor mobile | "Window N of N" residual if old bundle; open-ended labels need rebuild |
| UX-13 | Idle vs researching | Partially fixed (isLive from job status); verify after rebuild |
| UX-14 | Live feed empty DONE | DONE step cards with blank body |
| UX-15 | Overview | Need visual QA on cold vs live |
| UX-16 | Entity ledger / profile | Contact chips may overflow mobile |
| UX-17 | Status page | Dense provider matrix — check 320px width |
| UX-18 | Jobs page | Aggressive 2s job poll when open — Redis cost |
| UX-19 | Network / Connections | Force graph may blank without height on mobile |
| UX-20 | Header | "ATLAS RESEA_" truncation on narrow desktop with LIVE chips |

## State matrix to verify after next deploy
1. Cold idle — no Pause/Stop, Atlas idle only
2. Running — researching only, LIVE desk, no idle copy
3. Paused — Pause becomes Resume
4. Done — COMPLETE, no Now: lines
5. Failed — FAILED chrome
6. Redis down — honest not_connected, no false ok
7. Sidebar open/closed desktop
8. Mobile hamburger + reactor full width

## Backend logic notes
- TARGET CONTACT AGENT free dig is correct path
- Card quality (collision emails) is product not pure UI
- Ghost jobs cleared on boot; auto-resume gated off when ENABLE_AUTO_PIPELINE=false
