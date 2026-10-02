# Apex Atlas Successor Handoff — Index

Prepared: 2026-10-01
Repository: 2f22vtd4kr-cloud/BigContacts
Canonical branch: main
Known main SHA at handoff: 8274f85c51417baec01567ce082a6d2f4673e813
Status: NOT GREEN / not production-certified

Mandatory reading:
1. docs/context.md
2. docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md
3. 01_SYSTEM_INTRODUCTION.md
4. 02_GEMINI_CONTROL_PLANE.md
5. 03_RUNTIME_AUDIT_HISTORY.md
6. 04_NEXT_WORK_PLAN.md
7. 05_SUCCESSOR_PROMPT.md
8. Then inspect every source/test file named by those documents.
9. Re-check current main SHA and current runtime; never assume this package is newer than source.

Source-of-truth hierarchy:
1. Current repository source at current SHA.
2. Current durable runtime/database evidence.
3. Current official provider documentation.
4. Fresh audit artifacts/logs.
5. These handoff volumes.
6. Historical chat summaries.

Critical conclusion:
The latest authorized live Atlas run was real but failed closed before target research. Job 391bbe22-0414-4ed4-965d-5714181af242 used exactly one UI-equivalent launch with targetCount=3, researchDepth=standard, targetTimeoutMs=420000. It ended 2026-10-01T04:08:00.295Z. Boss used gemini-3.6-flash; Right-hand opening used gemini-3.5-flash-lite; terminal Right-hand error identified gemini-3.1-flash-lite as rate_limited. Discovery made 5 Serper searches with 38 returned URL entries, 0 visits, 0 findings, 0 candidate entities/cards, and 0 evidence rows. Durable case 1 had 12 events. Redis trace returned 0 slots despite durable activity. Groq Investigator attempts also hit 413 request-size failures as context grew to about 214,957 characters, plus 429/cooldown behavior.

Do not call this GREEN.

Non-negotiable:
- Gemini Boss is control plane.
- Gemini Right-hand is oversight.
- Groq/Mistral is the actual Investigator.
- Preserve model-owned OSINT research.
- No scripted/fake/manual research.
- No manual evidence/card seeding.
- No Gemini-to-Investigator substitution.
- No Live/TTS/image Gemini models as text-control fallbacks.
- Do not parallelize the canonical three-target runtime proof.
- Do not launch again merely to reproduce a known failure.

## FINAL STATE — 2026-10-01

The earlier historical status above is superseded by this final state.

Current main SHA: 369887858c9d73f6eb6dd6aa37e668277b99eb28.

The research-architecture vNext control layer is merged and CI-verified. Read 07_RESEARCH_ARCHITECTURE_VNEXT_COMPLETION_2026-10-01.md for the complete implementation record.

Implemented:
- episode-level supervision;
- bounded Gemini Evidence Probe;
- atomic evidence bindings;
- provider disagreement signal;
- log-odds-style hypothesis scoring;
- falsification planning;
- empirical action-yield learning;
- cognitive-task model routing;
- optional disabled-by-default Deep Research escalation;
- existing opt-in independent Investigator lanes.

CI:
- API Build 1992: success;
- Research Quality Contracts 541: success;
- Prompt Architecture Audit 711: success;
- Five Consecutive Full Code Audits 1073: success, five of five;
- Five Green Complete Codebase Audit 1218: success, five of five;
- ordinary audit: success.

The current live Replit workspace is stale at f697fd1140a1159992221f3e4ff1b8f4fc03fabf and cannot boot the API because of a syntax defect in canonical-case-continuation.ts:21. Health/system/active-job endpoints return 502. No post-merge Atlas run was launched.

Therefore the architecture is CI-verified, but the live runtime is not yet re-certified. Synchronize Replit to current main before the next canonical three-target audit.

The final completion record is 07_RESEARCH_ARCHITECTURE_VNEXT_COMPLETION_2026-10-01.md.


## FINAL DOCUMENTATION SHA — 2026-10-01

