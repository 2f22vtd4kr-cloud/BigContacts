# Apex Atlas · Live Desk — Design Studio Plan

**File (Figma):** https://www.figma.com/design/TpHSxn1Cvo9Frdf9IEVWlT  
**Repo:** BigContacts · `artifacts/apex-finder`  
**Date:** 2026-08-14

---

## 1. Studio roster (15 roles → outcomes)

| # | Role | Owns | Deliverable |
|---|------|------|-------------|
| 1 | Design Director | Vision, north-star | Tool-shaped scenes; no spinner-as-wait |
| 2 | Product Designer | Flows, priority matrix | P0–P2 interaction map |
| 3 | UX Researcher | Operator jobs-to-be-done | “See what Atlas is doing while contacts arrive” |
| 4 | Interaction Designer | Micro-interactions | Trigger → feedback → loops |
| 5 | Motion Designer | Timing, easing | Motion token set |
| 6 | Visual Designer | Color, type, chrome | Dark ops aesthetic + REACH climax |
| 7 | Design Systems | Tokens, components | Figma styles + CSS vars |
| 8 | Mobile Designer | Thumb zones, swipe | Axis-lock swipe, 40px targets |
| 9 | Desktop Designer | Scheme + side desk | Focus-dim, panel enter |
| 10 | Accessibility | Contrast, reduced motion | `prefers-reduced-motion` cut loops |
| 11 | Content Designer | Microcopy | Arming / live-empty / pause labels |
| 12 | Prototyper | Figma + HTML demos | Phone frames in Figma |
| 13 | Front-end Lead | React implementation | bureau-ops-stage, mobile-reactor-flow |
| 14 | QA / Design QA | Pixel + timing check | Screenshot pack in `reactor-screenshots` |
| 15 | Eng Manager | Merge cadence | PR → squash → main |

---

## 2. Motion tokens (single source of truth)

| Token | Duration | Use |
|-------|----------|-----|
| `--reactor-fast` | 150ms | Press / tap feedback |
| `--reactor-ui` | 220ms | Panel / chrome enter |
| `--reactor-scene` | 280ms | Scene slide |
| `--reactor-celebrate` | 320ms | REACH one-shot |
| `--reactor-arm` | 400ms | Desk arming |
| `--reactor-pause` | 8000ms | Reading pause after touch |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for enter; linear for shimmer loops.

---

## 3. Component inventory

- `WindowChrome` — tool metaphor shell  
- `SceneCard` / Google / Browser / Prompt / Domain / Serp / Analyst  
- `MobileWorkstage` — swipe + auto-advance + pause  
- `BureauOpsStage` — desktop grid + compact mobile  
- `MobileReactorFlow` — immersive header, REACH, History  
- Desktop Live Desk panel + scheme focus-dim  

---

## 4. Implementation phases

**Phase A (done):** Scene slide, REACH, shimmer, 8s pause, arming, press recipe, live-empty, desktop dim  

**Phase B (this sprint):** Formal CSS motion tokens, design doc in repo, Figma system file, token wiring in components  

**Phase C (done):** Shared `reactor-pressable`, focus-visible rings, desktop scene-strip tabs, REACH/live a11y contrast

---

## 5. Design rules (locked)

1. Every live tool looks like that tool — micro-motion reinforces metaphor.  
2. No spinner as primary wait for multi-minute OSINT.  
3. Feedback ≤ 300ms for taps; scene transitions ≤ 280ms.  
4. Celebrate once, then quiet — REACH is a climax, not a loop.  
5. Prefer opacity/transform over layout thrash (60fps mobile).  
6. Respect reduced motion — cut loops; keep opacity swaps.  


---

## Phase D (this pass) — History mode distinction

- History panel: slate border/shadow vs cyan live panel
- `archive` badge when History is on
- Footer hint: swipe guidance for Live ↔ History
- Chip scroller: edge fade mask (scroll affordance)


---

## Phase E — Systemic session (mobile tokens + safe area)

**Critical fix:** Mobile reactor path did not inject `KEYFRAMES`. Pressable, REACH motion, scene slides, and focus rings were desktop-only in practice.

### Delivered this session
1. `<style>{KEYFRAMES}</style>` on mobile page branch
2. Self-contained token + keyframe fallback inside `MobileReactorFlow`
3. Safe-area insets (top header / bottom shell)
4. Header `history` chip when archive mode is on
5. History subtitle: “Archive of this target’s tool steps”

