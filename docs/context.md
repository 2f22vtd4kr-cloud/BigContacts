# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current tip floor:** `97e395ac08d5d8b2a4eaa5eeb673add29d72c2dc` or newer (post-proxy-fix bounded-smoke trigger)  
**Canonical Replit path:** one paste — `docs/REPLIT_UPDATE_PROMPT_LATEST.md` (Agent inside the App). Expanded procedure: `docs/RUN_BUREAU.md`.  
**Product:** Apex Atlas research bureau; **Bureau is its OSINT/research architecture**, not a separate product.

## Current state
Apex Atlas is an AI-driven research bureau embedded in BigContacts. Models decide research actions; tools execute. The Dig path is free ReAct for one target and supports web search, page visits, browser fetching, email/username footprinting, domain/WHOIS, registry lookup, domain harvesting, reverse WHOIS, and `done`. Findings require real source URLs and are fail-closed. Dig findings persist into Bureau evidence and are promoted/rehydrated into the entity card.

**Canonical model-role boundary:** Boss = **Gemini**. Right-hand = **NVIDIA NIM**. Neither browses or executes web/OSINT tools. Actual web research is performed by the **Dig/investigator model lane**, whose currently enforced provider failover is **Groq → Mistral**. Gemini and NVIDIA must never silently become Dig providers. Every LLM prompt receives `apex-bureau-orientation.ts` because calls are memoryless.

Provider failover is capability-local transport infrastructure, not the Bureau hierarchy. A Dig fallback preserves the investigator role, objective, and model-owned research decisions; it does not prescribe searches or hops. If the Dig investigator pool is unavailable, the run fails closed with degraded/critical integrity rather than borrowing Boss/right-hand models for browsing.

**Capability placement rule:** Apex uses capable existing models; it does **not** require fine-tuning, reinforcement training, continued pre-training, adapters, or other training workflows to become capable. Engineering effort goes into correct role placement, complete useful state/tool exposure, provider reliability, provenance, and research autonomy. “No training” must never be interpreted as permission to cripple the model's research capabilities.

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
- **Do not train models as a substitute for architecture.** Use the capable existing models and place them in the correct Apex roles with the state/tools required to exercise their capabilities.

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

### 2026-08-30 model capability placement (Batch 21)
The living 40K specification now explicitly records that Apex is an orchestration/placement problem, not a model-training project. Existing capable models are to be placed into the correct roles and given the state/tools needed for their jobs. No fine-tuning or other training workflow is to be introduced merely to compensate for orchestration defects. Role separation is not a research-capability ceiling: Dig remains free-ReAct and model-directed.

### 2026-08-31 live 10-target recovery (Batch 22)
The first provider-resilient 10-target workflow was run for real at commit `4eb09900ef4ff09a6d1bcda4dea54b9f5cae47b8`. Build/startup succeeded and the Bureau genuinely entered discovery, but the run produced **0 admitted entities**: 9 web searches and 3 visits across the discovery pass, followed by an honest audit failure because the workflow requires the full 10-target batch. This is a research-quality failure, not a passing run. The evidence points to insufficient provider throughput/pacing and weak completed discovery trajectories rather than permission to add a scripted discovery path.

The relevant Groq base rate-limit table shows 30 RPM and 8K TPM for the listed Qwen 3.8/GPT-OSS lanes, with Qwen 3.8 having a larger daily token allowance. The previous workflow override used 2.5s pacing, which was too aggressive for multi-thousand-token ReAct turns. Commit `7833d72` changes the live workflow to **one provider decision at a time, 20s minimum Groq pacing, 55s provider-decision deadline, and a 120-minute job window**. The next run must be judged from its actual trajectory/artifacts; no success is implied by the configuration change.

### 2026-08-31 Run 33411996869 forensic addendum (Batch 23)
Run `33411996869` checked out `abc16393e0605975109209df0f6a89c48ca55ce7`, completed build/static checks/provider preflight/API startup/launch/polling, and then failed the live research-quality audit. Final artifact state was **1 admitted entity, 0 contacts, 0 direct routes**, not a valid 10-target proof. The entity was the malformed identity **“Head of Marketing”**, with a source note pointing to a Newswire contact block; it must not be treated as a real person.

