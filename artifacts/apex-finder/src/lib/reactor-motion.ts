/**
 * Apex Atlas Live Desk — motion & interaction tokens (black + yellow).
 */

export const REACTOR_FAST_MS = 130;
export const REACTOR_UI_MS = 190;
export const REACTOR_SCENE_MS = 250;
export const REACTOR_CELEBRATE_MS = 300;
export const REACTOR_ARM_MS = 360;
export const REACTOR_PAUSE_MS = 7500;
export const REACTOR_AUTO_ADVANCE_MS = 5000;
export const REACTOR_SHIMMER_MS = 1500;

export const REACTOR_EASE = "cubic-bezier(0.2, 1, 0.32, 1)";

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
  --reactor-yellow: #f0b429;
  --reactor-amber: #fde047;
  --reactor-gold: #fef08a;
  --reactor-canvas: #050505;
  --reactor-desk: #0a0a0a;
  --reactor-border: #2e2e2e;
}
.reactor-pressable {
  transition: transform var(--reactor-fast) ease-out, opacity var(--reactor-fast) ease-out, border-color var(--reactor-fast) ease-out, box-shadow var(--reactor-fast) ease-out;
  touch-action: manipulation;
}
.reactor-pressable:active { transform: scale(0.98); opacity: 0.88; }
.reactor-pressable:focus-visible,
button:focus-visible,
[role="button"]:focus-visible,
a:focus-visible,
input:focus-visible,
[tabindex="0"]:focus-visible {
  outline: 2px solid var(--reactor-yellow);
  outline-offset: 3px;
}
.reactor-reach {
  border-color: rgba(240, 180, 41, 0.58);
  background: linear-gradient(135deg, rgba(240, 180, 41, 0.18), rgba(250, 204, 21, 0.06));
  color: #fef9c3;
  box-shadow: 0 0 32px rgba(240, 180, 41, 0.22), inset 0 1px 0 rgba(253, 224, 71, 0.12);
}
.reactor-reach-label { color: #fde047; letter-spacing: 0.16em; }
.reactor-live-label { color: #facc15; text-shadow: 0 0 12px rgba(234, 179, 8, 0.5); }
[data-testid="mobile-workstage-swipe"]:focus-visible {
  outline: 2px solid var(--reactor-yellow);
  outline-offset: 3px;
}
@keyframes reactorShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
@keyframes sceneSlideLeft { 0% { opacity: 0; transform: translateX(14px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes sceneSlideRight { 0% { opacity: 0; transform: translateX(-14px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes reachIn {
  0% { opacity: 0; transform: scale(0.94) translateY(5px); }
  60% { opacity: 1; transform: scale(1.02) translateY(0); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes armIn {
  0% { opacity: 0; transform: translateY(5px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes terminalIn { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes activityFillBreathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.82; }
}
@keyframes reachSettle {
  0% { box-shadow: 0 0 32px rgba(234, 179, 8, 0.35), inset 0 1px 0 rgba(253, 224, 71, 0.18); }
  100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.16), inset 0 1px 0 rgba(253, 224, 71, 0.1); }
}
.reactor-reach[data-settled="true"] {
  animation: reachSettle 600ms var(--reactor-ease, cubic-bezier(0.22,1,0.36,1)) both;
}
.reactor-done-label { color: #fde047; letter-spacing: 0.14em; text-shadow: 0 0 10px rgba(234, 179, 8, 0.35); }
.reactor-fail-label { color: #fecdd3; letter-spacing: 0.14em; }
.reactor-archive-panel {
  border-color: rgba(64, 64, 64, 0.9) !important;
  background: linear-gradient(165deg, rgba(12, 12, 12, 0.98) 0%, rgba(5, 5, 5, 0.99) 100%) !important;
  box-shadow: inset 0 0 0 1px rgba(234, 179, 8, 0.06), 0 12px 36px rgba(0,0,0,0.55) !important;
}
.reactor-terminal-banner { border-radius: 12px; border-width: 1px; padding: 10px 12px; }
.reactor-terminal-banner[data-kind="done"] {
  border-color: rgba(234, 179, 8, 0.45);
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(12, 12, 12, 0.7));
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.12);
}
.reactor-terminal-banner[data-kind="failed"] {
  border-color: rgba(251, 113, 133, 0.45);
  background: linear-gradient(135deg, rgba(251, 113, 133, 0.12), rgba(12, 12, 12, 0.7));
  box-shadow: 0 0 20px rgba(251, 113, 133, 0.1);
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .animate-ping, .animate-pulse, .animate-spin { animation: none !important; }
}
`;

export const REACTOR_SWIPE_PX = 48;
export const REACTOR_SWIPE_VELOCITY = 0.4;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

export function motionOrNone(animation: string): string {
  return prefersReducedMotion() ? "none" : animation;
}
