# Apex Atlas — Exact Execution Checklist for the Next Agent

## Stage 0 — Authority

- Inspect repository 2f22vtd4kr-cloud/BigContacts.
- Inspect branch audit/genuine-five-green-final.
- Record actual HEAD SHA.
- Do not treat an old document SHA as current if the branch moved.
- Do not make Replit's local unpushed commit authoritative.

## Stage 1 — Read architecture

Read:
- docs/context.md
- docs/BUREAU_REACT_ARCHITECTURE.md
- docs/APEX_RESEARCH_ROADMAP_V3.md
- docs/APEX_RESEARCH_PHASE_PLANS_V3.md
- docs/APEX_RESEARCH_GAUNTLET_V1.md
- docs/REPLIT_NEW_ACCOUNT_SETUP.md
- all files in docs/APEX_NEXT_AGENT_HANDOFF/

## Stage 2 — Search stale contracts

Search the repository for:
- Lossless assembly of durable investigation context
- removeOnlyRecursivePrior
- Complete Investigator trajectory records
- Complete evidence attribution state
- old WHOIS references
- DeepSeek
- NVIDIA NIM
- unbounded trajectory prompt assembly
- Gemini as Investigator fallback
- fixed research sequence language

For every match classify it as live source, guard, test, documentation or historical record.

Reconcile active contracts. Do not delete historical information merely because it describes the old design.

## Stage 3 — Fix the two current blockers

1. Update scripts/check-investigation-context-compaction.mjs so it tests the actual bounded-memory architecture.
2. Update scripts/check-discovery-context-control.mjs so it tests:
   - bounded active context;
   - durable trajectory outside prompt;
   - durable structured Investigator records;
   - immutable observation/claim provenance;
   - Right-hand completion/fail-closed behavior;
   - source-backed promotion;
   - no recursive context-document copying.

It must NOT demand:
- lossless active prompt;
- unlimited context;
- complete raw observations in the prompt.

Prefer invariant-oriented checks over brittle sentence matching.

## Stage 4 — Add regression tests

Required:
- 30/100/500 synthetic trajectory records;
- huge observations;
- long URLs;
- duplicate findings;
- contradictory findings;
- emergency reducer max enforcement;
- 413 provider retry;
- same provider/model after 413;
- no Gemini fallback;
- terminal state;
- evidence promotion;
- identity ambiguity;
- contact scope.

Do not remove tests to get green.

## Stage 5 — Static validation

Run:
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build

Run all relevant check:* scripts exactly as defined by package.json.

If a failure occurs, identify the first root cause and fix the source. Do not bypass it.

## Stage 6 — Canonical runtime

Start exactly one canonical API workflow on port 8080.

Avoid duplicate schema bootstraps. A previous Replit run hit a PostgreSQL deadlock from concurrent workflow/bootstrap behavior.

Verify:
- DB connection;
- schema;
- Redis;
- health;
- authentication;
- frontend;
- canonical Atlas route.

## Stage 7 — Real investigation

Run a genuine named target requiring public-web research.

Record:
- case ID;
- objective;
- Investigator;
- acts;
- searches;
- visits;
- tools;
- observations;
- evidence;
- identity;
- contacts;
- contradictions;
- Right-hand;
- Boss;
- terminal state.

No seeded URL. No seeded contact.

## Stage 8 — Ambiguity

Run a same-name or same-organization collision.

Verify no unsupported identity merge.

## Stage 9 — Context pressure

Run a controlled long trajectory.

Verify:
- working context bounded;
- prompt telemetry;
- durable history complete;
- no unbounded whole-trajectory prompt;
- 413 handling works if deliberately exercised.

## Stage 10 — Contact quality

Verify contact scope:
- direct person;
- executive office;
- organization;
- intermediary;
- route;
- lead.

Do not mislabel.

## Stage 11 — Terminal state

Verify durable case status and job status agree.

Preserve canonical-terminal-state behavior.

## Stage 12 — GitHub checkpoint

Commit coherent source changes to the authoritative branch.

Record exact SHA.

Only after this should Replit be used for a fresh environment validation.

## Stage 13 — Replit

Replit should:
- import/sync the authoritative branch;
- install;
- configure the existing secret contract;
- build;
- start the canonical service;
- execute controlled real investigations.

If Replit finds a source defect, fix GitHub rather than accumulating an unpushed local patch.

## Stage 14 — Research-quality phases

After the canonical loop works:
1. observation shaping;
2. long-horizon memory;
3. decision quality;
4. identity/contact refinement;
5. provider resilience;
6. empirical Gauntlet expansion;
7. release hardening.

## Completion rule

Do not say “Apex works” until a real public-web investigation has executed and produced durable observations/evidence plus truthful identity/contact state.

A green build is necessary. It is not sufficient.
