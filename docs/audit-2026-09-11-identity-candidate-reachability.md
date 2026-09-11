# Identity-candidate reachability audit — 2026-09-11

## Finding

The canonical `src/src/routes/identity.ts` route is mounted from the live API route index and exposes `POST /identity/resolve`.

That route deterministically constructs `identityBundles` and `identityCandidates` using `buildIdentityBundle`, `scoreIdentityMatch`, and `evaluateIdentityGate`. It labels the output `reviewOnly`, and the route's PATCH operation refuses confirmation unless the deterministic identity gate has accepted the candidate.

This is not currently a direct card-promotion bypass, but it is an architectural concern: Apex's institutional law assigns identity reasoning to AI, while deterministic code should validate model-authored claims. The route can therefore manufacture identity candidates without an Investigator finding.

## Reachability

- Live source: `artifacts/api-server/src/src/routes/identity.ts`.
- Mounted by: `artifacts/api-server/src/src/routes/index.ts`.
- Candidate writes: `identityCandidatesTable`.
- Legacy readers also exist in historical target/MCTS research.
- No evidence was found in this pass that `/identity/resolve` directly mutates an HNWI/Gatekeeper card or confirms a candidate without the route's review operation.

## Required decision

Before runtime acceptance, decide whether this route is:

1. a legitimate non-research identity-review utility that remains explicitly outside autonomous Atlas research, or
2. legacy deterministic research that must be retired/unmounted or converted into a model-authored identity-claim workflow.

Do not silently treat `reviewOnly` as equivalent to AI-owned identity reasoning.
