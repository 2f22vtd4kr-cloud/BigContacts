# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Product:** Apex Atlas research bureau; **Bureau is its OSINT/research architecture**, not a separate product.

## Current state
Apex Atlas is an AI-driven research bureau embedded in BigContacts. Models decide research actions; tools execute. The Dig path is free ReAct for one target and supports web search, page visits, browser fetching, email/username footprinting, domain/WHOIS, registry lookup, domain harvesting, reverse WHOIS, and `done`. Findings require real source URLs and are fail-closed. Dig findings persist into Bureau evidence and are promoted/rehydrated into the entity card.

Boss = Gemini. Right-hand = NVIDIA. Dig failover = Groq → Mistral → Gemini → NVIDIA. Every LLM prompt receives `apex-bureau-orientation.ts` because calls are memoryless.

## Non-negotiable product law
- Never reintroduce force-hop, fixed-step, GROK-PARITY, ranked prefer-list, or scripted research playbooks.
- The model chooses the next research action. Deterministic code may enforce lifecycle, authorization, validation, provenance, budgets, timeout, and promotion honesty, but must not choose the research path.
- Never invent people, contact routes, relationships, or URLs.
- Organization routes remain organization-scoped; public personal and organizational surfaces should both be shown where valid.
- Exact source URLs are required for contact findings.
- `bureauIntegrity=critical` means research quality is not healthy; never claim a scoreboard pass in that state.
- Empty cards after successful contact extraction are promotion/rehydration bugs, not justification for scripted research.

## ReAct implementation
`artifacts/api-server/src/src/lib/agentic-web-research.ts` is the canonical API-server Dig loop. `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts` wraps it for Bureau. `artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` supplies product/role/tool orientation.

The existing `scripts/check-no-force-dig.sh` blocks explicit `force_*`, GROK-PARITY, and force-company-surface regressions.

### 2026-08-28 free-ReAct integrity batches
**Batch 1:** Added `scripts/check-bureau-free-react.mjs` and wired it into the root scripts as `check:free-react` and `check:bureau`. The guard verifies that the Dig controller retains model-selectable `web_search`, `visit`, and `done` actions and rejects explicit force-hop/playbook markers. It is intentionally a guard, not a research script: it does not prescribe a research sequence.

**Batch 2:** Fixed the new guard's repository-root resolution. The first implementation resolved one directory too high when launched from `scripts/`; it now derives the scripts directory from `import.meta.url` and resolves the repository root from there. This was committed directly to `main` so the guard can actually execute against `artifacts/api-server/src/src/lib/agentic-web-research.ts`.

### 2026-08-29 comparison/evidence batches
**Batch 3:** Strengthened the actual Apex-vs-independent-research comparison contract rather than adding a separate benchmark product. `scripts/compare-template.mjs` and its contract require evidence URLs, ordered trajectories, tool-call counts, strategy changes/dead-end recovery/early-stop notes, and explicit `Apex wins / tie / Apex loses` outcomes. The root `check:bureau` includes the comparison contract.

**Batch 4:** Hardened the comparison protocol for reproducibility. The comparison template now freezes fixtures before Apex runs, requires three trials per fixture to be recorded as actually run (no silent cherry-picking), records trial-level duration/actions/evidence and aggregate Apex-vs-baseline quality, and adds explicit independence, free-ReAct, evidence/promotion, and failure-classification audits. This remains an audit of Apex rather than a mechanism for manufacturing an Apex win.

**Batch 5:** Added `scripts/evaluate-bureau-trajectory.mjs`, a deterministic trajectory-level autonomy evaluator. It consumes recorded Dig steps and checks the observed action surface, invalid/forced actions, termination, trajectory diversity, and model/provider decision evidence without scoring research quality. Added `scripts/fixtures/free-react-sample.json` and wired `check:trajectory` into `check:bureau`. This is deliberately separate from the quality comparator: autonomy evidence answers whether the run behaved like free ReAct; the blind outcome comparison answers whether the research was good.

Validation actually performed in this session:
- Direct inspection of the canonical ReAct loop, action parser, provider failover, comparison template/contract, scoreboard script, package scripts, and Bureau wrapper.
- GitHub writes succeeded for the trajectory evaluator, sample fixture, package wiring, and this handoff update.
- **No pnpm/Vitest/build/live Replit execution was performed by the GitHub-only session. Do not report these as passing.**

## Architecture
| Role | Owns | Must not |
|---|---|---|
| Orchestrator | lifecycle, budgets, pause/stop | research judgment |
| Boss / Gemini | case direction, final gate | browse or invent contacts |
| Right-hand / NVIDIA | advice + narration | control Dig path |
| Discovery | candidate discovery | final card promotion |
| Dig | contact research for one identity | scripted hops |
| Tools | execute selected actions | self-fire as the research brain |
| Promotion | deterministic card/evidence mapping | invent values |

## Replit law
- One API workflow on port 8080; desk at `/`, API at `/api/`.
- `ENABLE_AUTO_PIPELINE=false` by default.
- One Redis (`REDIS_URL_1`).
- Never ask for/invent/print `DATABASE_URL`, `WHOXY_*`, or `REDIS_URL_2`–`_5`.
- Canonical setup: `docs/REPLIT_UPDATE_PROMPT_LATEST.md`.
- Single-target scoreboard proof uses `singleTargetId` and `discoveryFirst:false`.
- Bounded Dig proof has a 90-second ceiling/forced stop if the API freezes.

## Quality gate
After live Replit execution, independent research on the same targets is the quality bar. Apex must honestly meet or beat it on identity, contact route, and source URL. Comparison is an audit, not a mechanism to manufacture an Apex win.

## Still open
- Live Replit scoreboard `milestonePass` after fixture re-cook.
- Execute the 8-fixture Apex-vs-independent comparison with real public targets and record complete Dig trajectories/evidence.
- Multi-name card identity binding.
- Discovery quality vs residual template fallback.
- Confirm operator is using the real BigContacts workspace, not a blank starter.
- Rebuild desk after UI changes.

## Cold-start rule
Any new AI/developer must read this file before changing Apex. After every meaningful implementation batch, update this file with the batch, files changed, validation actually run, current state, known issues, and next step. Never claim tests, deployments, or scoreboard results that were not actually executed.

## Quick commands
```bash
git pull origin main && git log -1 --oneline
pnpm run check:no-force-dig
pnpm run check:free-react
pnpm run check:trajectory
pnpm run check:comparison-contract
pnpm run check:bureau
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
curl -sS --max-time 5 http://127.0.0.1:8080/api/healthz
bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080
```
