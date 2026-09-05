# Volume 05 — Observability and Reactor

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code anchors:** DigSpan, bureau events, Live Desk, scheme, atlas-status

---

## 1. Why observability is product

A multi-tool bureau without a trustworthy trajectory cannot be operated or audited.  
Honeycomb / OpenTelemetry GenAI / LangSmith-style **span timelines** are the industry pattern for agent debugging: model, tool, handoff, error.

Apex **DigSpan** contract:

- publish spans on tool/LLM/stage/promote  
- expose `recentSpans` on `/api/ingest/atlas-status`  
- mirror into job log where needed so Reactor is not Redis-only  

---

## 2. Live Desk requirements

1. Show **spoken / adaptive** under-the-hood lines when right-hand (NVIDIA) is keyed—non-blocking, rate-limited.  
2. Show **tool-specific chrome** (search SERP, browser fetch, registry, footprint)—not one fake browser for everything.  
3. **Never** paint LIVE for providers with 0 keys.  
4. When Atlas is **idle**, Live Desk is dead—no stale Redis theater.  
5. Search chrome shows real queries—not `LANE – people_press` prompt guts.  
6. Desktop and mobile both readable; controls not clipped under status chrome.

---

## 3. Scheme

- Default **Live tools** mode: light/hide nodes from **actual spans**, not a static 900-node poster.  
- Full map optional.  
- Pan (drag + scrollbars), zoom, minimap with viewport rectangle and live-tool dots.  
- Idle clears fake activity lights.

---

## 4. Progress UI

- Continuous phase strip—not predetermined “step 2 of 6 dig plan.”  
- “Window X of Y” only means carousel buffer size if used at all; prefer span list.  
- Pause / Resume / Stop spaced and reachable on mobile and desktop.

---

## 5. Acceptance tests

1. During dig, Live Desk updates with tool names matching trajectory.  
2. After Stop, no LIVE badges within one poll interval.  
3. Offline provider never shows LIVE.  
4. Scheme live mode only highlights tools that ran.  
5. Status endpoint responds under dig load (budgeted Redis + yields).

---

## 6. Handoff to Volume 06

Volume 06 defines **evaluation against a single web agent** so “superiority” is measurable.
