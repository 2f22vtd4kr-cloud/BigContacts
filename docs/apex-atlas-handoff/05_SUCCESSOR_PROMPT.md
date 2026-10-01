# Apex Atlas — Successor Operating Prompt

You are continuing engineering work on 2f22vtd4kr-cloud/BigContacts / Apex Atlas.

Do not rely on a prior chat as your source of truth.

## Read first

1. docs/context.md
2. docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md
3. docs/apex-atlas-handoff/00_INDEX.md
4. docs/apex-atlas-handoff/01_SYSTEM_INTRODUCTION.md
5. docs/apex-atlas-handoff/02_GEMINI_CONTROL_PLANE.md
6. docs/apex-atlas-handoff/03_RUNTIME_AUDIT_HISTORY.md
7. docs/apex-atlas-handoff/04_NEXT_WORK_PLAN.md
8. This file
9. Then read the named source/test files.

## Current state

Known main SHA: 8274f85c51417baec01567ce082a6d2f4673e813.

Latest authorized live job:
391bbe22-0414-4ed4-965d-5714181af242

Exactly one canonical launch:
targetCount=3
researchDepth=standard
targetTimeoutMs=420000

Terminal:
2026-10-01T04:08:00.295Z

Boss:
gemini-3.6-flash

Right-hand opening:
gemini-3.5-flash-lite

Terminal Right-hand:
gemini-3.1-flash-lite rate_limited

Discovery:
5 Serper searches
38 returned URL entries
0 visits
0 findings
0 candidates/cards
0 evidence rows

Durable:
case 1
12 events

Observability:
Redis trace endpoint 0 slots despite durable case events

Investigator:
Groq
Observed 413 request-size failures and 429/cooldown behavior
Model-facing context reached about 214,957 characters

Status:
NOT GREEN.

## Architecture law

Gemini Boss = control plane.
Gemini Right-hand = oversight.
Groq/Mistral = actual Investigator.

Never invert those roles.

Never:
- fake research;
- seed evidence;
- create scripted candidates;
- create replacement UI/backend;
- substitute Groq/Mistral for Gemini control;
- parallelize the canonical three-target proof.

## Immediate engineering work

1. Reconstruct Right-hand candidate/cooldown/retry/provider error behavior.
2. Fix Investigator model-facing context growth without destroying durable research history.
3. Fix or formally define Redis trace vs durable event behavior.
4. Add focused regressions.
5. Run frozen install/typecheck/check:bureau/build and relevant tests.
6. Re-check current official Gemini docs.
7. Only then perform a fresh authorized live audit.

## Gemini requirements

Use the real Gemini integration in the canonical workflow.

Current stable text pool:
3.8 Flash, 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite.

Preserve thinking-level contracts.

Distinguish transient 429 from daily quota.

Respect project-level quota semantics.

Do not use Live/TTS/image/preview models as text-control fallbacks.

## Runtime audit requirements

For a fresh run:
- create a new timestamped audit file;
- record exact SHA;
- record secret presence only;
- health 200;
- active job false;
- exactly one launch;
- targetCount=3, standard, 420000;
- audit every real model/tool/provider/evidence transition;
- prove sequential targets;
- verify durable state;
- stop at first genuine terminal failure;
- never manually continue a failed run.

## Final verdict

GREEN only if the current main SHA passes source verification and a real three-target sequential Atlas run completes with real Gemini Boss, real Right-hand, real Investigator, real tools, actual evidence, expected entity/card projections, durable persistence, and successful terminal state.

The goal is a genuinely working Apex Atlas without reducing its OSINT power.

## CURRENT MAIN / RUNTIME CORRECTION — 2026-10-01

Always verify current main before acting. The extended current-state handoff is `docs/apex-atlas-handoff/09_MASTER_SUCCESSOR_HANDOFF_2026-10-01.md`.

At the latest verified boundary, main had advanced through PR #450 control-plane test hardening. The current Gemini model registry and adaptive thinking policy are authoritative; stale expectations must not be restored. Model-pool cooldown state is explicitly reset between tests.

The latest canonical UI-equivalent launch was job `c201a722-623d-45f0-b667-e20a4737c3f1`, targetCount=3, standard depth, 420000ms. It was accepted with HTTP 202, but the environment exhausted its daily free quota while polling. **Terminal outcome: unknown/unobserved.** Do not classify it as success or failure and do not infer later stages.

Historical runtime jobs remain separate evidence: `391bbe22-0414-4ed4-965d-5714181af242` (Right-hand rate limiting, Investigator context-size failures, trace/event discrepancy) and `77c7fb64-8c85-4d23-b1f2-0e048b9e8012` (Boss HTTP 503/provider-unavailable before Investigator; PR #440 hardened this path).

Current release state remains NOT GREEN until a fresh synchronized runtime audit proves the complete canonical path.