/**
 * Apex Atlas Live Desk — motion & interaction tokens.
 * Single source of truth for durations used in JS timers and CSS.
 * Keep in sync with KEYFRAMES :root in pages/reactor.tsx and MobileReactorFlow fallback.
 */

export const REACTOR_FAST_MS = 150;
export const REACTOR_UI_MS = 220;
export const REACTOR_SCENE_MS = 280;
export const REACTOR_CELEBRATE_MS = 320;
export const REACTOR_ARM_MS = 400;
export const REACTOR_PAUSE_MS = 8000;
/** Auto-advance between live scenes when not paused */
export const REACTOR_AUTO_ADVANCE_MS = 5200;
export const REACTOR_SHIMMER_MS = 1400;

export const REACTOR_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** CSS custom-property block (inject once per tree). */
export const REACTOR_CSS = `
:root {
  --reactor-fast: ${REACTOR_FAST_MS}ms;
  --reactor-ui: ${REACTOR_UI_MS}ms;
  --reactor-scene: ${REACTOR_SCENE_MS}ms;
  --reactor-celebrate: ${REACTOR_CELEBRATE_MS}ms;
  --reactor-arm: ${REACTOR_ARM_MS}ms;
  --reactor-pause: ${REACTOR_PAUSE_MS}ms;
  --reactor-shimmer: ${REACTOR_SHIMMER_MS}ms;
  --reactor-ease: ${REACTOR_EASE};
  --reactor-cyan: #22d3ee;
  --reactor-lime: #a3e635;
  --reactor-emerald: #34d399;
  --reactor-canvas: #0b1120;
  --reactor-desk: #071018;
}
.reactor-pressable {
  transition: transform var(--reactor-fast) ease-out, opacity var(--reactor-fast) ease-out, border-color var(--reactor-fast) ease-out, box-shadow var(--reactor-fast) ease-out;
  touch-action: manipulation;
}
.reactor-pressable:active { transform: scale(0.97); opacity: 0.85; }
.reactor-pressable:focus-visible,
button:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid var(--reactor-cyan);
  outline-offset: 2px;
}
.reactor-reach {
  border-color: rgba(52, 211, 153, 0.7);
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(16, 185, 129, 0.08));
  color: #ecfdf5;
  box-shadow: 0 0 28px rgba(52, 211, 153, 0.22), inset 0 1px 0 rgba(167, 243, 208, 0.12);
}
.reactor-reach-label { color: #a7f3d0; letter-spacing: 0.16em; }
.reactor-live-label { color: #a5f3fc; text-shadow: 0 0 12px rgba(34, 211, 238, 0.45); }
@keyframes reactorShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
@keyframes sceneSlideLeft { 0% { opacity: 0; transform: translateX(18px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes sceneSlideRight { 0% { opacity: 0; transform: translateX(-18px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes reachIn {
  0% { opacity: 0; transform: scale(0.92) translateY(6px); }
  60% { opacity: 1; transform: scale(1.02) translateY(0); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes armIn {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
