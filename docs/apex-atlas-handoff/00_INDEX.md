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