Trajectory forensics show the provider was alive, but discovery quality was still poor: the status message reported **11 searches and 6 visits with `degraded=true`**, while the persisted discovery spans were dominated by `llm_wait` records and did not preserve usable discovery tool spans. The later Dig pass also made only **1 search / 0 visits / 2 iterations** before ending with 0 source-backed findings. The final audit correctly rejected the run because it had only 1 entity instead of the required batch and no contact evidence.

The most important diagnosis is **not a license to script discovery**. Two concrete defects are now addressed for the next bounded proof:
1. Generic title-shaped identities such as `Head of Marketing`, `Chief Marketing Officer`, `Vice President of Sales`, and `Managing Director` are explicitly rejected by the deterministic identity safety gate. The existing discovery parser tests already cover these title-shaped cases.
2. The live workflow was reduced to a **bounded 3-target discovery-first smoke** (`APEX_DISCOVERY_BATCH_SIZE=3`, target/research limit 3) so we can prove actual admits + Dig before paying for another 10-target run. The current workflow still uses real model-selected discovery; no template or ranked intake was added.

A further throughput observation: the runtime correctness hardener serializes ReAct research by default, but the previous live workflow overrode `APEX_AGENTIC_CONCURRENCY=3` while the provider pool was constrained to one decision. The next smoke should use **one ReAct research loop at a time** so free-tier provider pacing is not undermined by queued concurrent discovery/target loops. This is scheduling, not research-path selection.

Current main tip after the title-gate fix: `6e38d48b7c2b216581e0850648827848df49e894` (`fix(discovery): reject generic title identities at admission gate`).

### 2026-08-31 Run 33420624242 forensic addendum (Batch 24)
Run `33420624242` checked out `a62b51e850f0e15b08dcc2f7bf21b6be94dceed0` and completed build, static guards, provider preflight, API startup, bounded 3-target discovery-first launch, polling, live-state collection, and audit. This is **not a research-quality success**.

Live results: **3 entities admitted, 0 contacts, 0 direct routes**. The three persisted names were `Inclusion Recap`, `Inclusion A Business Case`, and `Equity Interview Series Learn`; all had `bayesianScore=0.2`, `contactOutcome=none`, and a shared Detroit Chamber source with `role=proxy_table`. The audit correctly recorded `sourceBackedContacts=0` and `collisionRisk=0`, but the identities themselves are not acceptable people.

The decisive new forensic finding is that `agentic-web-research.ts` contains deterministic SEC/DEF-14A proxy-page extraction which scans capitalized text for “related” names and emits them as `related-person:` findings with `role=proxy_table`. Those findings can satisfy the downstream discovery parser's source/shape checks even though the model never explicitly selected the person. This violates the discovery-first product law by letting deterministic extraction choose candidate identities.

The permanent fix is now on `main`:
- `artifacts/api-server/src/src/lib/discovery-agent.ts` rejects `proxy_table` findings before candidate admission, with an explicit comment preserving model-owned discovery.
- The discovery target is now source-level `Discovery slot N`, rather than relying on a build-time hardener to rewrite the old prose slot label.
- `artifacts/api-server/src/src/test/discovery-agent-parse.test.ts` adds a regression test proving a visited SEC page plus `proxy_table` related-person finding still produces **zero** discovery candidates.
- Commits: `105683b9769db9dd2a9800a73a200ddca5cbf18d`, `329ecd491766acbf955b2d23f1b68f1d512caf86`.

This fix intentionally does **not** remove the model's web tools, add a replacement search sequence, or create a ranking. The next live proof must determine whether the underlying ReAct discovery model can emit an explicit source-backed person once the deterministic proxy-name leakage is blocked.