### Design QA checklist
- [ ] Mobile Live: LIVE label glow, REACH spring, tool LIVE pill
- [ ] Mobile History: slate panel, archive badge, Live CTA
- [ ] Mobile empty live: cyan pulse + copy
- [ ] Mobile arming: 400ms skeleton
- [ ] Scene slide 280ms both directions
- [ ] 8s reading pause after touch
- [ ] focus-visible cyan ring (keyboard)
- [ ] Desktop strip tabs + focus-dim
- [ ] prefers-reduced-motion kills loops

### Figma
https://www.figma.com/design/TpHSxn1Cvo9Frdf9IEVWlT


---

## Phase F — Deep pass: single motion source of truth

- New module: `src/lib/reactor-motion.ts` (constants + REACTOR_CSS)
- All JS timers (pause, arm) use named constants
- Scene slide / shimmer / REACH / armIn use token ms
- KEYFRAMES composed from REACTOR_CSS + desktop scheme keyframes
- Mobile self-contained CSS replaced with shared REACTOR_CSS
- Docs: `docs/design-system/MOTION.md`


---

## Phase Marathon — code health + a11y keyboard

- Removed dead `LiveResearchConsole` (~380 lines) + unused helpers/icons
- Escape exits History; ArrowLeft/Right change scenes
- Subtitle contrast slate-500 → slate-400
- DESIGN_QA.md state matrix


---

## Long session — desktop parity + interaction tokens

- Desktop REACH / desk buttons share mobile system classes
- Swipe PX/velocity constants in reactor-motion
- Keyboard arrows scoped to stage hover/focus
- Live WindowChrome stronger border + glow
- SR-only scene announcement for AT


---

## Continue-2

- `motionOrNone` on desktop scheme animations
- Reading pause countdown (seconds remaining)
- Pause cue contrast improved


---

## Continue-3

- Home/End first/last scene
- Space toggles reading pause
- Tap pause cue to resume


---

## Continue-4

- Stage keyboard focus ring
- Step N of M label under progress
- Footer hints reflect pause state
- Space not stolen from buttons


---

## Continue-6

- Desk mode aria-live announcer
- Desktop event count on LIVE DESK
- motionOrNone on scene slide + shimmer + REACH/arm
- data-live on WindowChrome


---

## Continue-7

- Story line-clamp-2 (less truncation)
- Chip min-height 52px / width 136px
- Header controls h-11 (44px)
- Timestamp HH:MMZ + contrast


---

## Continue-8

- Edge-swipe toast: "Opened history archive" / "Back to live desk" (~1.8s)


---

## Continue-9

- Skip desk arming when prefers-reduced-motion
- Arming panel aria-busy + label
- Explicit .animate-ping/.animate-pulse kill under reduced motion


---

## Continue-10

- Desktop tabpanel scroll-margin for strip → card
- Progress bar role="progressbar" + valuemin/max/now


---

## Continue-11

- Rate-limit banner hierarchy (title + body, key overflow)
- Footer mentions edge-swipe history
- Bureau empty idle copy clarity


---

## Continue-12

- WindowChrome URL/query bar aria-label (live vs idle)


---

## Continue-13

- Mobile header sticky + stronger blur
- Edge toast sticky under header
- Desktop Live Desk width 420
- Stage overscroll-behavior-x contain


---

## Continue-14

- Main desk scroll-padding-top under sticky header
- Scene viewport min-height 240 mobile / 280 larger


---

## Phase G — Arming desk realism (this pass)

**Studio goal:** First 400ms of a live run must feel like the desk powering up — tool chrome, not a blank flash.

### Delivered
1. Arming skeleton expanded to full tool-window metaphor:
   - Traffic-light dots + URL bar (`atlas://desk/arming…`) with shimmer
   - Prompt / search line placeholder
   - Two metric card skeletons
   - Mini progress bar in header row
2. `armIn` applied to the arming panel itself (token-aligned)
3. Motion still gated by `prefers-reduced-motion` / `motionOrNone`

### Design rules reinforced
- Tool-shaped scenes from the first frame of live
- No spinner as primary wait
- Feedback ≤ 300ms; arm 400ms

