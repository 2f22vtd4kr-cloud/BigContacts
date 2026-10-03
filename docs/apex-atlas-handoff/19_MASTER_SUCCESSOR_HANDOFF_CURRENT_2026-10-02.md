# Apex Atlas — Master Successor Handoff — 2026-10-02

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Current HEAD:** `b392713b6ff1ce969b4a5f57adf3fd7b32610bb6`  
**Release state:** **NOT GREEN / NOT production-certified**

This document is the current continuation point for a new agent/new chat. The repository source and current runtime evidence outrank this document and all older chat summaries. Verify HEAD before acting.


> **CURRENT REMEDIATION — 2026-10-02:** Groq Boss + Mistral Right-hand is canonical. The latest authorized live job failed closed at the opening Mistral Right-hand gate before Investigator execution; the provider was classified `rate_limited`. Current code preserves structured provider diagnostics and continues readiness across role-scoped keys. Canonical runtime labels now use Groq/Mistral identities; Gemini remains historical/compatibility-only. Do not launch another live run yet. Run the synchronized build, typecheck, Vitest, and static-contract gates first.

## 1. Mandatory reading order

Read these before modifying code:

1. `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`
2. `docs/context.md`
3. `docs/apex-atlas-handoff/00_INDEX.md`
4. `docs/apex-atlas-handoff/01_SYSTEM_INTRODUCTION.md`
5. `docs/apex-atlas-handoff/02_GEMINI_CONTROL_PLANE.md` — historical/control-plane background; reconcile it against current source.
6. `docs/apex-atlas-handoff/03_RUNTIME_AUDIT_HISTORY.md`
7. `docs/apex-atlas-handoff/04_NEXT_WORK_PLAN.md`
8. `docs/apex-atlas-handoff/05_SUCCESSOR_PROMPT.md`
9. `docs/apex-atlas-handoff/07_RESEARCH_ARCHITECTURE_VNEXT_COMPLETION_2026-10-01.md`
10. `docs/apex-atlas-handoff/08_EPISTEMIC_OPTIMIZATION_VNEXT_IMPLEMENTED_2026-10-01.md`
11. `docs/apex-atlas-handoff/09_MASTER_SUCCESSOR_HANDOFF_2026-10-01.md`
12. `docs/apex-atlas-handoff/10_SUCCESSOR_MASTER_HANDOFF_CURRENT_MAIN_2026-10-01.md`
13. `docs/apex-atlas-handoff/17-groq-boss-migration.md`
14. `docs/apex-atlas-handoff/18-mistral-right-hand-migration.md`
15. this document.

Then inspect the current source/tests named below. Never assume an old SHA in a handoff is still current.

## 2. Current architecture — critical correction

The control plane is now:

```
Human objective
  -> Groq Boss: openai/gpt-oss-120b
       -> bounded openai/gpt-oss-20b fallback
  -> Mistral Right-hand: mistral-small-2603
       -> bounded mistral-small-latest fallback
  -> existing model-owned Groq/Mistral Investigator
  -> real capabilities / sources / observations
  -> durable evidence + provenance + hypotheses + contradictions
  -> bounded review/control
  -> deterministic terminal gate
```

**Gemini is no longer the canonical Boss and is no longer the canonical Right-hand.**

This matters because older handoff volumes and source filenames still contain Gemini terminology. The current source is authoritative.

### Role invariants

**Boss = control plane.**
- Frames/reviews the case.
- Selects and controls Investigator direction.
- Does not browse.
- Does not become the Investigator merely because Groq offers tools.
- Model output is a proposal, never terminal authority.

**Right-hand = independent oversight.**
- Challenges/reviews supplied context.
- Does not browse.
- Does not select research tools.
- Does not replace the Investigator.
- Must remain independently attributable from the Boss.

**Investigator = research executor.**
- Model-owned query generation.
- Source selection.
- Tool/capability use.
- Pivots, verification, disproof, narrowing/broadening.
- Hypothesis testing and stopping proposals.

Do not collapse these roles.

## 3. Evidence and epistemic laws