The same run also confirmed provider-role behavior at the source level: the Dig lane is Groq → Mistral; the logged Groq model names such as `qwen/qwen3.6-27b` / `openai/gpt-oss-20b` are provider-local Groq catalog fallbacks, not Gemini/NVIDIA Dig execution. Mistral was not configured in that CI environment, while Groq generation preflight returned HTTP 200. Gemini preflight returned 429 for both configured keys, and NVIDIA preflight returned 200 as right-hand capability; neither was used as the Dig provider by the canonical `llmStep`.

**Next step:** run the bounded 3-target smoke again from the new main tip. Require at least one explicit model-selected, visited-source person admit and then inspect its free-ReAct Dig trajectory. Only after that proof should the workflow scale toward the 10-target blind-comparison audit.

### 2026-08-31 Batch 25 — post-proxy-fix smoke trigger
Main now advances through `c82ca466` (discovery-quality guard for the proxy boundary) and trigger commit `e565ed839c882c3a87cca741c6f31f9cf9d24182`. The existing resilient workflow's documented push surface was used to initiate the bounded 3-target smoke without changing the research path. No live outcome is claimed here yet: the GitHub connector available to this agent does not expose a usable push-run/workflow-dispatch or push-run listing endpoint, so the run must be judged only from actual workflow artifacts once accessible.

The source-level contract is unchanged: model-owned discovery; observed HTTP(S) person evidence; Dig = Groq → Mistral; no forced hops; no proxy auto-candidates; honest degraded/empty outcomes.

## Independent blind baseline contract
For every target that Apex actually admits and researches, the evaluation now requires a **blind independent OpenAI baseline**. The baseline receives only the original target/objective and its own public-web research opportunity; it must not receive Apex cards, Apex hypotheses, Apex URLs, Apex trajectory, or Apex rejection decisions. Use comparable wall-clock/tool opportunity. The baseline may beat Apex; a baseline win is a real Apex loss and becomes a bug investigation, never a reason to add forced hops.

Per-target comparison records must preserve:
- target and objective;
- Apex final card and complete evidence/provenance;
- Apex trajectory/provider/fallback telemetry;
- independent OpenAI trajectory/results and source URLs;
- identity correctness / namesake handling;
- direct-person vs organization-route honesty;
- primary-source usage and URL coverage;
- contact-route quality;
- unsupported-contact rate;
- empty-card-after-research and evidence-loss outcomes;
- time to first valid evidence and total research expenditure;
- winner/loser with an evidence-based explanation.

The baseline is a quality control, not a marketing benchmark. Do not preselect baseline targets after seeing Apex results, do not feed Apex discoveries into the baseline, and do not score trajectory length as a win.

## Still open
- ~~Permanent source fixes for atlas build breakers~~ — done Batch 10 (`59c71ce`).
- **Current gate:** bounded 3-target smoke must produce at least one real person-shaped admit with observed HTTP(S) evidence, then a free-ReAct Dig trajectory and honest card outcome. If it does, scale toward the 10-target audit.
- **Not done:** no green research-quality claim, no blind comparison yet, and no 10-target success claim until the artifacts prove it.


### 2026-09-02 control-plane audit — Batch 26
**Commit `bb319872bb3ed1229c57e2ba331799b8fefa9ffd`** closes two latent Dig control-plane hazards found by tracing the current source rather than relying on architecture prose:
- `agentic-web-research.ts` contained dead `callGeminiJson` and `callNvidiaJson` helpers. They were not in the canonical `llmStep` chain, but their presence made future role leakage easier and contradicted the fail-closed Dig boundary. They were removed; `llmStep` remains **Groq → Mistral**.
- The invalid-action repair prompt silently truncated its objective to 400 characters even though the normal discovery prompt preserves up to 4500 characters for discovery slots. Repair turns could therefore lose critical discovery law after a JSON parse failure. The repair path now uses the same discovery/dig objective budget split.

**Still unproven:** no live trajectory in this batch proves named-person admit → Dig → honest card. Do not call Apex ready for production or live-proof success on the basis of this source fix.

