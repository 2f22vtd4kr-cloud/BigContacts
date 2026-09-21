# Apex Atlas — Final Frontend Deployment Plan (19 Sep 2026)

This plan turns the final frontend pass into thirteen executable workstreams. Each workstream is constrained by the evidence-first product contract: the UI may explain, animate, filter, and replay recorded research, but it may not invent research activity.

## 01 — Visual breakpoint audit
Validate the shell at 320/375/390/768/1024/1280/1440/1720px and eliminate overflow, wrapping, spacing, and optical-centering defects.

## 02 — Command hierarchy
Keep Launch Apex as the dominant home command. The desktop primary CTA and secondary Reactor/Discover rail share the same right edge and command width; depth remains subordinate.

## 03 — Reactor iconography
Use the reusable cooling-tower Reactor mark everywhere Reactor is named. Functional tool icons remain method-specific.

## 04 — Desktop Reactor cockpit
Maintain simultaneous live desk + topology context. Live topology is derived only from recorded active telemetry; standby topology is explicitly explanatory.

## 05 — Mobile Reactor desk
Keep mobile feed-first. Desktop topology is not compressed onto the phone. History, search, filters, jump-to-live, and safe-area behavior remain available.

## 06 — Live event visual grammar
Map recorded tool, browser, registry, evidence, oversight, pivot, completion, and failure states to restrained visual states. Idle surfaces do not simulate activity.

## 07 — Evidence spotlight
Every research replay/detail surface must expose the recorded observation narrative and actual source URLs, with no model-generated source substitution.

## 08 — Research replay
Allow a completed investigation to be replayed at 0.5×/1×/2× with restart/pause. Replay is a presentation of the recorded trajectory, never a second execution.

## 09 — Accessibility
Preserve keyboard focus, 44px mobile touch-system tokens, safe areas, semantic regions, polite live announcements, visible focus rings, and reduced-motion equivalents.

## 10 — Resilience
Make stale, empty, offline, failed, cancelled, and terminal states explicit. A disconnected stream must not masquerade as current research.

## 11 — Performance
Bound event histories, topology rendering, and replay frames. Use content containment for long archives and avoid idle animation work.

## 12 — Delight layer
Prefer useful delight: replay, source spotlight, trajectory following, evidence freshness, and clear state transitions. Avoid celebratory animation that implies unsupported success.

## 13 — Deployment gate
Run source contracts, Reactor no-fabrication contracts, responsive contracts, production build, full codebase audits, research-quality contracts, and the matched empirical campaign. Certification is always against the exact final SHA.

### Acceptance rule

No frontend feature is accepted because it merely looks convincing. It must be structurally truthful, accessible, bounded, responsive, and backed by the actual application state.
