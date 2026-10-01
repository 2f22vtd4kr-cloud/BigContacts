# Apex Atlas — Successor Handoff Volume Index

Purpose: durable continuation package for future ChatGPT/coding/research agents.
Repository: 2f22vtd4kr-cloud/BigContacts
Canonical branch: main
Known main SHA at package creation: f11371d95337c1bd8a7c2b49d7c383903a08bfb5
Package date: 2026-10-01

## Mandatory read order

1. docs/context.md
2. docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md
3. docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md
4. this index
5. 01_SYSTEM_INTRODUCTION.md
6. 02_GEMINI_CONTROL_PLANE.md
7. 03_RUNTIME_AUDIT_HISTORY.md
8. 04_NEXT_WORK_PLAN.md
9. 05_SUCCESSOR_PROMPT.md
10. then inspect the actual current source, tests, scripts, workflows, schema, and frontend.

This package is a memory aid, not a substitute for repository study. Documentation never outranks executable truth.

## Canonical source families

Runtime/control:
- artifacts/api-server/src/src/lib/case-bureau.ts
- artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts
- artifacts/api-server/src/src/lib/gemini-model-pool.ts
- artifacts/api-server/src/src/lib/agentic-execution-context.ts
- artifacts/api-server/src/src/lib/agentic-web-research-core.ts

Canonical Atlas:
- artifacts/api-server/src/src/routes/research/canonical-atlas-discovery.ts
- artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts
- artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts

Safety/evidence:
- artifacts/api-server/src/src/lib/contact-validation.ts
- evidence/promotion/identity/SSRF modules and tests

Persistence:
- lib/db/src/schema/research_cases.ts
- related research event/session/run/evidence/contact tables

Frontend:
- artifacts/apex-finder/src/lib/launch-atlas.ts
- artifacts/apex-finder/src/lib/use-atlas-run.ts
- Reactor/live-event consumers

Provider diagnostics:
- provider-error-diagnostics.ts
- Gemini transport/retry modules
- Mistral catalog resolution/cache

Deployment:
- scripts/replit-boot.sh
- scripts/initialize-apex-schema.sh
- scripts/replit-preflight.mjs
- .replit
- CI workflows

## Current status

Apex has a real model-owned OSINT architecture and substantial Gemini hardening. The latest authorized live run nevertheless failed closed at Gemini Right-hand control turn 4 before target research/evidence/card creation. The system is NOT GREEN.