**Desk residual risk:** source audit found live-node keyword mappings that can still light legacy/role nodes from generic telemetry (including a Gemini node on an agentic target-contact condition and a Whoxy alias on RDAP/domain conditions). These must be corrected before claiming the desk is fully activity-truthful; the attempted UI write was not committed in this batch.

**Next:** finish the desk phase/legacy-node audit, run static guards, then only perform the bounded 3-target discovery-first smoke and inspect the actual trajectory/artifacts.


### 2026-09-02 Batch 27–28 — live desk truthfulness + bounded-smoke control plane
**Commits:**
- `dcce7a74b19902db0bf1f42c4a9f38fc84b8284e` — activity-only live reactor
- `ade5b3270effdcb067f8b0b0ae99b1bdb5bbc933` — bounded CI smoke gate
- `ca7af8be8c9a71fe7b5c18956a28e09a4c7124af` — discovery agent honors caller bound
- `557c366a076bc997d750739dc50a812956b2639a` — Atlas propagates targetCount into discovery

**Desk fixes (source-level):**
- When live-node telemetry is supplied, `rodStatus` no longer synthesizes queued/completed state from `ATLAS_PHASE_NODES`. Free-ReAct live state is span/tool telemetry, not a numbered pipeline.
- Generic `agentic/target-contact/free-dig` telemetry lights `FREE DIG + GROQ`, not Gemini. Gemini still appears only for explicit boss telemetry.
- RDAP/domain telemetry lights the real in-house/RDAP path, not the legacy `whoxy` alias.
- Mobile hides phase rails and numbered phase cards while Live tools has actual telemetry.

**Bounded-proof fix:** a caller requesting `targetCount: 3` previously entered `runDiscoveryAgent` without passing that bound, so the agent could silently use `APEX_DISCOVERY_BATCH_SIZE` (often 10) discovery slots. That made a nominal 3-target smoke fan out beyond its stated budget. `targetCount` is now explicit in `runDiscoveryAgent` and propagated from `runModelSelectedDiscoveryBureau`.

**CI launch surface:** the authoritative live-audit workflow now launches a **3-target / researchLimit 2** discovery-first smoke rather than immediately spending quota on a 10-target run. The 10-target audit remains a later scaling gate after real artifacts exist. The obsolete WHOXY secret was removed from this workflow's environment.

**Still unproven:** these are control-plane and UI truthfulness fixes only. No live artifact yet proves the complete chain **model-selected discovery → named person admit with observed HTTPS page evidence → Groq/Mistral free-ReAct Dig → honest evidence-backed or explicitly empty card**. Do not claim readiness, scoreboard success, or a win over the blind independent baseline until that trajectory and card artifacts are collected.

**Next:** run build/static checks on the current tip, then execute the bounded 3-target smoke in the actual runtime and perform trajectory forensics before any scale-up.


### 2026-09-02 Batch 29 — artifact comparison against prior Replit/GitHub live runs
**Evidence inspected directly:** retained workflow artifacts for run `33411996869` (commit `abc16393`) and run `33420624242` (commit `a62b51e8`), including launch/status/entities/scoreboard/API logs.

**Run 23 vs current:** the old 10-target run admitted only `Head of Marketing`. Its API log shows the discovery model initially hit Groq JSON-generation failure and then repeated Groq TPD/429 exhaustion; Mistral was unavailable. The persisted health showed the older agentic lane could still report a last Groq model even though the run failed research quality. Current source now explicitly requires a person-shaped name, independent HTTP(S) provenance, strong identity evidence, an actually observed page, and model-emitted findings; title-shaped identities are regression-tested and rejected.

**Run 24 vs current:** the old bounded 3-target run admitted `Inclusion Recap`, `Inclusion A Business Case`, and `Equity Interview Series Learn`. The artifacts show all three came from deterministic `proxy_table` related-person extraction on one Detroit Chamber page, while the final health was `bureauIntegrity=critical` because all Dig providers had failed. Current `parsePersonFindings` explicitly rejects `role=proxy_table`; the regression test requires the exact proxy-table shape to admit zero candidates. A discovery finding must now be model-emitted and tied to a visited/fetched HTTP(S) page.