Current main is 64a4f20c25d8888112a4dc025f19e576d52fb774 after PR #447 merged the final successor-documentation state. No production code changed in PR #447.

The architecture batch remains CI-verified; live runtime remains a separate gate because the available Replit workspace is stale and returns API startup 502 after a syntax failure. Do not call Apex production GREEN until Replit is synchronized and the canonical three-target run is audited.


- `08_EPISTEMIC_OPTIMIZATION_VNEXT_IMPLEMENTED_2026-10-01.md` — implemented epistemic optimization vNext roadmap, deliberate non-implementations, and validation requirements.


## CURRENT MAIN CORRECTION — 2026-10-01

The older SHA references above are historical. The current verified main at the latest handoff preparation is:

`21f2b22447698c7de2f4026f70e33693c901cf26`

The authoritative extended successor package is now:

- `docs/apex-atlas-handoff/09_MASTER_SUCCESSOR_HANDOFF_2026-10-01.md`

Read that file after the mandatory repository study sequence. It reconciles the previous handoff volumes with the latest control-plane test hardening and the latest live-runtime boundary.

The latest exact UI-equivalent live launch was accepted as job `c201a722-623d-45f0-b667-e20a4737c3f1`, but its terminal outcome was **not observed** because the environment exhausted its daily free quota while polling. This is neither success nor failure. The system therefore remains **NOT GREEN**.

Recent main commits after the epistemic vNext merge:
- `9f17d5b9c2a900bd2dcf43595987a76060b2d39f` — model-pool contract alignment;
- `f4fd5feeaa9dd6bba74dd9ca88475cc1a3b7c0e0` — adaptive-thinking/cooldown test hardening;
- `21f2b22447698c7de2f4026f70e33693c901cf26` — PR #450 merge.

The latest relevant parent-commit CI evidence is green across API Build, Research Quality Contracts, Prompt Architecture Audit, Five Consecutive Full Code Audits, and Five Green Complete Codebase Audit.

## CURRENT MASTER HANDOFF — 2026-10-01

The repository has advanced beyond the SHA references in the historical sections above.

Latest verified main at the time this index was reconciled:
`7a2f15107081043e16b3af26e25317519f5f5e60`

A new current-main successor package is now authoritative as a continuation guide:

`docs/apex-atlas-handoff/10_SUCCESSOR_MASTER_HANDOFF_CURRENT_MAIN_2026-10-01.md`

The successor MUST still verify a newer `main` HEAD before acting.

The newest commits after PR #450 are documentation/handoff reconciliation commits. They do not constitute a new production architecture rewrite.

The latest exact UI-equivalent live launch remains:

`c201a722-623d-45f0-b667-e20a4737c3f1`

It was accepted with HTTP 202 using:
`targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`.

Polling was interrupted by the environment's daily free-quota exhaustion. Its terminal outcome is therefore **UNKNOWN / UNOBSERVED**. Do not classify it as success or failure.

Current release state remains **NOT GREEN / not production-certified**.

## 2026-10-01 continuation boundary

Current verified `main` contains the merged PR #451 terminal-gate correction:

`3fa9559a3805a4d322228c85d2c6ef0a51aa48ab`

It is a deterministic evidence-accounting fix only: terminal evaluation now consumes the lineage-aware `IntelligenceContext.independentSourceUnits` value rather than recomputing independence from hostnames. Regression coverage exists in `artifacts/api-server/src/src/test/research-terminal-gate.test.ts`.

Static verification for the corrected PR head passed the Apex API build, workspace typecheck, strict provenance/provider-cache tests, and Research Quality Contracts. The initial typecheck failure during the patch was corrected before merge.

**Release remains NOT GREEN.** The remaining proof obligation is empirical runtime validation on the synchronized deployment environment, followed by the authorized canonical three-target audit.

## 2026-10-01 live-runtime reconciliation

Fresh Replit audit job: `96a80589-f510-4703-b79f-cd8264e15715`, run on `21f2b22447698c7de2f4026f70e33693c901cf26`.