- Search results, snippets, model statements, URLs and directories are leads, not proof.
- Identity is a hypothesis, not a name match.
- Maintain competing hypotheses and discriminators where appropriate.
- Contact evidence is person-scoped.
- Company/domain information must not silently become person-level evidence.
- Source independence is lineage/source-family based, not hostname count.
- Durable history must remain complete even when model-facing context is bounded.
- Provider failures must remain visible as provider failures.
- Never fabricate evidence, cards, contacts, research, CI or completion.
- Never seed evidence/cards manually to make a run look successful.
- Never replace the Investigator with scripted research.
- Deep Research remains disabled by default; do not silently enable it.

## 4. Groq Boss — implemented

Canonical adapter:

`artifacts/api-server/src/src/lib/groq-boss.ts`

Models:
- primary `openai/gpt-oss-120b`
- bounded fallback `openai/gpt-oss-20b`

Credential:
- `GROQ_BOSS_API_KEY`
- numbered Boss slots `GROQ_BOSS_API_KEY_1` through `_10`.
- Generic `GROQ_API_KEY` remains reserved for Investigator use.

Transport:
`https://api.groq.com/openai/v1/chat/completions`

Behavior:
- strict JSON Schema control output;
- GPT-OSS reasoning level mapping;
- reasoning output suppressed;
- one bounded same-model 503 retry;
- short-window 429 retry;
- bounded model fallback;
- missing/unavailable provider fails closed;
- Boss has no research-tool authority.

### Context budget

Free-tier token budget is treated as a first-class constraint.

The Boss accepts already-compacted model-facing prompts up to **20,000 characters** by default.

Oversized prompts **fail closed**. They are not arbitrarily truncated.

Discovery context is compacted upstream while the durable case remains complete.

Relevant code:
- `artifacts/api-server/src/src/lib/groq-boss.ts`
- `artifacts/api-server/src/src/lib/case-bureau.ts`
- `artifacts/api-server/src/src/lib/case-bureau-prompt.ts`
- `artifacts/api-server/src/src/lib/investigation-context-compaction.ts`

Documentation:
- `docs/apex-atlas-handoff/17-groq-boss-migration.md`

Gate/test:
- `scripts/check-groq-boss-model-boundary.mjs`
- `artifacts/api-server/src/test/groq-boss.test.ts`

## 5. Mistral Right-hand — IMPLEMENTED, NOT PLANNED

This is especially important because earlier chat messages disappeared while the repository continued changing.

Canonical adapter:

`artifacts/api-server/src/src/lib/mistral-right-hand-reasoning.ts`

Provider/model:
- Mistral
- primary `mistral-small-2603`
- catalog fallback `mistral-small-latest`

Credential:
- `MISTRAL_API_KEY`
- numbered slots supported.

Transport:
- Mistral `/v1/models`
- Mistral `/v1/chat/completions`

Behavior:
- bounded request/overall deadlines;
- one bounded 503 retry;
- one short 429 retry;
- bounded catalog/model fallback;
- missing credentials/catalog fail closed;
- 20,000-character model-facing prompt ceiling;
- oversized context fails closed;
- durable history is not discarded.

Readiness:
`POST /api/system/diagnostics/mistral-readiness`

Regression:
`artifacts/api-server/src/test/mistral-right-hand.test.ts`

Boundary:
`scripts/check-mistral-right-hand-model-boundary.mjs`

### Gemini compatibility shim

`artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts`

is intentionally only a compatibility re-export shim. It contains no Gemini transport.

It aliases Mistral functions/types under legacy names so the established control call graph does not require an unsafe broad rewrite.

Do **not** restore Gemini transport merely because this file exists.

Documentation:
`docs/apex-atlas-handoff/18-mistral-right-hand-migration.md`

## 6. Why Gemini was replaced

Repeated real runtime failures occurred at the Gemini Boss boundary.

Important jobs:

- `77c7fb64-8c85-4d23-b1f2-0e048b9e8012`: Gemini Boss 503 before Investigator.
- `96a80589-f510-4703-b79f-cd8264e15715`: Gemini 3.8/3.7/3.5 Flash all returned HTTP 503 `service_unavailable`; no Right-hand/Investigator/discovery/research/evidence/entities/cards.

This was empirical provider-capacity failure. It did not justify bypassing the control plane. It justified changing the provider.

A temporary Cerebras migration was then abandoned because Cerebras required a credit card, violating the free/no-card constraint. It was completely rolled back. Do not resurrect Cerebras code.

## 7. Latest canonical live run

The latest exact UI-equivalent audit launch:

