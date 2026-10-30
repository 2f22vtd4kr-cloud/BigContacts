# Apex Atlas — Master Successor Handoff (30 October 2026)

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Mission:** Find the people behind the money — and how to reach them.  
**Current architecture:** Groq Boss → Groq Right-hand → selected Groq Investigator capability → model-owned research trajectory → deterministic safety/evidence/persistence boundary.

> This handoff supersedes all older "current" handoff claims, especially the 2026-10-02 / 17 / 19 provider and PR status narratives. Refresh actual GitHub `main`, PR heads, and Actions before relying on any status below. Historical audit and migration documents remain preserved as chronology.

## 1. Mission and architecture invariants

Apex is a model-led public-source investigative bureau, not a scripted enrichment workflow.

- Groq Boss owns case direction and selection of the Investigator capability.
- Groq Right-hand provides independent bounded oversight; it does not browse, execute tools, or choose the Investigator's tools.
- The selected Groq Investigator capability owns hypotheses, query design, source selection, tool choice, pivots, corroboration, falsification, and stopping.
- The runtime owns authorization, network/SSRF/egress safety, capability availability, structured-action validation, resource budgets, cancellation, locks, provenance, identity attribution, evidence admission, persistence, and truthful terminal state.
- Tools are capabilities, not mandatory stages. No fixed identity → company → social → email itinerary.
- Never add hard-coded semantic name blacklists (for example, a denylist of strings such as "Unknown" or "Example Corp") as a substitute for evidence evaluation. Models decide what information is relevant; the runtime admits only claims that meet the objective-independent evidence, attribution, scope, and provenance contract.
- Search snippets, registry results, usernames, worker output, and model assertions are leads. They are not automatically findings, identity proof, contact attribution, or cards.
- Unknown/insufficient evidence is a valid result. Do not invent people, wealth, sources, contacts, relationships, or tool activity.

## 2. Provider and credential truth

The canonical model roles are Groq Boss, Groq Right-hand, and the selected Groq Investigator capability pool. Older provider-control migration documents are historical only. They are not current provider instructions or secret requirements.

The exact Replit preflight active provider/integration secret list is maintained by `scripts/replit-preflight.mjs` and mirrored in `docs/REPLIT_NEW_ACCOUNT_SETUP.md`. The current UI manual is aligned to that list. Additional numbered Groq Boss, Right-hand, and Investigator slots are optional runtime capabilities; do not add retired keys because an old manual or archived handoff lists them.

## 3. Python OSINT specialist tools — implementation vs live availability

The repository has worker-backed adapters and model actions for:
- Holehe — `footprint_email`
- Maigret — `footprint_username_maigret`
- Sherlock — `footprint_username_sherlock`
- theHarvester — `harvest_domain`
- SpiderFoot — `footprint_spiderfoot`

The runtime refreshes worker availability before each Investigator turn. Only tools named in the fresh signed worker attestation and backed by independently pinned immutable worker/proxy image digests plus the isolated egress proof are included in that turn's action allowlist and model prompt. The model may then choose any available tool that fits its hypothesis and evidence gap. There is no mandatory Maigret → Sherlock fallback or other fixed tool order.

The API has no local subprocess/network fallback. A missing URL/token/image pin, failed/expired attestation, unavailable tool, or failed isolation proof leaves the tool unavailable. That is a fail-closed safety property, not a "no results" result.

**Deployment limitation:** repository CI builds/tests worker images but does not deploy the worker or prove Kubernetes NetworkPolicy enforcement in an external cluster. No live worker deployment/attestation is established by a GitHub source change alone. Replit's ordinary API run can proceed with core web/search/registry capabilities, but Python OSINT tools must remain marked unavailable unless that actual runtime returns a valid attestation. Do not bypass the gate to satisfy a UI expectation.

## 4. UI audit and corrections in this handoff

The review identified concrete source-of-truth drift:

1. The in-app manual still named retired model roles and showed old secret names. It is corrected to Groq roles and the current 13-name Replit preflight list, with optional numbered Groq slots distinguished.
2. The System Status page dynamically rendered old provider arrays and contained obsolete Open Research/provider copy. It is replaced with Groq Boss/Right-hand role cards, canonical Investigator/search key pools, integrity state, database health, and Upstash status.
3. The Python OSINT panel expected `{tools, gliner, installCommand}`, but `/api/system/status` returns a direct `pythonTools` boolean map. The panel therefore failed to read the actual API contract. It now reads the map directly, includes SpiderFoot, removes stale GLiNER/local pip-install advice, and clearly reports attestation-based availability.
4. The Sherlock description previously called it a Maigret fallback. It now describes an independent optional capability; tool choice remains model-owned.
5. The header launch control rendered a Crosshair glyph. The glyph is removed.
6. The API's `getAIKeyStatus` snapshot exposed retired provider arrays. It now reports only Groq Investigator, Serper, Tavily, and Exa capability pools.
7. The runtime's attested worker action exposure is made explicit through `exposeAttestedCapabilities`; default-disabled worker actions are exposed only when their exact action is present in the fresh turn allowlist. Tests cover both default-hidden and attested-visible behavior.
8. UI contract tests prevent retired-provider/manual drift, incorrect Python worker shape, missing SpiderFoot visibility, and launch-glyph regression.

The exact PR, head SHA, and check conclusions must be refreshed from GitHub after the changes are committed. Do not call this handoff integrated until the patch is merged to `main`.

## 5. Current run evidence and Replit state

The latest tracked live-run artifact known at the time of this handoff is `audits/apex-atlas-live-run-sequential-audit-2026-10-27.md`. Its final captured checkpoint did not terminally reconcile the most recent job. Historical job IDs do not establish the current Replit active-job state.

No Replit workspace interaction or live research launch is performed by this GitHub-only patch. Before the next user-controlled launch:
1. Import/sync the reviewed canonical `main` into the intended Replit workspace.
2. Confirm the built source SHA matches the merged main SHA; a healthy endpoint alone does not prove a fresh build.
3. Check API health, Postgres, Redis, schema, and the active Atlas job/target pointer and lock.
4. Read `/api/system/status` and verify the Groq roles/search capabilities. Read `pythonTools` and do not assume the specialist worker is connected.
5. Launch exactly one run through the normal UI path; preserve the job ID and run-bound audit.
6. Reconcile terminal job state, source observations, evidence/admissions, card projection, and lock release before another launch.

## 6. Verification standard

For the patch:
- Run focused API tests for active provider status and conditional Python capability exposure.
- Run Python OSINT worker contract tests.
- Run frontend UI contract tests and the required frontend five-condition gate.
- Run API build/typecheck, Atlas CI, discovery static checks, and all required full-code audit workflows on the exact PR head.
- After merge, verify the exact merge SHA on `main` and inspect workflows on that SHA.

For product acceptance:
- CI is not a real investigation.
- A run is not accepted because it returns nonempty cards.
- A candidate/card must be tied to attributable public evidence and durable state.
- Failure/unavailable/no-hit/negative/unknown outcomes must remain distinguishable.
- Do not claim Apex is live-accepted until a real Replit UI-launched investigation reaches terminal state and its durable evidence/card projection and lock state are reconciled.

## 7. Immediate next action

Refresh this handoff's PR/merge SHA and exact CI evidence once the UI/provider-truth patch is integrated. Then let the user sync that reviewed `main` into Replit and audit the actual UI flow. Do not start a Replit run, create a replacement app, bypass worker attestation, or invent runtime status.
