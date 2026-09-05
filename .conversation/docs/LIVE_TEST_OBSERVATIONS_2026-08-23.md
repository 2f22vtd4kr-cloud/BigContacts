# Live test observations — 2026-08-23 (kirk.replit.dev)

## Symptom (operator phone)
- Header: **Atlas researching…** + Pause / Stop
- LIVE: **Pre-run cross-references — OCCRP…** Phase **0/10**
- Desk: **waiting for the first search or page** / **Listening for bureau steps…**
- No dig windows, no TARGET CONTACT AGENT, no discovery names

## Root cause
Phase 0 always runs **before** discovery:
1. OCCRP/OFAC cross-ref of **existing** DB entities
2. **OpenSky / adsb.lol global** live aircraft fetch
3. Companies House officers

On a **cold empty desk**:
- Nothing to cross-reference
- OpenSky still pulled a **global ADS-B** feed (slow / can hang)
- Promise.all waited on all three → Launch stuck in phase 0
- UI correctly said "researching" but **no bureau dig steps** exist yet

This is **not** free-agent failure. Discovery never started.

## Fixes shipped (main)
| Change | Effect |
|--------|--------|
| Skip Phase 0 OCCRP/OpenSky/CH when **0 entities** | Cold Launch goes straight toward discovery |
| **45s timeout** per Phase 0 sub-task | Cannot block forever if external API hangs |
| OpenSky: **load aviation assets first**; skip global fetch if none | No ADS-B storm on people-only / empty DB |

## Operator action on this Replit
```bash
git pull origin main
# rebuild + restart API
# Stop the stuck job
# Launch once more
```

## Monitor checklist after relaunch
1. Phase 0 message should be **skipped (empty ledger)** or complete in seconds
2. Discovery / EDGAR / target agent should appear
3. Live Desk should show **search/visit** windows, not eternal "listening"
4. Score **cards**, not phase chrome

## Other notes from this session
- Monitor host often **timed out** from external probe while phone UI still rendered (Replit lag)
- DB 1/1 + 5 LIVE chips looked healthy on phone — dig lanes OK; blocker was phase order

## UI — Reactor desktop (screenshot follow-up)
- Scheme node labels were **9.5px** then **scaled** by `min(w/1600,h/960)` → unreadable.
- Live Desk default **open when idle** → blank column under Launch.
- Sidebar edge control stayed partially visible (`opacity-70`).

### Fixes
- Node labels **13–15px**, muted text brighter; scale **floor 0.82**
- Live Desk **closed when idle**, auto-open when job live
- Edge control **opacity 0** until mouse near left edge (with leave delay)
