# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current tip floor:** `42b36b0` or newer (Batch 10 permanent build repair)
**Canonical Replit path:** one paste — `docs/REPLIT_UPDATE_PROMPT_LATEST.md` (Agent inside the Repl). Expanded procedure: `docs/RUN_BUREAU.md`.  
**Product:** Apex Atlas research bureau; **Bureau is its OSINT/research architecture**, not a separate product.

## Current state
Apex Atlas is an AI-driven research bureau embedded in BigContacts. Models decide research actions; tools execute. The Dig path is free ReAct for one target and supports web search, page visits, browser fetching, email/username footprinting, domain/WHOIS, registry lookup, domain harvesting, reverse WHOIS, and `done`. Findings require real source URLs and are fail-closed. Dig findings persist into Bureau evidence and are promoted/rehydrated into the entity card.

Boss = Gemini. Right-hand = NVIDIA. Dig failover = Groq → Mistral → Gemini → NVIDIA. Every LLM prompt receives `apex-bureau-orientation.ts` because calls are memoryless.

**Build status (2026-08-29):** The two source merge artifacts that blocked `api-server` build are **fixed permanently** on `main` (`59c71ce`). CI checkout mutation for those two errors is obsolete.

**Replit status (2026-08-29):** No verified live Batch 10 desk preview / Dig / scoreboard yet in the operator’s sessions. Blockers so far have been **environmental** (OOM 137, Replit npm firewall/proxy, agent not attached to Repl runtime), not product reduction and not free-ReAct regressions.

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

Guards:
- `scripts/check-no-force-dig.sh` — blocks `force_*`, GROK-PARITY, force-company-surface
- `scripts/check-bureau-free-react.mjs` (`pnpm run check:free-react`) — requires model-selectable `web_search` / `visit` / `done`; rejects force-hop/playbook markers
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
3. Agent conversation sandbox not attached to Repl runtime — no injected `DATABASE_URL`; cannot truthfully boot API from pure chat. Must run in the **project Shell / API Server workflow** of the real BigContacts Repl.
4. Wrong project handoff (“create Apex Atlas”) and wrong account path guesses — ignore; stay on the Repl imported from this GitHub repo.
5. Old **ApexFinder Pro** web artifact is **not** Batch 10 preview. Only a fresh `artifacts/apex-finder` build + API serving `dist/public` counts.

**Lockfile recovery (allowed):** rewrite **only** firewall/proxy hosts in `pnpm-lock.yaml` to `https://registry.npmjs.org/` — do **not** change package names, versions, or invent dependency cuts. Example observed host: `http://35.245.43.102/npm/`.

**DATABASE_URL:** never ask, paste, or store as a Secret. Replit Postgres injects it into the Repl environment.

**Minimum secrets for non-critical integrity:** one Redis (`REDIS_URL` or `REDIS_URL_1`), one web-search provider (Serper/Tavily/Exa), one dig LLM (Groq/Gemini/Mistral/NVIDIA). Without search or dig LLM → `bureauIntegrity=critical` → do not claim quality.

**Canonical Replit sequence:**
```bash
git pull origin main && git log -1 --oneline   # 42b36b0+
# if lockfile has internal proxy IP hosts → rewrite hosts only (see above)
export NODE_OPTIONS=--max-old-space-size=1536
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org
pnpm install --no-frozen-lockfile --registry=https://registry.npmjs.org \
  --child-concurrency 1 --network-concurrency 1 --fetch-retries 5 --fetch-timeout 600000
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
test -f artifacts/apex-finder/dist/public/index.html
pnpm --dir artifacts/api-server run build
pnpm run check:no-force-dig && pnpm run check:free-react
ENABLE_AUTO_PIPELINE=false RESEARCH_DEPTH=standard bash scripts/replit-boot.sh
curl -sS http://127.0.0.1:8080/api/healthz
# if integrity not critical → single-target Dig (standard, discoveryFirst false) → scoreboard
bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080
```

**Scoreboard proof:** `POST /api/ingest/atlas-run` with `singleTargetId` + `researchDepth: "standard"` — not discovery-first bulk.

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
- One Redis (`REDIS_URL_1` or `REDIS_URL`).
- Never ask for/invent/print `DATABASE_URL`, `WHOXY_*`, or `REDIS_URL_2`–`_5`.
- Canonical setup: `docs/REPLIT_UPDATE_PROMPT_LATEST.md` (update tip floor to 42b36b0+ when editing that file).
- Single-target scoreboard proof uses `singleTargetId` and `discoveryFirst:false`.
- Agent must execute inside the project runtime (Shell/workflow), not a detached conversation sandbox.
- Do not create a second Repl mid-setup; do not treat old ApexFinder Pro artifact as current.

## Quality gate
After live Replit/GitHub execution, independent research on the same targets is the quality bar. Apex must honestly meet or beat it on identity, contact route, and source URL. Comparison is an audit, not a mechanism to manufacture an Apex win.


### 2026-08-29 docs consolidation
**Batch 11:** README, RUN_BUREAU, and REPLIT_UPDATE_PROMPT_LATEST rewritten so operators/agents have **one** Replit paste and one expanded runbook. Encodes OOM-safe install, lockfile proxy-host rewrite, no DATABASE_URL secret, project-runtime vs chat sandbox, empty-ledger seed-then-Dig, Redis quota, single-target scoreboard proof, free-ReAct law.


### 2026-08-29 greenfield prompt hardening
**Batch 12:** `REPLIT_UPDATE_PROMPT_LATEST.md` rewritten as the definitive one-shot Agent paste for a **new Replit account** (credits-exhausted prior Repl retired). Encodes: tip floor, free-ReAct law, secrets minimum, OOM/firewall install, empty lockfile recovery, healthz gate, Redis quota, empty-ledger tiny seed then STOP, single-target Dig proof, scoreboard, what success looks like (model-chosen tools + source URLs). README Run table points only at that prompt + RUN_BUREAU.

Prior live Repl went down / out of credits before sustained Dig monitoring — no verified scoreboard pass claimed.

## Still open
- ~~Permanent source fixes for atlas build breakers~~ — done Batch 10 (`59c71ce`).
- ~~Consolidate README / RUN_BUREAU / one Replit prompt~~ — Batch 11.
- Greenfield on a **funded** Replit account via Batch 12 one-shot prompt; complete Dig + scoreboard with ≥1 entity and healthy Redis.
- First honest Batch 10 public `/` preview (fresh desk build).
- First single-target Dig + scoreboard under non-critical integrity.
- Get live-audit GitHub Actions through build **without** relying on CI source mutation for the two fixed errors.
- Provider-chain / bounded-Dig timeout risk if reproduced live.
- 8-fixture Apex-vs-independent comparison with full trajectories.
- Multi-name card identity binding.
- Discovery quality vs residual template fallback.

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
