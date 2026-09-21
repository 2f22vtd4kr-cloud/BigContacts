# Apex Atlas — Replit Import / Build / Run / Keys Blueprint
## Canonical initialization contract for every new Replit account and every future ChatGPT agent
**Updated:** 2026-09-21 — new-account race/provider hardening
**Canonical repository:** `2f22vtd4kr-cloud/BigContacts`
**Canonical branch:** `main`

> This document is designed to eliminate repeated improvised Replit prompts. A new agent should read this file and use it as the initialization contract rather than inventing a new setup prompt.

---

# 0. THE ONE PROMPT

Paste the following into a fresh Replit Agent **after importing the GitHub repository**.

```text
APEX ATLAS — CANONICAL IMPORT, BUILD, RUNTIME AND VALIDATION INITIALIZATION

You are initializing the existing Apex Atlas repository. This is NOT a greenfield app. Do not replace it, simplify it, fork it, or create a mock version.

REPOSITORY
- GitHub: https://github.com/2f22vtd4kr-cloud/BigContacts
- Canonical branch: main
- Default branch: main
- Product: Apex Atlas / Apex Finder
- Working directory must remain the imported repository.

FIRST: VERIFY, DO NOT ASSUME
1. Show:
   - git remote -v
   - git branch --show-current
   - git rev-parse HEAD
   - git status --short
2. Fetch repository refs if necessary.
3. If the checkout is not main, switch to main without destroying local work.
4. Do NOT reset, rebase, force-push, delete branches, or overwrite uncommitted work.
5. Do not switch to audit/genuine-five-green-final. It is historical.
6. Do not create a replacement app.

MANDATORY REPOSITORY STUDY
Before changing code, read:
- docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md
- docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md
- README.md
- docs/context.md
- docs/BUREAU_REACT_ARCHITECTURE.md
- docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md
- docs/APEX_ATLAS_CEO_RELEASE_REVIEW_2026-09-20.md
- docs/APEX_RESEARCH_GAUNTLET_V1.md
- docs/REPLIT_NEW_ACCOUNT_SETUP.md
- docs/RUN_BUREAU.md

Then inventory the repository and inspect the actual source, tests, schemas/migrations, scripts, CI, frontend and deployment configuration. Do not claim completion from reading only the named docs.

PACKAGE / BUILD
- Use the repository's existing package manager and lockfile.
- Do not replace package management.
- Run frozen dependency installation where supported.
- Run the repository's canonical static/type/build/test gates.
- Use the actual scripts present on main; do not invent old commands.
- Do not modify product logic merely to make a build green.

DATABASE
Apex uses the platform-provided durable Postgres database.
Before changing an existing database:
1. inspect repository schema definitions;
2. inspect migration/init scripts;
3. inspect the live database schema;
4. identify exact mismatches;
5. preserve existing data;
6. use the repository's canonical schema mechanism;
7. verify resulting columns, indexes and foreign keys.

FIRST-TIME EMPTY DATABASE:
If this is genuinely a new empty database, the repository's explicit initialization mechanism may be used:
  APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh

IMPORTANT:
- Do not leave APEX_ALLOW_SCHEMA_PUSH=true enabled for ordinary runtime.
- Do not blindly run schema push on an existing database.
- Do not drop/recreate the database.
- Do not hide schema errors with compatibility hacks.

ENVIRONMENT / KEYS

The startup credential gate is NOT conditional.

The canonical fresh-account setup contract is the complete 16-name list below. Ask the operator for these exact names in this order and verify presence only; never display or echo values.

1. REDIS_URL_1
2. GROQ_API_KEY
3. GEMINI_API_KEY
4. MISTRAL_API_KEY
5. HF_TOKEN
6. SERPER_API_KEY
7. TAVILY_API_KEY
8. SERPAPI_KEY
9. EXA_API_KEY
10. SCRAPFLY_API_KEY
11. ZENROWS_API_KEY
12. COMPANIES_HOUSE_API_KEY
13. GEMINI_RIGHT_HAND_API_KEY
14. APEX_API_AUTH_TOKEN
15. APEX_OPERATOR_PASSWORD
16. APEX_SESSION_SECRET

`DATABASE_URL` is supplied by the Replit/Postgres environment and must not be requested from the operator.

This is an explicit configuration checklist, not a provider-discovery exercise. Do not omit a name because a first smoke test does not use that capability. Do not request historical/retired provider credentials.

IMPORTANT: older `docs/bureau-plan/*` files contain historical secret/provider contracts. They are not authoritative for fresh-account setup. This section and `docs/REPLIT_NEW_ACCOUNT_SETUP.md` are the current key contract.

Rules:
- Never ask the operator to paste secret values into chat.
- Tell the operator to enter each value directly into Replit Secrets.
- Never print, echo, log, commit, or place secret values in source files.
- Verify only that each required variable is present/non-empty.
- Do not manufacture placeholder production keys.
- Do not silently substitute another provider.
- Do not omit a listed key because the first smoke test happens not to use that provider.
- Retired credentials that must NOT be requested or restored:
  - DEEPSEEK_API_KEY
  - NVIDIA_API_KEY
  - WHOISJSON_API_KEY
  - WHOXY_API_KEY

Role law:
- Gemini is Boss / Right-hand oversight.
- Groq/Mistral are Investigator providers.

AUTH
Verify the current repository's authentication contract before changing anything.
Do not weaken authentication to make a Replit preview work.
Do not expose protected APIs publicly merely to simplify testing.
Do not print credentials.

CANONICAL INITIALIZATION TEST GATE

Use these current canonical gates before spending the live research budget:
- pnpm install --frozen-lockfile
- pnpm run typecheck
- pnpm run build
- pnpm run test:phone-priority
- current architecture/integrity guards

An older duplicate smoke suite that calls protected endpoints without bearer authentication is stale if it conflicts with the current authenticated contract. Do NOT weaken authentication to make it pass.

Do not spend the live Replit research budget repairing unrelated historical unit expectations before the first genuine discovery result. Record such failures as test debt and proceed when the canonical gates and security/runtime checks pass.


RUNTIME
Canonical API port: 8080.
Canonical startup:
  bash scripts/replit-boot.sh

After schema compatibility is verified:
1. run exactly ONE long-running Apex Atlas API workflow;
2. never start Project and Apex Atlas API concurrently, and never start two API workflows;
3. verify the process is listening on 8080;
3. verify /api/healthz;
4. verify the desk at /;
5. verify authentication;
6. verify Redis/job locking;
7. verify provider connectivity without leaking credentials.

Do not call a healthy build a healthy runtime.

APEX RESEARCH ARCHITECTURE — DO NOT VIOLATE
The system is:
Case objective
→ Gemini Boss + Gemini Right-hand
→ Groq or Mistral Investigator
→ Investigator-owned free ReAct research trajectory
→ validated real capability execution
→ observations + provenance
→ evidence graph
→ oversight
→ continuation / redirect / stop
→ finding or honest abstention.

Do NOT add:
- fixed search sequences;
- forced identity/company/contact hops;
- force_* research functions;
- hidden provider/query/URL preferences;
- fake fallbacks;
- synthetic observations;
- synthetic Reactor activity;
- guessed contact information.

Deterministic code may enforce safety, authorization, schema, provenance, cancellation, resource limits and promotion integrity. It must not secretly own research strategy.

LIVE INVESTIGATION / DISCOVERY-FIRST SMOKE TEST
Do not launch the 150-run campaign during initialization.

Once the application is genuinely healthy, the initialization smoke test MUST exercise Apex's existing canonical **discovery-first** path.

Apex is an autonomous OSINT bureau. A cold/discovery-first run does NOT require the operator to name a person or provide a target. The operator may provide a high-level research objective in normal product use, but target discovery is an internal Investigator-owned phase that happens before target-scoped research.

For the first runtime smoke test, Replit MUST NOT stop and ask:
- "What person should I research?"
- "What target should I research?"
- "What investigation should I run first?"

Instead use the canonical discovery objective already supported by the current code:

"Discover real named people for subsequent target-scoped public-contact research. Choose every search, page visit, registry/domain/OSINT action and stopping point yourself. Emit a person only when the observed public source supports the identity. Promote only an exact named-person admission candidate. Never invent a person, contact, or URL."

Create/run a genuine discovery case through the repository's canonical discovery route. Do not bypass discovery by supplying a hardcoded person/entity ID.

The expected sequence is:

high-level discovery objective
→ Gemini Right-hand advisory
→ Gemini Boss oversight/Investigator selection
→ Groq or Mistral Investigator
→ Investigator-owned autonomous discovery
→ real web observations
→ validated named-person candidate(s), or honest no-admission outcome
→ durable discovery evidence/provenance
→ only then, if the canonical pipeline calls for it, target-scoped research of an admitted person.

A UI prompt asking the operator to name a specific investigation/target is NOT a substitute for this smoke test. If the UI displays such a prompt during initialization, use the canonical backend discovery route instead of asking the operator for a target.

Verify:
- actual Gemini Boss invocation;
- actual Groq/Mistral Investigator;
- real web/tool execution;
- durable observations;
- provenance;
- identity uncertainty;
- contact attribution;
- Right-hand oversight;
- terminal disposition;
- Reactor events.

A search result is not automatically evidence.
A model assertion is not evidence.
A guessed email is not a contact.
Unknown is a valid outcome.

PROVIDER CONCURRENCY

Gemini Right-hand and Gemini Boss are distinct oversight roles but share the external-provider budget. The current provider gate gives Gemini a bounded concurrency lane of two by default so oversight calls do not unnecessarily serialize behind one Gemini slot.

This is a capacity safeguard, not a research strategy. Do not remove it by starting duplicate workflows or by creating unbounded retries.

DISCOVERY INTEGRITY GATES

The current canonical runtime includes two deterministic discovery integrity gates:

1. A cold discovery run cannot terminate immediately after an unusable/failed external action. The Investigator must choose another action itself.
2. A named-person discovery admission requires a successfully retrieved source page (visit or browser_fetch). Search-result snippets alone are leads and cannot establish admission.

Do not bypass these gates and do not replace them with a deterministic provider/search ladder.

If the first search returns no usable result, preserve that observation and allow the Investigator to decide the next research action.

REACTOR / FRONTEND
The UI must project real backend state.
Never create fake progress, fake searches, fake observations, fake sources or fake confidence just to make the UI look alive.

USER-OPERATED REPLIT RULE
The human operator owns the Replit environment and credentials. The Replit Agent may execute the documented initialization/build/runtime smoke-test commands inside that environment.

Do not confuse "operator-owned Replit" with "operator must manually invent a research target."

For initialization, the Agent MUST be able to exercise the canonical discovery-first smoke test using the repository's built-in discovery objective. It must not block on a request for a named target.

For later user-driven investigations, the product may accept a high-level objective from the operator. When that objective is discovery-first/cold, Apex itself must discover the people to investigate.

Never claim a live run occurred unless actual runtime output proves it.

WHAT TO REPORT
At the end of initialization, report exactly:
1. branch + HEAD;
2. worktree status;
3. install result;
4. static/type/build/test results;
5. database schema status;
6. boot status;
7. health endpoint status;
8. auth status;
9. Redis/job-lock status;
10. provider key presence (names only, never values);
11. exact blockers;
12. exact next operator action.

STOP CONDITIONS
Stop and report instead of improvising if:
- main cannot be checked out safely;
- database schema is incompatible and migration safety is unclear;
- required credentials are missing;
- authentication cannot be verified safely;
- the application cannot bind to 8080;
- a provider call fails;
- source/evidence integrity is uncertain.

Do not turn a blocker into a fake success.

FINAL RULE
Apex Atlas is an evidence-first research bureau. Prefer an honest blocker over a green-looking lie.
Do not say “complete” unless the requested layer has actually been verified.
```

---

# 1. OPERATOR KEY CHECKLIST

For a fresh Replit account, configure the complete canonical 16-name startup contract in Replit Secrets, in this exact order:

```
1. REDIS_URL_1
2. GROQ_API_KEY
3. GEMINI_API_KEY
4. MISTRAL_API_KEY
5. HF_TOKEN
6. SERPER_API_KEY
7. TAVILY_API_KEY
8. SERPAPI_KEY
9. EXA_API_KEY
10. SCRAPFLY_API_KEY
11. ZENROWS_API_KEY
12. COMPANIES_HOUSE_API_KEY
13. GEMINI_RIGHT_HAND_API_KEY
14. APEX_API_AUTH_TOKEN
15. APEX_OPERATOR_PASSWORD
16. APEX_SESSION_SECRET
```

The startup contract is intentionally explicit: do not turn key setup into conditional provider discovery. Presence checks are enough; never print values.

`DATABASE_URL` is supplied by Replit/Postgres and is not part of the operator-entered list.

Historical provider keys such as DeepSeek/NVIDIA/WhoisJSON/Whoxy are retired and must not be requested.

---

# 2. SAFE INITIALIZATION ORDER

Always use this order:

```
IMPORT GITHUB
    ↓
CHECKOUT main
    ↓
READ HANDOFF + STUDY PROTOCOL
    ↓
INVENTORY REPOSITORY
    ↓
INSTALL
    ↓
STATIC / TYPE / TEST GATES
    ↓
INSPECT CURRENT DB + REPOSITORY SCHEMA
    ↓
CONFIGURE REQUIRED SECRETS
    ↓
SAFE SCHEMA INITIALIZATION / MIGRATION
    ↓
NORMAL BOOT
    ↓
HEALTH
    ↓
AUTH
    ↓
REDIS / JOB LOCK
    ↓
PROVIDER CONNECTIVITY
    ↓
ONE REAL INVESTIGATION
    ↓
EVIDENCE + OVERSIGHT + REACTOR VERIFICATION
```

Do **not** reverse this into:

```
start app → discover errors → randomly install things → alter DB → patch source → declare success
```

---

# 3. EMPTY DATABASE VS EXISTING DATABASE

This distinction is critical.

### Fresh empty Replit database

Use the repository's explicit initialization mechanism after verifying it:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Then disable schema mutation and run normal boot.

Schema initialization is single-writer. The schema helper now serializes concurrent schema operations; do not intentionally start concurrent schema commands anyway.

### Existing Replit database

Never assume it is empty.

First inspect:

- tables;
- columns;
- types;
- nullability;
- foreign keys;
- indexes;
- migration history if available.

Then compare against current `main`.

The previously observed failure was:

```
research_cases.target_entity_id
```

missing while a foreign-key operation expected it.

That historical failure is a warning, not permission to blindly execute the same migration again.

---

# 4. NEW REPLIT ACCOUNT CHECKLIST

Before spending live-research credits, verify all of the following:

- GitHub repository imported from `2f22vtd4kr-cloud/BigContacts`;
- branch is `main`;
- HEAD SHA is recorded;
- worktree is clean or pre-existing changes are explicitly recorded;
- canonical handoff/study/blueprint docs have been read;
- no replacement app was generated;
- lockfile/package manager recognized;
- all 16 startup secret names are present;
- database attached and `DATABASE_URL` available;
- Redis available;
- port 8080 available;
- canonical boot script exists;
- health route exists;
- authentication configuration exists;
- exactly one API workflow will be used.

If any of these fail, diagnose the specific failure before consuming the live investigation budget.

Do not burn a new Replit account just because an agent produced a bad prompt, started duplicate workflows, raced schema initialization, or attempted a speculative rewrite.

Before consuming a new account, verify:

- GitHub repository imported from `2f22vtd4kr-cloud/BigContacts`;
- branch is `main`;
- no replacement app was generated;
- lockfile/package manager recognized;
- secrets configured;
- database attached;
- Redis available;
- port 8080 available;
- canonical boot script exists;
- health route exists;
- authentication configuration exists.

If any of these fail, diagnose the specific failure before abandoning the account.

**Do not burn a new Replit account just because an agent produced a bad prompt, started duplicate workflows, raced schema initialization, or attempted a speculative rewrite.**

---

# 5. WHAT A NEW CHATGPT AGENT SHOULD DO

A new ChatGPT agent should not invent another 500-line Replit prompt.

It should:

1. read this blueprint;
2. read the master handoff;
3. read the repository study protocol;
4. verify the current `main` repository;
5. give the operator the canonical initialization prompt above;
6. inspect the actual Replit output;
7. proceed one verified layer at a time.

If a future agent wants to change this initialization contract, it should first verify that the repository's current scripts/configuration have changed.

---

# 6. KEY-REQUEST TEMPLATE FOR THE HUMAN

When a key is genuinely missing, the agent should say:

> **Missing secret:** `GROQ_API_KEY`  
> **Needed for:** Groq Investigator execution.  
> **Where to add it:** Replit → Secrets / Environment Variables.  
> **Do not paste the value into chat.**  
> After adding it, tell me only “added” and I will continue.

Never:

> “Paste your API key here.”

---

# 7. DISCOVERY-FIRST IS THE DEFAULT FOR COLD RESEARCH

The distinction between these two modes is mandatory:

### Single-target mode
The operator already has a specific entity/person. Apex researches that target.

### Discovery-first mode
The operator has a research objective but does NOT have a target. Apex discovers suitable named people first, using the Investigator's autonomous web research.

Discovery is not a manual pre-step where the operator supplies names.

Discovery is an actual Apex research phase.

The discovery layer already exists in the canonical implementation under:
- `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`
- `artifacts/api-server/src/src/lib/discovery-agent.ts`
- `artifacts/api-server/src/src/lib/discovery-intake.ts`
- `artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts`

Relevant repository design documents include:
- `docs/bureau-plan/216_DISCOVERY_NORTH_STAR.md`
- `docs/bureau-plan/221_DISCOVERY_HANDOFF_TO_DIG.md`
- `docs/bureau-plan/254_SINGLE_TARGET_VS_DISCOVERY.md`

Do not replace this with a manual target-selection prompt.

# 8. RUNTIME SUCCESS CRITERIA

Initialization is successful only when the requested layer is verified.

Minimum runtime success:

```
main
✓ dependencies
✓ static/type/build
✓ compatible database
✓ normal boot
✓ :8080
✓ /api/healthz
✓ authentication
✓ Redis/job locking
✓ required provider credentials present
```

That is **runtime readiness**, not yet research-quality certification.

Research readiness additionally requires:

```
✓ real Investigator execution
✓ real web observations
✓ provenance
✓ evidence graph
✓ identity resolution
✓ contact attribution
✓ Right-hand oversight
✓ truthful stop/abstention
✓ Reactor projection
```

Empirical readiness additionally requires the controlled Research Gauntlet.

---

# 9. DO NOT BURN ANOTHER ACCOUNT

If initialization fails, preserve the exact evidence.

Capture:

- current SHA;
- command;
- complete relevant error;
- service/log output;
- schema error;
- provider error;
- authentication error;
- port/process state.

Then fix the layer.

A fresh Replit account should be used only when there is a demonstrated platform/account-level reason—not because setup was improvised.

---

# 10. RELATIONSHIP TO OTHER CANONICAL DOCUMENTS

This blueprint answers:

> **How do I import, initialize, configure keys, build and boot Apex Atlas on a fresh Replit environment?**

The master handoff answers:

> **What is Apex Atlas, why is it built this way, what has happened, and what must the next agent understand?**

The repository study protocol answers:

> **How must a new agent study the actual codebase before touching it?**

The bureau run procedure answers:

> **How do I operate the already-initialized system?**

All four should be read together.

---

# 11. FINAL INITIALIZATION PRINCIPLE

The objective is not:

> “Get a Replit preview to show something.”

The objective is:

> **Reproduce the real Apex Atlas system faithfully, on main, with its real database, real providers, real evidence pipeline, real oversight, real events, and real uncertainty — without burning accounts through avoidable setup mistakes.**

When uncertain, stop and inspect.

When blocked, report the blocker.

When evidence is insufficient, abstain.

When a run did not happen, say it did not happen.

Never manufacture success.


# 12. POST-RUN HARDENING NOW IN MAIN

The following two runtime protections are now committed to `main`:

- `scripts/initialize-apex-schema.sh` uses a single-writer lock so concurrent schema initialization cannot race PostgreSQL DDL.
- `scripts/replit-boot.sh` refuses to kill another process that owns port 8080. A duplicate workflow must be stopped explicitly instead of one workflow killing another.

These are safety rails, not a replacement for the one-workflow rule.

The previous captured run also established that Gemini Boss may need bounded same-role model fallback when a configured Gemini model is capacity-limited. A new agent must preserve that same-role fallback and its bounded control-plane deadline if those changes are already present on the checked-out `main`.

# 13. FINAL NEW-ACCOUNT PROMPT RULE

The operator should use the exact prompt in section 0. Do not improvise a shorter prompt that makes credentials conditional, starts multiple workflows, asks the operator to supply a target for discovery, or launches research before runtime/schema/provider gates are proven.
