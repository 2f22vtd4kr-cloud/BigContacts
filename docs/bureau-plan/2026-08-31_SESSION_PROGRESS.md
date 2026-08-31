# Apex Atlas — 2026-08-31 session progress

## Verified at session start

- `main` was at `f3745580356052b2670305ed72694ac76ae38367`.
- Canonical role boundary is intact: Boss = Gemini; Right Hand = NVIDIA NIM; Dig investigator = Groq → Mistral. Gemini/NVIDIA are not the web-research lane.
- The repository's free-ReAct Dig implementation remains model-owned: the model selects searches, visits, OSINT actions, pivots, and stopping within bounded budgets.
- The live audit workflow requires an actual Dig-provider generation before launching the 10-target batch.
- The historical contact extractor is still source-present but the build hardener replaces it with literal-contact observation only; this remains transitional architecture.
- Reactor Live is event-driven and explicitly avoids showing fake live activity when Atlas is idle.

## Gate repair completed

The live audit checker was stale relative to the current workflow. It expected old helper names (`groqProbe` / `mistralProbe` / `openaiProbe`) while the workflow had already moved to one capability-scoped `probe(url,key,model,provider)` helper with explicit role labels.

A focused checker repair was implemented and merged as PR #50 / merge commit `1037ed0ef72b65c9b4c40a90c7d6ebaf40975dff`.

The repair changes validation only; it does not change research behavior. It now checks the actual current provider-preflight contract:

- Groq is probed as `groq-dig`.
- Mistral is probed as `mistral-dig`.
- Dig readiness is `groq || mistral`.
- NVIDIA is separately probed as `nvidia-right-hand`.
- Launch remains fail-closed if no Dig provider can generate.

## Build blockers found and repaired

The first real current-main live run reached the build and exposed two infrastructure defects before any research began:

1. `ioredis` was imported by the API but not declared as an API runtime dependency. It was therefore absent from the filtered CI workspace install.
2. `apply-agentic-concurrency-hardening.mjs` and the legacy `apply-provider-gate-v2.mjs` both installed provider-gate declarations. The second script replaced `llmStep` while leaving the first script's constants in place, producing duplicate `MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS` and `GROQ_AGENTIC_MIN_INTERVAL_MS` declarations.

Fixes landed on `main`:

- `e572ab24782d3c81a0182326a0010ee65a74d9bd6` — declare `ioredis` directly in the API server runtime dependencies.
- `81d1d2160d85549b81ef19e767b0b289c588a7d6` — make the legacy provider-gate compatibility script a no-op when the canonical Dig gate is already installed.

The subsequent live workflow reached and passed both **Schema and API build** and **Static autonomy checks**.

## Current 10-target provider-backed batch

The corrected current-main audit was intentionally triggered via `scripts/live-batch-trigger.md`.

Current run:

- Workflow: **Apex Live Bureau Audit**
- Run: `33381234172` / run number `206`
- Head: `65962230a1f34efe285c016db1d9151f3854fb87`
- Provider preflight: **passed**
- API start: **passed**
- 10-target discovery-first launch: **passed**
- Current state: **Poll Bureau in progress**

No research-quality verdict is being claimed until the run freezes its actual outputs and the trajectories are independently audited.

## Live card-truth audit hardening

After inspecting the existing live audit contract, one gap was clear: it verified provenance and malformed targets, but a `direct_contact` outcome could still pass the deterministic audit without proving that the persisted route was explicitly personal/verified or that identity-collision risk was clear.

Fixed on `main`:

- `51002590e3a42c3283834315a6d59c5117c38ffb` — the live audit now requires `direct_contact` to have an explicitly personal/verified route, HTTP(S) evidence, and no remaining identity-collision flag.
- `organization_contact` now requires an explicitly organization-scoped route.
- Candidate routes and collision-risk counts are emitted separately so they cannot silently inflate direct reachability.

This change is for the **next** live audit checkout; the already-running run `33381234172` is intentionally not disturbed or restarted.

## Reactor integrity hardening

Found a subtle remaining Reactor issue: `explicitResearchQuery()` claimed to be explicit-query-only but returned arbitrary event text when no explicit `query:` / `search:` marker was present. That could turn a narration/title into something visually presented as a real search query.

Fixed on `main`:

- `591a09f3a7fb3ef727d24483f5f3b90f6c091651` — only an explicitly recorded query match may enter the browser query surface.
- `91cf1bca07278b3f9a0faf2ec059fe7b7b3153cd` — strengthened the no-fabrication checker to require the explicit-only implementation contract.

## Notion operator layer

Created a Notion page: **Apex Atlas — OSINT Bureau Dashboard**.

Created the **Apex HNWI Intelligence** database with person/entity, role, organization, identity confidence, reachability, estimated wealth, geography, source, research date, open questions and status fields, plus an **HNWI Command Board** dashboard view.

## Next required gate

Do not call the 10-target batch successful until its actual artifacts are retrieved and independently audited target-by-target. The next engineering gate is trajectory forensics plus independent baseline comparison. If the run exposes failures, fix them before declaring the batch complete.
