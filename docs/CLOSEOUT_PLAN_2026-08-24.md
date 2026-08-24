# Apex close-out plan (2026-08-24)

## Goal
Live desk + bureau behave as product law until no further visual or logical defects remain.

## Order of work
1. **Live baseline** — healthz, atlas idle, keys, integrity, Redis status (no launch yet).
2. **Redis quota** — inventory every poll/TTL/multi-slot path; kill remaining burn (status/entities/job polls, extra REDIS_URL_2 if free-tier single).
3. **UI desktop** — Reactor idle, Overview, Network, Status, entity cards: no glass stack, no Phase N/10, honest keys, no overlap, Launch readable.
4. **UI mobile** — same honesty; Launch type; no stacked translucent panels; idle ≠ LIVE.
5. **Network graph** — fix TDZ / init crash (LIVE-02).
6. **Card path (no prefer lists)** — empty Congdon/Gund/Icahn cards: ensure dig findings → persist → promote works; optional rehydrate endpoint; free dig only.
7. **One controlled dig** (only if integrity ok + Redis healthy) — single target; stop clean; card scored.
8. **Docs** — context.md + LIVE log final state; tip list for Replit rebuild if UI lagging.

## Done criteria
- No residual fixed-plan UI language
- Keys chip matches healthz
- Idle desk never shows researching/LIVE activity ghosts
- Network page loads without GraphErrorBoundary TDZ
- Redis: single primary + cached health; no multi-slot spam on free tier
- Dig can leave sourced org or direct vectors on card without script prefer lists
- Stop = cancelled/STOPPED not FAILED


## Progress log
- 2026-08-24T07:09Z live: healthz ok, atlas idle, 6 LIVE keys, cards still empty
- Graph TDZ root cause in source: `useEffect(..., [width, height])` ran *before* `const [width, height]` — fixed in `d670649`
- Redis poll cut in `99c2fb0` (client intervals + PING 60s)
- Deployed UI still shows 11 CHECKPOINTS · 10 PHASES until desk rebuild on Replit