**Additional live-audit defects found while comparing the artifacts:**
1. The canonical 3-target workflow launched `targetCount:3` but did not set `LIVE_AUDIT_TARGET_COUNT`; the audit script defaults to 10, so a correct 3-target proof could be falsely failed for expecting ten rows. Fixed in `beda2dd9` by setting the acceptance count to 3.
2. The resilient workflow still carried stale `WHOXY_API_KEY`, used the older 20s Groq pacing, and launched `researchLimit:3`. It is now aligned to the bounded proof regime: no Whoxy dependency, 30s Groq pacing, and researchLimit 2 (`d0c7b4e`).
3. The live audit previously checked that names looked person-shaped but did not independently require discovery admission provenance on each discovery-first row. It now requires `metadata.discoveryAgent===true` and at least one HTTP(S) discovery source (`097073c`).

**Interpretation:** the retained failures are now explained by two distinct historical defects: provider/output collapse (Run 23) and deterministic proxy leakage plus provider collapse (Run 24). The current implementation closes those specific admission/control-plane boundaries, but **has not yet produced a new live artifact proving research quality**. A new bounded smoke remains mandatory.

**Current next step:** run the current 3-target workflow/runtime, inspect the exact trajectory and provider responses, and only count a pass if at least one real named person is admitted from model-emitted, visited-source evidence and receives a Groq→Mistral free-ReAct Dig with an honest card result. The old artifacts must never be relabeled as success.


### 2026-09-02 Batch 30 — smoke acceptance semantics corrected from retained-run comparison
The artifact comparison exposed another control-plane mistake in the live audit itself: a bounded smoke is an exploration budget of three discovery slots, **not a requirement to admit all three**. The product acceptance gate is at least one real person-shaped, source-backed admit followed by a real Dig trajectory. Requiring three rows could falsely fail the exact proof we need.

**Fixed:**
- `scripts/audit-live-bureau.mjs` now uses `LIVE_AUDIT_MIN_ADMITS=1` rather than treating `LIVE_AUDIT_TARGET_COUNT=3` as a mandatory full-admission count (`ee582b6`).
- Both live workflows explicitly separate **3 exploration slots** from **1 minimum proof admit** (`f824078`, `150d1e4`).
- The audit now fails if final `bureauIntegrity=critical` or the completed status reports `degraded=true`. This specifically prevents the historical Run 24 pattern — “status done / 3 rows” while every Dig provider had failed — from being called a proof.

**Historical artifact replay, conceptually:** Run 23 fails on malformed title identity and provider collapse; Run 24 fails on malformed proxy-derived identities, `degraded=true`, and `bureauIntegrity=critical`. A current smoke can pass with one real admit, but only if the runtime remains non-critical and non-degraded and the row carries discovery-agent HTTP(S) provenance.

**Still unproven:** no current-tip live artifact has yet passed these corrected criteria. Do not equate the stronger audit contract with a successful research run.


### 2026-09-02 Batch 31 — provider preflight parity
The retained Run 23/24 artifacts showed that a tiny “READY” probe can be a false signal when Groq is near a token ceiling: the old run passed preflight, then normal-sized ReAct decisions immediately hit 429/TPD exhaustion. The resilient workflow still had the weaker probe. It now shares the canonical live-audit provider gate (`97e395a`): Groq/Mistral are probed as the only Dig readiness sources, Groq headroom is checked when rate headers are available, and launch aborts if neither Dig provider passes. This is provider transport gating only; it does not alter model-chosen research actions.


### 2026-09-02 Batch 32 — control-plane and desk truthfulness pass
**Control-plane audit result:** discovery admission is now genuinely model-finding-only: `runDiscoveryAgent` passes `result.modelFindings` into `parsePersonFindings`, and that parser requires a well-formed person name, independent HTTP(S) source, strong identity evidence, and an exact source URL observed through `visit`/`browser_fetch`. The historical deterministic proxy-table shape is explicitly rejected before admission. The admitted entity metadata carries `discoveryAgent` and `sourceUrls`, and the live audit now checks those fields for discovery-first rows.

