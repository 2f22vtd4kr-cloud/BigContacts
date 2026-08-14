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
