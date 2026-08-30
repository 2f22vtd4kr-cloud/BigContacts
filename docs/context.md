# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current tip floor:** `71f9a61` or newer (provider-role correction; Batch 20+)  
**Canonical Replit path:** one paste — `docs/REPLIT_UPDATE_PROMPT_LATEST.md` (Agent inside the App). Expanded procedure: `docs/RUN_BUREAU.md`.  
**Product:** Apex Atlas research bureau; **Bureau is its OSINT/research architecture**, not a separate product.

## Current state
Apex Atlas is an AI-driven research bureau embedded in BigContacts. Models decide research actions; tools execute. The Dig path is free ReAct for one target and supports web search, page visits, browser fetching, email/username footprinting, domain/WHOIS, registry lookup, domain harvesting, reverse WHOIS, and `done`. Findings require real source URLs and are fail-closed. Dig findings persist into Bureau evidence and are promoted/rehydrated into the entity card.

**Canonical model-role boundary:** Boss = **Gemini**. Right-hand = **NVIDIA NIM**. Neither browses or executes web/OSINT tools. Actual web research is performed by the **Dig/investigator model lane**, whose currently enforced provider failover is **Groq → Mistral**. Gemini and NVIDIA must never silently become Dig providers. Every LLM prompt receives `apex-bureau-orientation.ts` because calls are memoryless.

Provider failover is capability-local transport infrastructure, not the Bureau hierarchy. A Dig fallback preserves the investigator role, objective, and model-owned research decisions; it does not prescribe searches or hops. If the Dig investigator pool is unavailable, the run fails closed with degraded/critical integrity rather than borrowing Boss/right-hand models for browsing.

**Build status (2026-08-29):** The two source merge artifacts that blocked `api-server` build are **fixed permanently** on `main` (`59c71ce`). CI checkout mutation for those two errors is obsolete.

## Non-negotiable product law
- Never reintroduce force-hop, fixed-step, GROK-PARITY, ranked prefer-list, or scripted research playbooks.
- The model chooses the next research action. Deterministic code may enforce lifecycle, authorization, validation, provenance, budgets, timeout, and promotion honesty, but must not choose the research path.
- Never invent people, contact routes, relationships, or URLs.
- Organization routes remain organization-scoped; public personal and organizational surfaces should both be shown where valid.
- Exact source URLs are required for contact findings.
- `bureauIntegrity=critical` means research quality is not healthy; never claim a scoreboard pass in that state.
- Empty cards after successful contact extraction are promotion/rehydration bugs, not justification for scripted research.
- **Gemini is Boss and NVIDIA NIM is right-hand; neither is the Dig web-research lane.**
- **Dig failover is Groq → Mistral.** Do not use the historical `Groq → Mistral → Gemini → NVIDIA` wording as the current architecture.

## ReAct implementation
`artifacts/api-server/src/src/lib/agentic-web-research.ts` is the canonical API-server Dig loop. `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts` wraps it for Bureau. `artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` supplies product/role/tool orientation.

Guards:
- `scripts/check-no-force-dig.sh` — blocks `force_*`, GROK-PARITY, force-company-surface
- `scripts/check-bureau-free-react.mjs` (`pnpm run check:free-react`) — requires model-selectable `web_search` / `visit` / `done`; rejects force-hop/playbook markers
- `scripts/check-discovery-quality.mjs` (`pnpm run check:discovery-quality`) — guards the model-selected discovery identity/provenance boundary and practical-reachability guidance
- `scripts/check-agentic-runtime.mjs` (`pnpm run check:agentic-runtime`) — verifies Dig-only provider selection, bounded provider decisions, and absence of the old global circuit
- Wired into `pnpm run check:bureau` with trajectory + comparison-contract checks

### 2026-08-28 free-ReAct integrity batches
**Batch 1–2:** free-react guard + repository-root resolution fix.

