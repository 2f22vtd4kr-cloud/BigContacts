# Volume 14 — Reactor and Desk UX Plan

## 14.1 Problems observed

1. Pause/Stop clipped under browser/status chrome on mobile
2. Scheme not scrollable/pannable; felt like a static poster
3. Live feed layered and confusing; idle still showed activity
4. “Step N of 6” implied predetermined dig length
5. Scheme nodes did not reflect  actual tool use vs marketing “900 tools”

## 14.2 Target experience

**At a glance:** Is Atlas idle or live? Who is the current target? What tool is running now?

**On dig:** Trajectory list (DigSpans) + optional method chrome for the active tool + right-hand one-liner.

**On scheme:** Default “live tools only”; pan/zoom/minimap; unused nodes hidden or heavily dimmed.

## 14.3 Desktop layout

- Left/center: scheme (pan/zoom) or priority work surface
- Right rail: **one** Live Desk owner — spans + narration; telemetry not stacked under Launch
- Header: status chips; when running, **Pause · Resume · Stop** spaced, not under home mark
- Launch: single primary control when idle; not duplicated in a way that causes double-start

## 14.4 Mobile layout

- Header chips short labels (READY not WORKSPACE…)
- In-flight controls full-width row with min height, z-index above content
- Live Desk compact strip; swipe between recent spans without implying fixed plan length
- Scheme in scroll viewport with drag-pan

## 14.5 Visual language for tool kinds

| Kind | Chrome hint |
|------|-------------|
| web_search | SERP-style results list |
| visit / browser_fetch | URL bar + page body excerpt |
| registry_search | Filing/official records frame |
| footprint_* | Account/probe list |
| domain / whois | Domain record frame |
| promote | Card update confirmation |

## 14.6 Copy rules

- Ban: “Window 6 of 6 planned”, ATLAS_EVENT raw dumps as primary story
- Prefer: “Now: searching Serper for …”, “Done: visited gnty.com — 16 facts”
- Offline providers: **Offline**, never LIVE

## 14.7 Acceptance screenshots (required on UI change)

Desktop + mobile: idle, live search, live visit, offline provider, paused — stored under `screenshots/` with tip SHA.
