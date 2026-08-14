# Live Desk motion system

Source: `artifacts/apex-finder/src/lib/reactor-motion.ts`

## Tokens

| Token | MS | CSS var | Use |
|-------|-----|---------|-----|
| FAST | 150 | `--reactor-fast` | Press feedback |
| UI | 220 | `--reactor-ui` | Panel / drag settle |
| SCENE | 280 | `--reactor-scene` | Scene slide enter |
| CELEBRATE | 320 | `--reactor-celebrate` | REACH one-shot |
| ARM | 400 | `--reactor-arm` | Desk arming skeleton |
| PAUSE | 8000 | `--reactor-pause` | Reading pause after touch |
| AUTO_ADVANCE | 5200 | — | Live scene auto-advance when not paused |
| SHIMMER | 1400 | `--reactor-shimmer` | Live URL/progress shimmer loop |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for enters.

## Injection points

1. `pages/reactor.tsx` — `KEYFRAMES = REACTOR_CSS + desktop scheme keyframes` (mobile + desktop branches)
2. `components/mobile-reactor-flow.tsx` — fallback `<style>{REACTOR_CSS}</style>`

## JS timers must import constants

Never hardcode `8000` / `400` / `280` in components. Import from `reactor-motion.ts`.

## Reduced motion

`prefers-reduced-motion: reduce` forces near-zero animation duration and single iteration.


| SWIPE_PX | 56 | — | Min horizontal drag to change scene |
| SWIPE_VELOCITY | 0.45 px/ms | — | Flick threshold (uses smaller distance) |