### 2026-08-29 comparison/evidence batches
**Batch 3–5:** comparison template contract, reproducible protocol, trajectory-level autonomy evaluator (`check:trajectory`).

### 2026-08-29 live-execution recovery
**Batch 6–9:** timeout investigation notes; live-audit workflow; first CI run failed at **build** on two merge artifacts; temporary CI normalization bridge added (diagnostic only).

### 2026-08-29 permanent build repair
**Batch 10** (`59c71ce` source + `42b36b0` context):
- `artifacts/api-server/src/src/lib/atlas-orchestrator.ts` — fixed nested `import { import { ... phone-source-priority` merge artifact; clean separate imports for `phone-source-priority` and `bureau-contact-persist`.
- `artifacts/api-server/src/src/routes/atlas.ts` — removed duplicate `const ATLAS_LATEST_DISPLAY_TTL_MS` (keep single declaration; later use unchanged).
- Free-ReAct integrity unchanged. API build no longer depends on CI text mutation for these two errors.

### 2026-08-29 Replit operational path (greenfield + recovery)
**What failed in sessions (not product cuts):**
1. Agent OOM during `pnpm install` (exit 137) — use low concurrency + `NODE_OPTIONS=--max-old-space-size=1536`.
2. Replit package firewall/proxy — lockfile tarball URLs pointed at internal host `http://35.245.43.102/npm/...` (and similar). Public `registry.npmjs.org` returned 200 while pnpm still fetched lockfile URLs.
3. Agent detached Agent chat without project env not attached to Repl runtime — no injected `DATABASE_URL`; cannot truthfully boot API from pure chat. Must run in the **project Shell / API Server workflow** of the real BigContacts Replit App.
4. Wrong project handoff (“create Apex Atlas”) and wrong account path guesses — ignore; stay on the App imported from this GitHub repo.
5. Old **ApexFinder Pro** web artifact is **not** Batch 10 preview. Only a fresh `artifacts/apex-finder` build + API serving `dist/public` counts.

**Lockfile recovery (allowed):** rewrite **only** firewall/proxy hosts in `pnpm-lock.yaml` to `https://registry.npmjs.org/` — do **not** change package names, versions, or invent dependency cuts. Example observed host: `http://35.245.43.102/npm/`.

**DATABASE_URL:** never ask, paste, or store as a Secret. Replit Postgres injects it into the App environment.

**Minimum secrets for non-critical integrity:** one Redis (`REDIS_URL` or `REDIS_URL_1`), one web-search provider (Serper/Tavily/Exa), one **Dig investigator LLM** (Groq or Mistral under the current role boundary). Boss/right-hand availability does not satisfy the Dig requirement. Without search or Dig LLM → `bureauIntegrity=critical` → do not claim quality.

## Architecture
| Role | Canonical provider | Owns | Must not |
|---|---|---|---|
| Orchestrator | deterministic runtime | lifecycle, budgets, pause/stop | research judgment |
| Boss / Head Investigator | **Gemini** | case direction, investigator brief, final case gate | browse or invent contacts |
| Right-hand Advisor | **NVIDIA NIM** | case-file critique, evidence gaps, advisory recommendation | browse, execute OSINT, control Dig path |
| Discovery | model-selected discovery investigator | discover attributable people | final card promotion |
| Dig / Investigator | **Groq → Mistral** failover | actual web research, tool choice, pivots, evidence collection, stopping | bypass provenance/integrity boundaries |
| Tools | selected tool executors | execute the model's chosen action | self-fire as the research brain |
| Promotion | deterministic evidence/card mapping | preserve provenance and scope | invent values |

## Provider-role rule
Never describe `Groq → Mistral → Gemini → NVIDIA` as the current Dig chain. Historical documents may mention it as an obsolete state, but all current architecture and operator documents must say:

`Boss = Gemini`  
`Right-hand = NVIDIA NIM`  
`Dig = Groq → Mistral`