**Fixed this batch:**
- Removed the dormant `callNvidiaJson` HTTP helper from `agentic-web-research.ts` (`bd1a42f`). NVIDIA is the right-hand, not a latent Dig provider. `check:agentic-runtime` now fails if that dormant helper returns (`911b864`). The actual `llmStep` remains Groq → Mistral only.
- Removed stale `reverse_whois` presentation branches from `bureau-agentic-pass.ts` (`a5f3091`). The current Dig action schema does not expose reverse-WHOIS; domain research is `domain_lookup` via RDAP/WhoisJSON.
- Reworked the Reactor control-plane display (`d821841`, `47d24af`): numbered phase progress is replaced with activity semantics, idle live tools stay absent, the deprecated Whoxy/WHOIS node and edges are removed, and the Boss is visually separated as case direction rather than an edge inside FREE DIG. The Dig LLM node now states `Groq → Mistral`.

**Important residual:** a GitHub Actions push-created `apex-single-target-audit` run on commit `47d24af` reported failure before any jobs were listed. That is not being treated as a research result or as evidence that the architecture is ready; its workflow/startup cause still needs inspection. No current-tip live discovery artifact exists yet.

**Next step:** resolve/understand the zero-job audit workflow failure if it is a real workflow defect, then run the current bounded 3-slot discovery-first smoke. Success remains **≥1 model-emitted, visited-source named-person admit → Groq/Mistral free-ReAct trajectory → honest card**, with non-critical/non-degraded final integrity. Otherwise document the failure trajectory rather than claiming readiness.


### 2026-09-02 Batch 33 — admission boundary locked against future drift
`check:discovery-quality` now asserts the exact discovery control plane: only `result.modelFindings` may enter admission, the candidate parser must receive the trajectory, and each admitted source URL must correspond to a `visit`/`browser_fetch` observation (`37954ef`). This is a regression guard for the historical Run 24 class of bug where deterministic extraction could manufacture clean-looking rows.

The source tip is now `37954ef54345af0cbe87ff920f6d5bf6cf269fe6` at the time of this note. **Still unproven:** no current-tip bounded smoke artifact exists. Static guards and UI truthfulness are not a substitute for the required live admit → Dig → honest-card trajectory.


### 2026-09-02 Batch 34 — critical discovery-first control-plane contract bug found and fixed
During the role-separation trace, `runModelSelectedDiscoveryBureau` was found calling `generateGeminiBossText` with the **old one-argument API** and reading the retired `.text` field. The current `case-bureau.ts` contract is `generateGeminiBossText(selection, prompt)` and returns `.raw`. This was a real architecture/runtime defect, not a cosmetic mismatch: the optional Boss discovery-direction branch could fail at runtime or typecheck.

**Fixed:** `atlas-orchestrator.ts` now passes the resolved Gemini selection and logs `brief.raw` (`2ed326c`). `check:discovery-quality` now locks that contract so future API drift is caught (`57099c`). The Boss remains text-only and its note is logged as direction; it is not turned into Dig queries or a fixed hop plan.

**Current status:** the discovery-first path is materially cleaner, but the required live proof is still absent. Do not call Apex ready until a current-tip bounded run produces the artifact chain.


### 2026-09-02 Batch 35 — architecture docs aligned with canonical tool surface
`docs/BUREAU_REACT_ARCHITECTURE.md` still described reverse-WHOIS as an available Dig capability. That contradicted the current schema and product law. It now names `domain_lookup` via RDAP/WhoisJSON and explicitly excludes deprecated Whoxy/reverse-WHOIS (`bf9d8af`).

No live claim follows from this documentation cleanup. The next meaningful artifact remains the bounded 3-slot discovery-first run on a current tip.
