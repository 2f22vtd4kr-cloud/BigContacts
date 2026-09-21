# Apex Atlas — Replit Import / Build / Run / Keys Blueprint
## Canonical initialization contract for every new Replit account and every future ChatGPT agent
**Updated:** 2026-09-21
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
Ask the operator to configure secrets through Replit Secrets / environment variables. NEVER print secret values, echo them, commit them, or place them in source files.

Required core AI/runtime secrets to check for presence (not value):
- GEMINI_API_KEY
- GROQ_API_KEY
- MISTRAL_API_KEY
- REDIS_URL_1
- APEX_API_AUTH_TOKEN
- APEX_OPERATOR_PASSWORD
- APEX_SESSION_SECRET

Depending on enabled tools/integrations, check for presence of:
- SERPER_API_KEY
- TAVILY_API_KEY
- SERPAPI_API_KEY
- EXA_API_KEY
- SCRAPFLY_API_KEY
- ZENROWS_API_KEY
- COMPANIES_HOUSE_API_KEY
- HF_TOKEN
- GEMINI_RIGHT_HAND_API_KEY

Rules:
- Never ask the operator to paste secret values into chat.
- Ask only for secrets that are actually required by the current code/configuration.
- Do not manufacture placeholder production keys.
- If a provider key is absent, report the exact feature/provider that cannot run.
- Do not silently substitute another provider.
- Gemini is Boss/Right-hand oversight.
- Groq/Mistral are the active Investigator providers.

AUTH
Verify the current repository's authentication contract before changing anything.
Do not weaken authentication to make a Replit preview work.
Do not expose protected APIs publicly merely to simplify testing.
Do not print credentials.

RUNTIME
Canonical API port: 8080.
Canonical startup:
  bash scripts/replit-boot.sh

After schema compatibility is verified:
1. start the application;
2. verify the process is listening on 8080;
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

LIVE INVESTIGATION
Do not launch the 150-run campaign during initialization.

Once the application is genuinely healthy, the operator will conduct exactly ONE real investigation first.

The objective will be supplied by the operator.

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

REACTOR / FRONTEND
The UI must project real backend state.
Never create fake progress, fake searches, fake observations, fake sources or fake confidence just to make the UI look alive.

USER-OPERATED REPLIT RULE
The human operator, not an autonomous Replit Agent, conducts the live runtime investigation.
When a live run is needed:
- tell the operator exactly what to execute;
- wait for the returned output;
- do not claim that a run occurred unless actual output proves it.

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

Create/configure these in Replit Secrets, using the exact names used by the current repository:

## Core

```
GEMINI_API_KEY
GROQ_API_KEY
MISTRAL_API_KEY
REDIS_URL_1
APEX_API_AUTH_TOKEN
APEX_OPERATOR_PASSWORD
APEX_SESSION_SECRET
```

## Optional / capability-dependent

```
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_API_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
HF_TOKEN
GEMINI_RIGHT_HAND_API_KEY
```

**Do not populate every optional key merely because it is listed.** The code/configuration should determine which capability is actually enabled.

A future agent should inspect the current repository before telling you that a particular optional key is mandatory.

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

**Do not burn a new Replit account just because an agent produced a bad prompt or attempted a speculative rewrite.**

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

# 7. RUNTIME SUCCESS CRITERIA

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

# 8. DO NOT BURN ANOTHER ACCOUNT

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

# 9. RELATIONSHIP TO OTHER CANONICAL DOCUMENTS

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

# 10. FINAL INITIALIZATION PRINCIPLE

The objective is not:

> “Get a Replit preview to show something.”

The objective is:

> **Reproduce the real Apex Atlas system faithfully, on main, with its real database, real providers, real evidence pipeline, real oversight, real events, and real uncertainty — without burning accounts through avoidable setup mistakes.**

When uncertain, stop and inspect.

When blocked, report the blocker.

When evidence is insufficient, abstain.

When a run did not happen, say it did not happen.

Never manufacture success.