The distinction matters because Gemini/NVIDIA do not conduct web research in Apex. They reason over case state. The Dig investigator receives the objective and observations and owns the actual research trajectory.

## Replit law
- One API workflow on port 8080; desk at `/`, API at `/api/`.
- `ENABLE_AUTO_PIPELINE=false` by default.
- One Redis (`REDIS_URL_1` or `REDIS_URL`).
- Never ask for/invent/print `DATABASE_URL`, `WHOXY_*`, or `REDIS_URL_2`–`_5`.
- Canonical setup: `docs/REPLIT_UPDATE_PROMPT_LATEST.md` (update tip floor when editing that file).
- Single-target scoreboard proof uses `singleTargetId` and `discoveryFirst:false`.
- Agent must execute inside the project runtime (Shell/workflow), not a detached detached Agent chat without project env.
- Do not create a second Repl mid-setup; do not treat old ApexFinder Pro artifact as current.

## Quality gate
After live Replit/GitHub execution, independent research on the same targets is the quality bar. Apex must honestly meet or beat it on identity, contact route, and source URL. Comparison is an audit, not a mechanism to manufacture an Apex win.

### 2026-08-30 provider-role correction (Batch 20)
The repository had accumulated a dangerous ambiguity: the canonical orientation correctly said Gemini = Boss and NVIDIA = right-hand, while the generated Dig hardening temporarily carried a provider list that included Gemini/NVIDIA. The runtime check then correctly rejected that leakage, but the compatibility hardener remained capable of reintroducing it. This is now corrected:
- `scripts/apply-agentic-concurrency-hardening.mjs` remains the canonical Dig hardener and explicitly installs **Groq → Mistral** only.
- `scripts/apply-agentic-runtime-hardening.mjs` is now a compatibility entry point that delegates to the canonical hardener; it no longer owns a second provider implementation and cannot reintroduce Gemini/NVIDIA into Dig.
- `scripts/check-agentic-runtime.mjs` enforces that the Dig `llmStep` contains Groq/Mistral and rejects Gemini/NVIDIA leakage.
- Volume 433 is marked superseded by Volume 434.

This correction does **not** claim that the live research-quality problem is solved. It only makes the provider-role architecture internally consistent and prevents a stale hardening script from violating it.

### 2026-08-30 discovery quality hardening (Batch 15)
**Commit `75a7f4a8`** hardens the model-selected discovery boundary without introducing a ranking or scripted research path.

### 2026-08-30 discovery realism + audit hardening (Batch 16)
**Commits through `23fce4cfae91b548d1a631bcca285c3e5e30e7a1`** extend the same product law.

### 2026-08-30 model/human research alignment (Batches 17–19)
The live audits established that static autonomy checks can pass while the agent produces zero useful research. Prompt quality, provider readiness, observation quality, and trajectory quality must therefore be evaluated separately.

## Still open
- ~~Permanent source fixes for atlas build breakers~~ — done Batch 10 (`59c71ce`).
- ~~Consolidate README / RUN_BUREAU / one Replit prompt~~ — Batch 11.
- ~~Correct stale Dig provider-role documentation/hardener~~ — done Batch 20.
- Funded Replit/GitHub live Dig run with a real Groq/Mistral investigator and non-critical integrity.
- First honest single-target Dig + scoreboard with ≥1 source-backed result.
- First honest ten-target Apex-vs-independent comparison.
- Multi-name card identity binding.
- Discovery quality vs residual template fallback.
- Remove remaining build-time source mutation by committing the canonical generated Dig implementation itself, once the full generated source can be reviewed and tested safely.

## Quick commands
```bash
git pull origin main && git log -1 --oneline
pnpm run check:no-force-dig
pnpm run check:free-react
pnpm run check:discovery-quality
pnpm run check:trajectory
pnpm run check:comparison-contract
pnpm run check:agentic-runtime
pnpm run check:bureau
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
curl -sS --max-time 5 http://127.0.0.1:8080/api/healthz
bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080
```
