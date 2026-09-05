# Apex Atlas launch gate — 2026-09-03

This batch closes source-level control-plane defects without claiming a live research success.

## Fixed in this batch

1. **Canonical target Dig no longer calls legacy card rehydration.**
   `target-contact-agent.ts` now persists only the current investigator's source-backed output through `persistSourceBackedBureauContactsForEntity`. It no longer calls `rehydrateEntityCardFromEvidence`, which could rank or project unrelated durable evidence after a free-ReAct run.

2. **Canonical Dig output is marked as investigator/agentic evidence.**
   The target pass uses the `target-contact-agentic` source so the strict persistence boundary can apply an unambiguous investigator-emitted value without falling back to the legacy projector.

3. **Profile route recovery is per entity.**
   The profile error boundary is keyed by route id. A failure for one entity cannot remain latched when navigating to another HNWI.

4. **Profile failure UI cannot collapse with the shell.**
   The fallback is viewport-anchored and has an explicit test id. A renderer failure must show a visible recovery surface rather than another blank frame.

5. **Regression guards are executable.**
   - `scripts/check-profile-route-contract.mjs`
   - `scripts/check-canonical-promotion-boundary.mjs`

   Both are wired into the relevant frontend/API build paths.

## Still intentionally not claimed as proven

- A real model-selected discovery trajectory admitting a genuine named person.
- Full discovery-state continuity into a meaningful Dig trajectory.
- A live source-backed contact/card outcome observed on the deployed runtime.
- Reactor activity-only behavior observed against a live span stream.
- The exact production root cause of the historical Nick Ledger blank screen, beyond route-level recovery hardening. The next live navigation test remains mandatory.

## Launch rule

Do not call the product research-proof complete because a build is green. Before a production launch claim, observe at least one bounded 3-target trajectory:

`model discovery -> named person -> source-backed admit -> Dig -> investigator-emitted evidence -> honest card -> cookedAt`

No scripted discovery queries, force hops, deterministic person invention, or legacy rehydration are permitted to manufacture that proof.