**Job:** `6097cdeb-d176-4807-96cb-1c59e334a5e3`

Request:

```json
{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}
```

Accepted:
**2026-10-02T13:32:45Z**

First observation:
**2026-10-02T13:33:02Z**

Observed then:
- HTTP 200
- running
- progress 0/4
- atlasPhase 0/4
- opening/control stage: Groq Boss -> Mistral Right-hand -> model-owned Investigator discovery

**Terminal state was not subsequently observed in the available context.**

Therefore it is **UNKNOWN / UNOBSERVED**, neither success nor failure.

Do not relaunch solely to compensate for missing observation.

## 8. Historical live-run evidence

### `391bbe22-0414-4ed4-965d-5714181af242`
- Right-hand failure.
- Context about 214,957 characters.
- Groq 413 request-size failure plus 429/cooldown.
- 5 Serper searches, 38 URL entries, 0 visits, 0 findings, 0 candidate cards/entities, 0 evidence rows.
- Durable case had 12 events.
- Redis trace showed 0 slots despite durable activity.

This drove the current model-context compaction and observability discipline.

### `c201a722-623d-45f0-b667-e20a4737c3f1`
- accepted with targetCount=3 / standard / 420000;
- terminal outcome unknown because daily free quota interrupted polling.

Do not conflate this with the other runs.

## 9. Status/readiness boundary

Ordinary:

`GET /api/system/status`

must remain side-effect-free with respect to provider calls.

Explicit catalog diagnostics:
- `POST /api/system/diagnostics/groq-readiness`
- `POST /api/system/diagnostics/mistral-readiness`

A successful catalog diagnostic proves only provider/catalog access. It does not prove a full Atlas run.

Never turn ordinary status into a hidden generation probe.

## 10. Research vNext architecture

Read:
- `docs/apex-atlas-handoff/07_RESEARCH_ARCHITECTURE_VNEXT_COMPLETION_2026-10-01.md`
- `docs/apex-atlas-handoff/08_EPISTEMIC_OPTIMIZATION_VNEXT_IMPLEMENTED_2026-10-01.md`
- `docs/BUREAU_REACT_ARCHITECTURE.md`
- `docs/bureau-plan/20_DIG_LOOP_STATE_MACHINE.md`
- `docs/bureau-plan/94_MODEL_ROUTING_TABLE.md`
- `docs/bureau-plan/227_BUREAU_CONTROL_FLOW.md`
- `docs/bureau-plan/434_PROVIDER_ROLE_SOURCE_OF_TRUTH.md`

Implemented concepts include:
- episode-level supervision;
- bounded evidence probing;
- atomic evidence bindings;
- provider disagreement;
- hypothesis scoring;
- falsification planning;
- empirical action-yield learning;
- cognitive-task routing;
- optional disabled-by-default Deep Research;
- independent Investigator lanes;
- lineage-aware terminal accounting.

Terminal-gate lineage correction:
`IntelligenceContext.independentSourceUnits` is authoritative. Do not reintroduce hostname-count independence logic.

Regression:
`artifacts/api-server/src/src/test/research-terminal-gate.test.ts`

## 11. Durable state

Important tables include:
- `research_cases`
- `research_case_events`
- `research_sessions`
- `research_run_events`
- `research_evidence`
- `contact_evidence`
- `entities`

Inspect current schema before relying on columns.

For live runs, record durable baseline and post-run deltas.

Redis trace is not sufficient authority; a prior audit showed Redis/durable discrepancies.

## 12. Replit/runtime history

Primary historical runtime:
- Repl `6c135477-3a6f-42bf-b714-a441bbe90e57`
- New Project
- `https://replit.com/@asalokama/New-Project`

Replit has repeatedly been stale relative to GitHub main.

Before runtime certification:
1. synchronize exact current main;
2. verify HEAD;
3. start the app;
4. check health;
5. check ordinary status;
6. check active-job lane;
7. optionally perform explicit provider catalog diagnostics;
8. only then perform the one authorized canonical Atlas run.

A previous startup took about 20 minutes and exhausted Replit credits. Avoid repeated install/build/check:bureau cycles before proving the app boots.

Preferred startup order:
**import -> configure -> start -> verify app -> verify status boundary -> optional readiness -> stop/continue.**

