# Volume 250 — COMPARE Baseline Helper

## Purpose

Record chat-agent vs Apex card outcomes without claiming a win under integrity critical.

## Manual procedure (operator)

1. Pick ≥8 cooked entities from `GET /api/ingest/scoreboard-snapshot`.
2. For each name, ask a strong chat agent for public phone/email with URLs (same depth budget roughly).
3. Fill a row in `docs/comparisons/COMPARE_YYYY-MM-DD.md`:

| name | apex outcome | apex primary | chat primary | apex score (−1..2) | notes |
|------|--------------|--------------|--------------|--------------------|-------|

4. Mark `baselineBetterPrimary` only when chat’s attributable primary is clearly better.
5. If `/api/health` → `bureauIntegrity: critical`, write **INVALID COMPARE — integrity critical** and do not claim milestone.

## Automated assist (API only)

Scoreboard already scores Apex cards. Chat baseline remains human-reviewed until a dedicated chat runner exists — do not auto-win from mean alone.

## Env

- `APEX_FORCE_TEMPLATE_DISCOVERY=1` — keep templates even after agent admits
- `APEX_DISCOVERY_AGENT=0` — disable discovery agent