Observed terminal boundary: Gemini Boss opening. Three eligible Gemini models returned HTTP 503 `service_unavailable`; no Right-hand, Investigator, discovery, evidence, or entity/card admission occurred. Durable counts stayed at zero and the active lane was released.

The audit did not establish a global Gemini outage or invalid request shape. Current official Gemini documentation confirms the relevant Interactions API models/request format.

Post-audit deterministic test reconciliation was merged into current main:
`14eff01d17ab3d95340139521405ca8ca9edccf1`.

Release remains **NOT GREEN**. No fresh live research run should be launched merely to compensate for this failure; the next runtime attempt requires a provider-capacity/readiness decision and must remain a single authorized audit.


## 2026-10-02 CI verification reconciliation

Current main advanced through PR #456. The merged CI commit is:

`3322a2df13e17c0a0deb335845d4104b04789eef`

PR #456 added the corrected Gemini Interactions control-plane regression suite to the canonical `Apex API Build` workflow. The workflow now executes:

`pnpm --dir artifacts/api-server exec vitest run src/test/gemini-interactions.test.ts`

Verification on PR head `054d60b859d66a36b14d302e6cd6498fab629843`:
- Apex API Build: **success**.
- Gemini Interactions suite: **5/5 tests passed**.
- Existing strict provenance/provider-cache tests: **12/12 passed**.
- Workspace/API typecheck completed successfully before the test gate.
- The Gemini suite includes regression coverage for a transient HTTP 503 retry on the same model.

A first CI attempt failed because the newly added workflow step used the wrong repository path; that was corrected and the second CI run failed only on a stale call-order assertion. The assertion was corrected to inspect the generation request after catalog discovery. The final CI run then passed.

The live-runtime blocker is unchanged: the 2026-10-01 canonical Replit run `96a80589-f510-4703-b79f-cd8264e15715` failed at Gemini Boss opening with three HTTP 503 `service_unavailable` responses and produced no admitted research/evidence/entities/cards. The repository now has stronger regression verification, but this does **not** certify live Gemini availability or production readiness.

Do not launch another canonical live research run merely to obtain a green result. Before the next authorized live audit, verify provider readiness/capacity and synchronize the deployment environment to current main. Release remains **NOT GREEN / not production-certified**.


## 2026-10-02 Groq Boss migration

New control-plane implementation is documented in [17-groq-boss-migration.md](./17-groq-boss-migration.md).

Boss now routes through Groq GPT-OSS 120B with bounded GPT-OSS 20B fallback. Gemini remains the independent Right-hand. Ordinary system status remains provider-call-free; Groq catalog readiness is an explicit diagnostic only. The canonical live Atlas run remains unverified until a fresh authorized audit reaches the real research/evidence terminal path.

- [18 — Mistral Right-hand migration](./18-mistral-right-hand-migration.md)


## CURRENT MASTER HANDOFF — 2026-10-02

Current main HEAD: `44118b641747b034eccc00d0aca5f0209aea3259`.

The authoritative continuation document is now:

`docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md`

It supersedes older master-handoff documents where they conflict. Read older volumes for history, but current source and runtime evidence win.

**Critical current architecture:** Groq GPT-OSS 120B → 20B fallback is Boss; Mistral Small 4 → `mistral-small-latest` is independent Right-hand; Investigator remains model-owned Groq/Mistral.

**Current CI boundary:** API Build, frontend five-condition gate, and discovery static check pass on HEAD. Five Consecutive Full Code Audits currently fails at the Atlas control contract regression because `artifacts/api-server/src/src/test/atlas-control-contract-regression.test.ts` still asserts old Gemini Right-hand implementation details. Fix the stale test against the Mistral implementation/compatibility shim; do not restore Gemini transport.

**Latest canonical runtime job:** `6097cdeb-d176-4807-96cb-1c59e334a5e3`. It was accepted and observed running at 0/4 in the Groq Boss → Mistral Right-hand → Investigator opening stage; terminal outcome remains unknown/unobserved in the available record.

Release remains **NOT GREEN / NOT production-certified**.
