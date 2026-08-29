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

### 2026-08-29 live-execution recovery
**Batch 6:** Investigated the timeout problem instead of treating it as an opaque Replit failure. Historical GitHub Actions execution of the actual Apex runtime proved that the API can start with Postgres + Redis and provider keys loaded, but the older overnight loop repeatedly hit `poll_timeout` and an experiment that explicitly forced a visit after domain search; that experiment scored 13 vs a baseline of 109 and was discarded. The same run then recorded 12 LLM rounds with repeated empty proposals at score 13. This is historical evidence, not a current pass/fail claim.

The current Dig implementation also has provider-level request ceilings of roughly 40s Groq, 45s Mistral, and 50s NVIDIA, with sequential failover. That is a concrete timeout-risk when a bounded Dig budget is shorter than the worst-case provider chain; it is now an identified troubleshooting target. The code still exposes the full model-selected OSINT action surface and does not encode a fixed research sequence.

**Batch 7:** Added `.github/workflows/apex-live-audit.yml` and committed it to `main` (`09b2035cff819b40a66c436bfc3e48b582620b22`). This is the first repository-native executable audit harness intended to run the real API with local Postgres/Redis, real provider secrets from GitHub Actions Secrets, free-ReAct integrity checks, a real discovery-first Bureau run, status polling, entity/evidence capture, and scoreboard artifacts. It is deliberately independent of Replit so a Replit session timeout cannot block the experiment. The workflow was committed successfully; the GitHub connector did not yet return a workflow run for that commit at the time of this update, so **no live result from Batch 7 is claimed yet**.

Validation actually performed in this session:
- Direct inspection of the canonical ReAct loop, action parser, provider failover, orientation, atlas launch route, entity route, comparison template/contract, scoreboard script, and Bureau runbook.
- Historical GitHub Actions logs were inspected and confirmed real API/Redis startup, provider loading, repeated poll timeouts, forced-visit experiment discard, and repeated empty LLM proposal rounds.
- GitHub write succeeded for the executable live-audit workflow.
- **No current live Replit Dig or current live GitHub Actions Bureau result has been verified yet. Do not report these as passing.**

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
After live Replit/GitHub execution, independent research on the same targets is the quality bar. Apex must honestly meet or beat it on identity, contact route, and source URL. Comparison is an audit, not a mechanism to manufacture an Apex win.

## Still open
- Get the new GitHub Actions live-audit workflow to execute and retrieve its artifacts/results.
- Fix the concrete provider-chain / bounded-Dig timeout risk if the live audit reproduces it.
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