A historical `scripts/replit-boot.sh` defect had literal `\\n` text causing shell statements to be commented out; it was repaired. Inspect current source rather than assuming.

## 13. Frontend work already completed

Frontend root:
`artifacts/apex-finder/`

Theme work:
- Dark mode preserved.
- Light mode added.
- Light mode is monochrome/neutral with contextual contrast.
- palette refinements:
  - `#3E181B`
  - `#7C111A`
  - `#083322`
  - `#BA9C7B`
- no toxic neon green in Light mode.
- persistent accessible theme switch.
- early bootstrap avoids practical flash.
- color-scheme/theme-color synchronized.

Global button interaction:
- delegated interaction layer;
- quick lift/press motion;
- flowing animated surface underneath;
- theme-specific palette;
- reduced-motion support;
- opt-out support.

Important frontend commits:
- `aa0882e3fdf5768eedf79f195fd9ca3fb90a8466`
- `a1d42ec711adf67d799fda959de64da6c2b3b579`
- `f280e1d79cd04bf466db6074f3df2ff5c74a4451`
- `7de777cfa3fb770d497e6784b19078dd7e124af5`
- `77518f4b7d8d9cd78d018575675fe74885d1f2aa`
- `809b0e30fb63f02393be43b8057ce2c54bc15732`
- `0d26854a37871f4c00634636eeb3d3b4f69209e1`
- `24429e9d45ee4fe754cec54efb0d0df483b61540`
- `d19b0fb44a63dd3044594c9f0969da203ed5f53b`

No authentic current Light-mode screenshots were successfully retrieved through the Replit integration. Never fabricate visual QA/screenshots.

## 14. Current CI boundary at HEAD 44118b6

Exact HEAD:
`44118b641747b034eccc00d0aca5f0209aea3259`

Observed GitHub Actions:
- **Apex API Build:** PASS
- **apex-discovery-static-check:** PASS
- **Apex frontend five-condition gate:** PASS
- **Five Consecutive Full Code Audits:** FAIL
- **apex-live-audit workflow:** FAIL, with no useful listed job evidence exposed

### Full-code audit failure

The failure is in the Atlas control contract regression, after repository architecture suite, typecheck, and build passed.

File:
`artifacts/api-server/src/src/test/atlas-control-contract-regression.test.ts`

Two assertions still expect old Gemini implementation details:
- `runGeminiRightHandFreeJson(`
- `rateLimitRetryDelayMs` in `gemini-right-hand-reasoning.ts`

Current source intentionally has:
- `runMistralRightHandFreeJson` in `mistral-right-hand-reasoning.ts`
- a Gemini compatibility shim with no transport.

**Fix the stale test, not the architecture.**

The test should assert the canonical Mistral implementation and the compatibility boundary, including current bounded 429/503 behavior and latency exports.

Do not restore Gemini transport just to satisfy the old static test.

After fixing:
1. targeted Atlas control regression;
2. Mistral Right-hand tests;
3. Groq Boss tests;
4. provider-boundary gates;
5. typecheck/build;
6. inspect Actions;
7. only then consider full audit workflow.

### Live-audit workflow

The HEAD's `.github/workflows/apex-live-audit.yml` run is reported as failed but with no useful job listing in the available API response. Do not invent a cause. Inspect the workflow and current Actions behavior.

## 15. Exact source map to study

Control plane:
- `artifacts/api-server/src/src/lib/case-bureau.ts`
- `artifacts/api-server/src/src/lib/case-bureau-prompt.ts`
- `artifacts/api-server/src/src/lib/atlas-control-decision.ts`
- `artifacts/api-server/src/src/lib/apex-bureau-orientation.ts`
- `artifacts/api-server/src/src/lib/groq-boss.ts`
- `artifacts/api-server/src/src/lib/mistral-right-hand-reasoning.ts`
- `artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts`
- `artifacts/api-server/src/src/lib/investigation-context-compaction.ts`

