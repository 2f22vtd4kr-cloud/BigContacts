# Apex Atlas — 2026-08-31 session progress

## Verified at session start

- `main` was at the current engineering tip and was re-verified against GitHub before changes.
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

## Previous live 10-target attempt — forensics

Run `33401629903` (head `41b6be89`) reached the real provider-backed discovery phase and completed setup, API start, launch, polling, and artifact collection, but the quality gate correctly failed. It produced **0 entities / 0 admitted candidates**.

Forensic inspection of the uploaded live artifact showed the actual cause:

- Groq `openai/gpt-oss-20b` and `qwen/qwen3.6-27b` hit the organization's **200K TPD** quota during discovery.
- Groq `openai/gpt-oss-120b` also hit the same organization's TPD ceiling shortly afterward.
- Two early 20B turns were additionally rejected because the model emitted a tool call while the request had no tool declaration (`Tool choice is none, but model called a tool`).
- The provider preflight passed because it only proved that one tiny request could be generated; it did not prove enough quota remained for the batch.
- The run therefore failed for a real provider-capacity reason, not because the 10-target audit itself was disabled or skipped.

This failure is explicitly retained as a failure; it is not counted green.

## Provider hardening applied for the next run

Three synchronized Groq model catalogs were updated so an explicit `GROQ_AGENTIC_MODEL` is **strict** rather than silently falling through to other models. Default/current agentic choice is now `qwen/qwen3.8-27b` when no explicit override exists.

Commit sequence:

- `9eef04b2b13ae27a27b85850e141d29fa6d824bb` — strict agentic Groq model catalog in API source.
- `b9b6f9f032aaee88dbcf59cd37c672bf3f29e445` — synchronized legacy API catalog.
- `c4dda31ad467ef32e572553ebdab59da6db2657a` — synchronized runtime catalog.
- `9f44911dc52ae38e185c0ec8c0207c30efb61d21` — live audit pinned to `qwen/qwen3.8-27b`, serialized agentic concurrency, 5-second Groq pacing, and rate-limit header capture in preflight.

The current Groq documentation lists Qwen3.8-27B with a materially larger TPD allowance than the exhausted GPT-OSS/Qwen3.6 lane, while the API exposes remaining-token/reset headers. citeturn2search0turn2search9

## Current live 10-target run

- Workflow: **Apex Live Bureau Audit**
- Run: `33402261430` / run number `219`
- Head: `9ef57a94e6cf36eba4eb096188a82b6ec7b7e79e`
- Trigger: push via the intentional `scripts/live-batch-trigger.md` gate.
- Current state: provider-backed run is in progress; it has not yet reached the research-quality verdict.
- No target result, card, trajectory win, or comparison is being declared until the run actually produces and freezes them.

## Notion operator layer

Created a Notion page: **Apex Atlas — OSINT Bureau Dashboard**.

Created the **Apex HNWI Intelligence** database with person/entity, role, organization, identity confidence, reachability, estimated wealth, geography, source, research date, open questions and status fields, plus an **HNWI Command Board** dashboard view.

Added three operator views:

- **Reachability Board** — people grouped by realistic contact route.
- **Research Queue** — in-progress cases sorted by lowest identity confidence first.
- **Identity & Evidence QA** — source and identity review ordered by confidence.

## Next required gate

Do not call the 10-target batch successful until its actual artifacts are retrieved and independently audited target-by-target. The next engineering gate is trajectory forensics plus independent blind OpenAI comparison. If the run exposes failures, fix them before declaring the batch complete.
