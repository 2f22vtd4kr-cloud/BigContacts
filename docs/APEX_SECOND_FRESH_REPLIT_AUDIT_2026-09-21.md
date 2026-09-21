# Apex Atlas — Second Architecture / Fresh-Replit Readiness Audit
**Date:** 2026-09-21  
**Audited branch:** `main`  
**Audited HEAD:** `64d3beea6f452085997e729a96bffe4f1cdb25dd`

## Scope

This is a second audit after the previous Replit account exhausted its quota during initialization/runtime work. The purpose is to remove avoidable setup ambiguity before moving to a fresh Replit account.

This audit is based on the actual current `main` repository, current source/docs, recent commits, schema definitions, boot scripts, runtime workflow configuration, and the previous Replit findings.

It does **not** claim a fresh runtime is already verified. A Replit runtime must still be executed by the operator.

## Findings

### 1. Canonical branch
Verified from repository history:
- `main` is the default/canonical branch.
- Current HEAD is `64d3beea6f452085997e729a96bffe4f1cdb25dd`.
- The recent runtime hardening is on `main`.
- `audit/genuine-five-green-final` remains historical.

### 2. Database/schema blocker from the previous account
The previous blocker was real: the live database lacked `research_cases.target_entity_id`, while startup hardening attempted to create a foreign key using that column.

Current `main` source confirms:
- `lib/db/src/schema/research_cases.ts` declares nullable `target_entity_id` with `ON DELETE SET NULL`.
- `scripts/initialize-apex-schema.sh` performs the repository schema push explicitly and verifies durable tables.
- `scripts/replit-boot.sh` does not mutate schema unless `APEX_ALLOW_SCHEMA_PUSH=true`.
- `lib/db/src/index.ts` now performs startup hardening inside an explicit transaction-scoped advisory lock.

Therefore a fresh Replit database must be initialized once with the canonical schema helper before normal boot. The new setup prompt explicitly enforces this distinction.

### 3. Startup race hardening
The previous concurrent startup/schema-hardening race was addressed by holding the advisory lock inside the same PostgreSQL transaction as the ALTER/validation work.

This is present on `main` in the current `lib/db/src/index.ts`.

### 4. Discovery premature-termination hardening
Current `agentic-web-research-core.ts` contains a discovery terminal integrity gate.

A cold discovery run cannot terminate after only an unusable/failed external search. The Investigator must choose another autonomous action.

Regression coverage exists in `discovery-runtime-correctness.test.ts`.

### 5. Discovery evidence admission
Current discovery admission requires a successful direct source retrieval via `visit` or `browser_fetch`.

Search-result snippets/URLs are leads and cannot by themselves establish named-person admission.

Regression coverage exists.

### 6. Truthful terminal state
Current discovery-only terminal handling derives durable job/outcome/case state from canonical terminal state logic.

The intended contract is:
- complete only when durable case state is actually complete;
- otherwise incomplete/failure/review remains visible;
- cancellation remains distinguishable.

### 7. Gemini oversight concurrency
The provider gate now gives Gemini a bounded concurrency lane of two by default.

This specifically addresses the previous Right-hand cancellation risk caused by Boss and Right-hand serializing behind one Gemini slot.

Regression coverage exists for peak Gemini concurrency of two.

### 8. Right-hand role/credential separation
Current Right-hand code explicitly uses `GEMINI_RIGHT_HAND_API_KEY` and does not fall back to the Boss credential.

Right-hand is case-file reasoning only and must not browse or invent evidence.

### 9. Fresh-account documentation inconsistency found during this audit
The previous setup documentation contained a real contradiction:
- one section described a complete 16-name startup list;
- another section called some of those names optional;
- one section used `SERPAPI_KEY`;
- another used `SERPAPI_API_KEY`;
- older bureau-plan documents contain retired provider credentials.

This was corrected on `main`.

The current canonical fresh-account contract is exactly 16 names, in one explicit order, and older `docs/bureau-plan/*` secret lists are explicitly historical rather than authoritative.

### 10. Credit-consumption risk found during this audit
The previous setup instructions could be interpreted as testing provider connectivity individually before the first real run.

That is now explicitly prohibited.

Fresh setup must:
1. verify secret presence only;
2. complete repository/static/schema/runtime gates;
3. boot exactly one API workflow;
4. run exactly one meaningful live discovery investigation;
5. use that real run to exercise provider connectivity.

No provider-spam smoke test. No repeated retries merely to make a green-looking log.

### 11. Live provider failure semantics
A provider failure during an actual Investigator run is a research observation/failure, not automatically a setup blocker.

The canonical discovery integrity gate permits the Investigator to pivot after unusable external work.

The Replit setup contract now explicitly says not to stop the autonomous investigation merely because the first provider fails. Preserve the failure and let the Investigator choose the next action within the existing resource/integrity boundaries.

## Remaining verification — deliberately not claimed

The following require the fresh Replit runtime and cannot be honestly certified from GitHub inspection alone:

- clean dependency install;
- typecheck/build on the fresh account;
- actual Postgres initialization;
- actual Redis connectivity;
- actual port 8080 boot;
- authenticated API access;
- real Gemini Boss invocation;
- real Gemini Right-hand invocation;
- real Groq/Mistral Investigator invocation;
- real web observation;
- durable evidence persistence;
- durable Reactor terminal trace;
- end-to-end truthful case/job state after a live investigation.

These are the next empirical gates, not reasons to spend repeated setup credits.

## Fresh-account acceptance sequence

The next Replit agent must execute in this order:

1. Import repository and remain on `main`.
2. Record HEAD/worktree.
3. Read the handoff, study protocol, architecture audit, and initialization blueprint.
4. Perform the repository/runtime audit and write its own audit report before live research.
5. Install dependencies.
6. Run typecheck/build and the canonical architecture/integrity checks.
7. Configure all 16 secret names; verify presence only.
8. Inspect the database.
9. If genuinely empty, run the explicit schema initialization helper exactly once.
10. Verify the required durable schema.
11. Disable schema mutation for normal boot.
12. Start exactly one API workflow on port 8080.
13. Verify health/auth/Redis/job-lock state.
14. Run exactly one autonomous cold discovery.
15. Inspect the entire durable trajectory/evidence/oversight/job/case/Reactor path.
16. Stop and write a complete audit. Do not launch a large campaign yet.

## Final assessment

The avoidable setup/runtime hazards found in the previous cycle have been addressed in source or in the canonical initialization contract.

The remaining uncertainty is intentionally empirical: whether the fresh Replit environment, credentials, providers and live database behave correctly together.

No claim of end-to-end runtime success is made until that fresh run produces evidence for it.