Tests/gates:
- `artifacts/api-server/src/test/groq-boss.test.ts`
- `artifacts/api-server/src/test/mistral-right-hand.test.ts`
- `artifacts/api-server/src/src/test/atlas-control-contract-regression.test.ts`
- `artifacts/api-server/src/src/test/research-terminal-gate.test.ts`
- provenance/provider-cache tests
- discovery-quality tests
- Investigator architecture tests
- `scripts/check-groq-boss-model-boundary.mjs`
- `scripts/check-mistral-right-hand-model-boundary.mjs`
- `scripts/check-unified-investigator-architecture.mjs`
- `scripts/check-bureau-provider-role-docs.mjs`
- `scripts/check-final-review-role-boundary.mjs`
- `scripts/check-single-canonical-discovery-control-plane.mjs`
- `scripts/check-discovery-quality.mjs`
- `scripts/check-agentic-runtime.mjs`
- `scripts/check-agentic-timeout.mjs`

## 16. Context-budget rule

A previous failure reached roughly 214,957 model-facing characters.

Current law:

**durable full history -> explicit model-facing compaction -> 20K prompt ceiling -> fail closed if still oversized**

Do not:
- delete durable evidence;
- rewrite history;
- silently drop provenance;
- arbitrarily truncate model context;
- ask the provider to reconstruct omitted evidence.

Improve the compactor if necessary.

## 17. Live audit procedure

When explicitly authorized:

1. synchronize runtime to current main;
2. verify exact SHA;
3. health 200;
4. Redis healthy;
5. DB reachable;
6. active lane false;
7. ordinary status healthy;
8. secrets present without printing values;
9. static gates/typecheck/build;
10. optional explicit Groq/Mistral catalog diagnostic if authorized;
11. durable baseline;
12. exactly one launch:

```
POST /api/ingest/atlas-run
{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}
```

Then poll only the returned job.

202 is not success.

Verify:
- terminal job state;
- durable case/session/run events;
- evidence;
- contact evidence;
- entities/cards where applicable;
- source lineage;
- terminal-gate decision;
- provider failures;
- active-lane release.

Never rerun just to obtain a green outcome.

## 18. Secret rule

Never commit or expose:
- `GROQ_BOSS_API_KEY*`
- `MISTRAL_RIGHT_HAND_API_KEY*`
- generic `GROQ_API_KEY` / `MISTRAL_API_KEY` for Investigator only
- Gemini keys
- Serper keys
- DB credentials.

Record only secret names/presence, never values.

## 19. Immediate continuation point

**Do not migrate Boss or Right-hand again. Both migrations are already implemented.**

First fix the stale Atlas control contract regression for the Mistral compatibility architecture.

Then verify the resulting CI.

Then determine whether authoritative runtime evidence can recover the terminal state of job `6097cdeb-d176-4807-96cb-1c59e334a5e3`.

Only after current code/CI/runtime boundaries are reconciled should the next authorized canonical Atlas audit be considered.

### One-sentence successor brief

**Apex Atlas is currently Groq GPT-OSS 120B Boss + Mistral Small 4 independent Right-hand + model-owned Groq/Mistral Investigator; both provider migrations are implemented on main, HEAD 44118b6 has API/frontend/discovery gates passing but a stale Gemini-expectation contract test failing, the latest canonical job 6097cdeb-d176-4807-96cb-1c59e334a5e3 has an unobserved terminal state, and release remains NOT GREEN until the stale test, current runtime, and a real evidence-producing terminal audit are verified.**


## 2026-10-03 Mistral rate-limit investigation

The latest canonical UI-equivalent run failed at the opening Mistral Right-hand review with a 429/rate-limited classification. The provider detail in that live process was still serialized as `[object Object]`, so that specific run cannot identify the exhausted quota dimension and must not be treated as evidence that the new Right-hand key itself was invalid or exhausted independently.

Current Mistral documentation says API rate limits are organization-level and cover requests/sec, tokens/minute, and tokens/month; API keys are workspace-scoped and inherit workspace/org quota and rate limits. Therefore a newly created Right-hand key can receive a first-request 429 when the shared organization/model/workspace limit is already exhausted. 

The model `mistral-small-2603` is current Mistral Small 4 and supports Chat Completions and structured outputs. The adapter's new diagnostics preserve the model, HTTP status, provider code, non-secret credential fingerprint, Retry-After, rate-limit headers when supplied, retry counts, and redacted provider-body signals. The readiness function's missing closing brace was also repaired.

Current main after this remediation: `29723a8d557518bc00def7ccac5f241eb284a3b3`. No new live Atlas launch was made after the failed 2026-10-03 run. A synchronized preview/workspace must be verified against current main before another authorized run.
