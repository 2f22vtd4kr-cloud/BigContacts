# Apex Atlas UI/UX Final Deployment Roadmap — 19 Sep 2026

## North star

Apex Atlas should feel like a premium investigator's instrument: quiet when nothing is happening, immediately legible when work begins, and deeply satisfying when real evidence arrives. Motion is explanatory, never theatrical. Every live visual must be derived from recorded backend telemetry; the interface must never invent a query, visit, finding, progress step, or completion state.

The desktop and mobile products share one visual language and one semantic live-activity model, but they optimize for different jobs:

- **Desktop:** situational awareness. The Live Desk and animated Bureau scheme can coexist, giving analysts both the narrative trace and a spatial model of the active architecture.
- **Mobile:** attention-efficient monitoring. The feed and current action are primary; the architectural scheme is intentionally removed from the live path so the user can read the investigation one-handed without a miniature desktop canvas.

## Final work plan

### 1. Establish the final visual system
- Consolidate spacing, radii, typography, state colors, focus rings, shadows, and motion timings into reusable Apex tokens.
- Keep lime/teal as signal colors and reserve coral/amber for actual failure/warning states.
- Remove visual noise before adding decoration: hierarchy first, glow second.
- Add safe-area, viewport, and reduced-motion rules to the shared shell.

**Done when:** every new Reactor surface uses the same tokens and no component relies on ad-hoc state semantics that contradict the backend.

### 2. Make Reactor Live the product's signature moment
- One canonical activity model drives both feed and visualization.
- Each new event gets a short entrance motion, actor badge, method icon, status, timestamp, and source/evidence affordances.
- Active work gets a restrained pulse; completed work settles instead of continuing to animate.
- Add an honest empty state and explicit stale/offline state.
- Preserve the existing anti-fabrication boundary.

**Done when:** a user can answer “what is happening, who is doing it, why does it matter, and what evidence arrived?” without opening a debug panel.

### 3. Desktop: build a two-layer live cockpit
- Keep the Live Desk as the narrative/evidence layer.
- Keep the animated scheme visible during live execution, but only light nodes and connections justified by real telemetry.
- Add clear separation between “recorded activity” and “architecture context.”
- Let users hide/show the desk without losing the live state.
- Keep scheme navigation, zoom, minimap, and keyboard focus usable.

**Done when:** the live desk and spatial scheme reinforce each other instead of competing for attention.

### 4. Mobile: optimize for one-handed monitoring
- Replace the large desktop-like rod wall during active work with a compact live surface.
- Put target, live state, current action, source count, and latest evidence above the fold.
- Keep history searchable and jump-to-live available.
- Use minimum 44px touch targets and safe-area padding.
- Do not shrink the desktop scheme until it becomes unreadable; mobile gets a different information architecture.

**Done when:** a user can glance at the phone, understand the current action, open the latest source, and return to live in two taps.

### 5. Make evidence arrival feel rewarding
- New source/evidence chips enter once, then settle.
- Contact-route discovery gets a one-shot REACH celebration and a persistent quiet state.
- Completion becomes a clear terminal summary rather than an endless animation.
- Failed/blocked states explain what actually happened and never imply successful research.

**Done when:** delight comes from real state transitions, not simulated activity.

### 6. Accessibility and operator control
- Keyboard navigation for desktop scheme nodes and controls.
- Visible focus rings.
- Polite milestone announcements; no per-tick screen-reader spam.
- Reduced-motion mode disables decorative motion while preserving state changes.
- Color is never the sole status signal.

**Done when:** keyboard, reduced-motion, and screen-reader flows remain understandable.

### 7. Performance and resilience
- Share one live telemetry subscription between feed and scheme.
- Abort stale polling requests.
- Bound rendered event counts.
- Avoid expensive layout/animation work when the desk is idle.
- Treat missing trace data as missing data, not as permission to fabricate activity.

**Done when:** live UI remains responsive on mobile Safari and desktop Chromium during long runs.

### 8. Deployment QA / bug hunt
- Run frontend static boundary checks.
- Run typecheck/build.
- Run existing Reactor tests and source-boundary tests.
- Exercise desktop and mobile states: idle, arming, active, empty-live, source arrival, contact found, completion, failure, cancellation, stale telemetry, rate limit, reduced motion.
- Verify no React key warnings, overflow traps, focus traps, hydration issues, or fake LIVE states.
- Re-run the final CI contracts on the resulting SHA.

## Small premium details to ship

1. **Evidence pulse:** a newly observed source briefly illuminates its chip and then becomes visually quiet.
2. **Live freshness meter:** show “live / quiet / stale” based only on actual telemetry freshness, with no fake countdown.
3. **Jump-to-live affordance:** when a user reads history while work continues, show a small “LIVE · n new” control rather than forcibly snapping the scroll.
4. **Actor handoff cue:** when the recorded actor changes, make the handoff legible in the timeline without adding synthetic events.
5. **Desktop focus mode:** temporarily dim unrelated scheme nodes when an operator focuses a real live event, while retaining the complete topology.
6. **Evidence drawer:** source links expose the hostname first and the full URL on demand, keeping the feed readable.
7. **Quiet completion:** after a run finishes, animation stops and the final state becomes a stable evidence summary.
8. **Truthful resilience:** network/trace outages visibly degrade to “telemetry unavailable” rather than showing stale LIVE theater.

## Acceptance bar

The frontend is deployment-ready only when the UI is visually coherent, responsive, accessible, performant, and empirically truthful across the full Reactor lifecycle. A beautiful animation that implies work the backend did not record is a defect, not polish.
