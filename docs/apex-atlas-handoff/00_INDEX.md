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
