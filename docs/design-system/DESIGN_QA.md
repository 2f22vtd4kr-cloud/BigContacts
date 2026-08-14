# Live Desk Design QA

Last updated: Phase marathon (dead-code removal + a11y keyboard)

## States to verify (mobile, 390×844)

1. **Live + REACH** — cyan live label, REACH banner one-shot, tool LIVE pill, progress glow
2. **Live no REACH** — same without contact banner
3. **History/archive** — slate panel, ARCHIVE badge, Live CTA, Escape returns to Live
4. **Arming** — ~400ms skeleton when run first goes live
5. **Empty live** — pulse radio + “waiting for first tool scene”
6. **Idle** — dashed empty desk
7. **Rate limit** — amber alert with rotating keys (`role="alert"`)

## Interaction QA

| Action | Expected |
|--------|----------|
| Swipe scene | Axis-lock horizontal, 280ms enter, 8s reading pause |
| ArrowLeft/Right | Prev/Next scene (only when stage hovered/focused) |
| Home / End | First / last scene |
| Space | Toggle reading pause |
| Tap pause cue | Resume auto-advance immediately |
| Escape | History → Live |
| History toggle | Panel chrome swaps cyan ↔ slate |
| Chip tap | Jump scene + pause |
| Focus (keyboard) | Cyan focus ring on pressables |

## Motion tokens

See `MOTION.md` / `src/lib/reactor-motion.ts`. No magic numbers in timers.

## Code health

- `LiveResearchConsole` removed (dead, ~380 lines)
- Unused lucide icons stripped from mobile flow
- Mobile injects `REACTOR_CSS` fallback + page-level KEYFRAMES

## Mock

`?mock=1` → `mockAtlasLiveState()` includes `disposition: contact_route_found` and multi-step `eventLog`.


## Desktop Live Desk

- REACH uses `.reactor-reach` (parity with mobile)
- maxScenes 8 (aligned with mobile live strip)
- HIDE / LIVE DESK ON: pressable + aria-labels
- Scene region: `role="region"` + `aria-live="polite"` on story line

- Progress shows **Step N of M · tool title** under the bar
- Stage shows cyan focus ring when tabbed to

## Touch targets

- Header History / Refresh: 44px (`h-11`)
- Prev / Next: `min-h-[40px]`
- Scene chips: `min-h-[52px]`, width ~136px

## Rate limit banner

- `role="alert"` amber strip
- Title + body; key list capped at 4 with +N overflow

## Phase G — Arming realism

| State | Expected |
|-------|----------|
| Arming (400ms) | Traffic lights + URL bar + prompt line + 2 metric cards + shimmer |
| Reduced motion | Arming skipped; no shimmer loops |
| Live empty | Cyan border + radio pulse + "first tool window incoming" |

## Phase H — Live signal

| Surface | Expected |
|---------|----------|
| WindowChrome live | LIVE pill (uppercase, larger pip, glow) |
| Desktop Live Desk | Stronger border + ACTIVE badge when isLive |
| Step label | Cyan when scene.live |
| a11y | complementary region labeled Apex Atlas Live Desk |

## Phase I — Nav & pause

| Control | Expected |
|---------|----------|
| Scene chip selected | Cyan border + inset + glow; story text near-white |
| Scene chip live (not selected) | Soft cyan wash + emerald pip |
| Dot pager active | 20px wide; cyan if live |
| Reading pause | Pill (border + fill) · countdown · tap resumes |
| Prev/Next | ≥44px hit target; disabled at 25% opacity |

## Phase J — Contrast & focus

| Surface | Expected |
|---------|----------|
| Mobile footer / swipe hints | slate-400 (not 600) |
| Desktop scheme + Live Desk open + live | SVG opacity ~0.72 |
| Sibling nodes (focusedToolId) | unchanged 0.32 dim |

## Phase K — Terminal + archive

| Surface | Expected |
|---------|----------|
| Run done | Emerald terminal banner · not LIVE chrome |
| Run failed | Rose terminal banner · role=alert |
| REACH | Spring in → settled label “Contact route locked” |
| History mode | Archive panel class · ARCHIVE badge · History archive title |
| WindowChrome complete | DONE pill (not LIVE) |
| WindowChrome failed | FAIL pill |
| Scene chip complete | tiny “done” tag |

## Phase L — Desktop parity + summary

| Surface | Expected |
|---------|----------|
| Desktop desk done | Emerald border · DESK · COMPLETE · DONE badge |
| Desktop desk failed | Rose border · DESK · FAILED · FAILED badge |
| Desktop banners | banner-run-terminal-desktop |
| Summary strip | Contacts/Sources/Evidence/Phase when done |
| Desktop REACH | Settles to CONTACT ROUTE LOCKED |
| Archive empty | “Archive empty for this target” |

## Phase M — REACH CTA + scheme tags

| Surface | Expected |
|---------|----------|
| REACH mobile | Open in Profiles link when targetName known |
| REACH desktop | Same CTA |
| Profiles | `?q=` pre-fills search |
| Mobile node completed | “done” tag, no blink |
| Desktop node completed | “done” tag, no blink |
| Active node | “live” pip still blinks |

## Phase N — History filters + rate-limit recovery

| Surface | Expected |
|---------|----------|
| History chips | All/Live/Done/Failed tabs when archive has events |
| Filter empty | “No {filter} steps… Try All” |
| Rate limit banner | Check status + Dismiss |
| Dismiss | Hides until exhaustedKeys change |
