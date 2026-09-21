# Apex Atlas — Master ChatGPT / Agent Handoff
## Canonical continuation point: `main`
**Date:** 2026-09-21  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical future-work branch:** `main`  
**Repository default branch:** `main`

> This document is an operational handoff, not marketing copy. A future agent must read it, then independently verify the repository before changing anything.

---

# 1. NON-NEGOTIABLE STARTING INSTRUCTION

You are the next engineering/research agent continuing **Apex Atlas**.

**Do not begin by proposing a rewrite. Do not begin by creating a new app. Do not begin by switching branches. Do not assume old branch names are authoritative.**

Your first responsibility is to understand the existing system as it actually exists on **`main`**, including source, tests, scripts, CI, docs, database schema, frontend, deployment contract, and research-quality artifacts.

The user expects engineering-grade execution, not speculative commentary.

### Before answering the user, you must:

1. Confirm you are working from repository `2f22vtd4kr-cloud/BigContacts`.
2. Confirm the checked-out branch is `main`.
3. Confirm the current `main` SHA.
4. Confirm the worktree is clean or explicitly record pre-existing changes.
5. Read this entire handoff.
6. Read `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`.
7. Inventory the repository and systematically study **every relevant repository file**. Do not read only the files named in this handoff.
8. Read all current Apex architecture/release/deployment/research documents.
9. Trace the real runtime from entrypoint → routes → case lifecycle → Investigator loop → tools → evidence → persistence → events → UI.
10. Inspect the actual tests and scripts that enforce those contracts.
11. Only then diagnose the current state.
12. Run the relevant verification commands yourself where the environment permits.
13. If the user asks for a runtime investigation, the user—not Replit Agent—is the operator who conducts the live run. Give the user exact commands/steps and inspect the results they return. Do not pretend a run happened if you did not execute or receive evidence of it.
14. Do not claim completion without concrete verification.
15. Use the maximum practical working window for repository study and execution before giving a final status.

If an instruction in an old document conflicts with this handoff, treat the **actual current `main` source and the newest authoritative documentation** as the source of truth, and explicitly reconcile stale documentation rather than silently following it.

---

# 2. WHAT APEX ATLAS IS

Apex Atlas is an AI-powered public-web research bureau intended to identify people, decision-makers, owners, founders, operators and other relevant human targets and surface **real, attributable public contact paths**.

The central product promise is not “find plausible emails.”

It is:

> **Every contact should be a person you can justify from the public record — not a guess that looks like one.**

Apex is therefore a **research system**, not a deterministic enrichment script.

The architecture is deliberately model-led:

```
CASE / OBJECTIVE
        ↓
Gemini Boss + Gemini Right-hand
        ↓
select Investigator
        ↓
Groq OR Mistral Investigator
        ↓
Investigator chooses research trajectory
        ↓
validated real capability execution
        ↓
observation + provenance
        ↓
claims / identity hypotheses / contradictions / contacts / negatives
        ↓
durable evidence graph + event ledger
        ↺
Right-hand review + Boss disposition
        ↓
finding / abstention / promotion / stop
```

The model owns **research strategy**.

Deterministic software owns **safety, validation, authorization, persistence, provenance, identity/promotion integrity, cancellation and resource ceilings**.

---

# 3. AI ROLE LAW

## Gemini Boss

Gemini is the Boss.

Boss responsibilities include:

- case direction;
- high-level objective interpretation;
- Investigator selection;
- continuation/redirect/stop disposition;
- bounded oversight.

Boss must not secretly become the Investigator.

Boss must not browse or fabricate evidence.

Boss must not prescribe a hidden fixed sequence of provider/query/URL/tool actions.

A redirect is a research purpose/question, not a scripted route.

## Gemini Right-hand

Gemini Right-hand is a separate oversight invocation.

It reviews completed Investigator work, evidence gaps, contradictions, objective alignment and whether further work is justified.

It must not browse.

It must not choose the Investigator's tools.

It must not invent evidence.

If required oversight is unavailable, fail closed rather than pretending review occurred.

## Investigator

The active Investigator pool is exactly:

```
groq
mistral
```

The selected Investigator owns the actual research trajectory.

It decides:

- what question to pursue next;
- what query to formulate;
- what capability/tool to use;
- where to pivot;
- what to verify or disprove;
- when evidence is sufficient;
- when to abstain or stop.

Gemini is **not** an Investigator fallback.

DeepSeek/NVIDIA are not active Investigator paths.

---

# 4. FREE-REACT / NO-HIDDEN-PLAYBOOK RULE

This is one of the most important architectural laws.

Tools are **capabilities**, not mandatory stages.

Do not introduce a hidden sequence such as:

```
identity → company → LinkedIn → email → verify
```

Do not introduce:

- forced identity hops;
- preferred provider sequences disguised as policy;
- fixed query templates that secretly own strategy;
- `force_*` research paths;
- deterministic code that silently replaces the Investigator's trajectory.

Deterministic code may reject invalid, unsafe or unsupported actions.

It may enforce:

- authorization;
- schema;
- provenance;
- SSRF protection;
- cancellation;
- response-size limits;
- iteration limits;
- evidence promotion requirements;
- contact scope;
- persistence;
- resource budgets.

It must not secretly decide the research strategy.

---

# 5. EVIDENCE LAW

Apex must distinguish:

**lead ≠ observation ≠ attribution ≠ corroboration ≠ verification**

Search results are leads.

An LLM statement is not evidence.

A search snippet is not proof.

A copied directory page is not independent corroboration.

A guessed email pattern is not a discovered contact.

A URL existing does not prove the person named on it is the target.

Important identity/contact claims require actual persisted observations and provenance.

Evidence should preserve, where applicable:

- original URL;
- normalized URL;
- host;
- retrieval timestamp;
- source type/class/family;
- extraction method;
- supporting passage or observation;
- linked claim;
- identity-resolution confidence;
- contradiction links;
- evidence confidence;
- attribution/contact scope.

The system must retain uncertainty and competing identity hypotheses.

---

# 6. CONTACT STATES

The canonical conceptual contact lifecycle includes:

```
DISCOVERED
OBSERVED
ATTRIBUTED
CORROBORATED
VERIFIED
STALE
CONTRADICTED
REJECTED
```

Do not collapse these states into a single “contact found” boolean.

Organization-level contact information must remain organization-scoped unless the public evidence independently attributes it to a person.

Unknown/insufficient evidence is a legitimate terminal result.

---

# 7. SAFETY / RESOURCE CEILINGS

Known ceilings include:

- `MAX_ITER=64`
- `MAX_OBS=16_000`
- `MAX_TRAJECTORY_RECORDS=512`
- `MAX_NETWORK_RESPONSE_BYTES=2_000_000`

Do not casually increase these.

Do not turn a resource ceiling into a hidden strategy mechanism.

Cancellation must propagate through the actual operation.

Tool/provider failures remain failures.

Python-backed network OSINT remains fail-closed until there is enforceable sandbox/container/VM egress isolation.

---

# 8. DURABLE STATE IS THE SOURCE OF TRUTH

The UI is a projection.

The dossier/card is not the canonical truth.

Durable state should preserve:

- case/objective;
- Investigator selection;
- every selected action;
- actual executed capability/provider;
- execution status/failure;
- observations;
- source URLs;
- provenance;
- claims;
- identity hypotheses;
- contradictions;
- contacts/contact states;
- negative findings;
- open questions;
- oversight;
- trajectory;
- replay/correlation identifiers.

A final answer that cannot be traced to durable evidence is not an acceptable research result.

---

# 9. REACTOR / FRONTEND LAW

The Reactor UI must represent **real backend state/events**.

Never synthesize:

- fake searches;
- fake observations;
- fake sources;
- fake progress;
- fake confidence;
- fake research events;
- fake completion.

Desktop and mobile can have intentionally different compositions, but both must project the same canonical truth.

The UI must never become a second research engine.

---

# 10. CURRENT RESEARCH-QUALITY PROGRAM

The repository contains a Research Gauntlet.

The historically documented grounded registry is:

- schema: `research-gauntlet-v1`;
- version: `1.1.1`;
- 38 grounded-reviewed cases at the documented freeze;
- ground truth frozen as of 2026-09-18.

The later extension/50-case campaign work also exists in the repository and must be studied rather than assumed from old documents.

Known target extension cases included RG-039 through RG-050 and brought the intended total campaign to 50 cases / 150 matched trials.

Do not confuse:

- fixture existence;
- static scoring;
- CI green;
- architecture correctness;
- actual empirical research quality.

They are different things.

Metrics must remain separated, including:

- identity precision/recall;
- false-positive identity rate;
- claim-support correctness;
- unsupported-claim rate;
- contact precision/recall;
- contradiction recall;
- source-quality correctness;
- negative-finding calibration;
- useful pivots;
- unnecessary calls;
- successful observations;
- trajectory length;
- system failures.

Do not reduce Apex to a single “smartness” or winner score.

---

# 11. CAMPAIGN RULES

The intended mature campaign is:

- 50 cases;
- 3 matched trials per case;
- 150 actual research runs.

Envelope:

- maxIterations 64;
- maxObservations 16000;
- maxTrajectoryRecords 512;
- standard depth;
- Groq/Mistral Investigator pool;
- Gemini Boss/Right-hand oversight.

Each run must preserve raw outputs and isolated trial state.

Claim support must reference actual observation IDs.

Identity credit requires actual supporting observations.

A model cannot invent a source class and receive source-class credit.

Search-result URLs are not automatically evidence.

System failure must remain distinguishable from insufficient evidence and wrong answers.

Do not resurrect stale CI artifacts as current certification.

---

# 12. CURRENT VERIFIED BRANCH HISTORY — IMPORTANT CORRECTION

The previous working convention treated `audit/genuine-five-green-final` as the authoritative Apex branch.

That is now superseded for **future work**.

GitHub was directly compared:

```
base: audit/genuine-five-green-final
head: main
```

Current comparison:

- `main` is **72 commits ahead**;
- `main` is **0 commits behind**;
- merge base is `7cb15619113cad7c19750bdcf7747e7bf39970a8`.

Therefore the relevant newer Apex work was indeed carried forward into `main`.

The repository metadata also reports:

```
default_branch = main
```

### From this point forward:

**`main` is the canonical working branch.**

All future agents should:

- clone/check out `main`;
- make new development on `main` unless a temporary feature branch is explicitly requested;
- treat `main` as the integration line;
- never switch back to `audit/genuine-five-green-final` merely because an older handoff names it;
- use older audit branches as historical references only.

Do not rewrite `main` backwards to the five-green SHA.

The five-green milestone remains a historical architecture/regression milestone, not a current production certification.

---

# 13. IMPORTANT MAIN-BRANCH CONTENT

The newer `main` line contains significant Very Strong work, including changes/additions around:

- `agentic-web-research-core.ts`;
- `atlas-adaptive-portfolio.ts`;
- `atlas-capability-registry.ts`;
- `atlas-failure-observatory.ts`;
- `atlas-research-strategy.ts`;
- `case-bureau.ts`;
- `discovery-source-mixer.ts`;
- `research-intelligence-engine.ts`;
- Very Strong architecture tests;
- Gemini Boss bounded-control tests;
- adaptive strategy tests;
- `apex-atlas-very-strong.yml`;
- `scripts/initialize-apex-schema.sh`;
- refreshed Apex documentation and release review.

Do not infer implementation quality from filenames. Read the code.

---

# 14. CURRENT RUNTIME BLOCKER KNOWN FROM THE LAST USER-CONDUCTED REPLIT AUDIT

The last Replit audit was performed against the older Apex branch line and was deliberately honest.

Build/static gates passed.

Canonical boot failed because the existing Replit Postgres schema did not match the application schema.

The observed error was:

```
column "target_entity_id" referenced in foreign key constraint does not exist
```

The failing SQL attempted to add:

```sql
ALTER TABLE public.research_cases
ADD CONSTRAINT research_cases_target_entity_id_entities_id_fk
FOREIGN KEY (target_entity_id)
REFERENCES public.entities(id)
ON DELETE SET NULL
```

The live database lacked `research_cases.target_entity_id`.

The boot script explicitly skipped schema mutation unless:

```
APEX_ALLOW_SCHEMA_PUSH=true
```

was set.

The audit correctly did **not** blindly mutate the live database.

### Required next direction

Because `main` is now canonical, first verify the current `main` schema/migration contract against the actual Replit database.

Then:

1. inspect live schema metadata;
2. inspect repository schema definitions and migration/init scripts;
3. determine whether the DB is an older schema or a partially initialized schema;
4. make the smallest safe migration through the repository's canonical mechanism;
5. verify required tables/columns/foreign keys;
6. boot normally with schema mutation disabled;
7. verify `/api/healthz`;
8. verify authentication;
9. verify Redis/job locking;
10. conduct exactly one controlled real investigation;
11. inspect durable evidence;
12. inspect Reactor events;
13. report failures honestly.

Do **not** automatically run schema push merely because it makes boot green.

Do not delete/recreate the database unless explicitly authorized and genuinely necessary.

Do not invent a compatibility shim that hides a migration problem.

---

# 15. RUNTIME CONTRACT

Canonical API:

- port `8080`;
- desk `/`;
- API `/api/`;
- canonical startup: `bash scripts/replit-boot.sh`.

The repository includes an explicit first-time schema helper:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Normal runtime must not leave schema mutation enabled.

Known active provider/integration secret names from the current contract include:

```
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_API_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
GEMINI_RIGHT_HAND_API_KEY
```

Deployment/browser controls:

```
APEX_API_AUTH_TOKEN
APEX_OPERATOR_PASSWORD
APEX_SESSION_SECRET
```

Never print secret values.

Do not request GitHub credentials from the user when the GitHub integration already provides repository access.

Do not ask the operator to hand over `DATABASE_URL` as a secret when the platform manages the database.

---

# 16. USER-OPERATED REPLIT PRINCIPLE

A crucial correction for future agents:

**The Replit runtime runs are conducted by the user.**

Do not tell the user “Replit Agent completed the run” unless the user explicitly says that is what happened.

The next agent's role is to:

- give the user exact commands/prompts;
- wait for the user's real output;
- inspect that output;
- diagnose;
- give the next smallest required action;
- verify the resulting state.

If a user supplies screenshots/logs/results, treat them as evidence and distinguish:

- verified;
- reported;
- inferred;
- still unverified.

Never fabricate a successful live investigation.

---

# 17. FIRST REAL INVESTIGATION AFTER BOOT

Once the runtime is genuinely healthy, run **one** real investigation first.

Do not immediately launch the 150-run campaign.

The first live case should verify:

- authentication;
- Boss execution;
- Investigator selection;
- real Groq/Mistral execution;
- actual tool execution;
- real public-web observations;
- provenance persistence;
- evidence promotion;
- identity uncertainty;
- contact attribution;
- Right-hand oversight;
- Boss continuation/stop;
- durable event ledger;
- job status;
- Reactor live state.

The objective should be a real named target supplied by the user.

No invented contact information.

No benchmark target seeding unless deliberately running the benchmark.

---

# 18. HOW TO DEBUG

When something fails:

1. Identify the exact layer.
2. Reproduce with the smallest command.
3. Inspect actual source/config/schema.
4. Determine whether it is:
   - environment;
   - database/schema;
   - auth;
   - Redis;
   - provider credential;
   - provider behavior;
   - tool capability;
   - evidence/promotion;
   - frontend projection;
   - test/build;
   - documentation drift.
5. Fix only what is necessary.
6. Re-run the narrow verification.
7. Re-run the broader gate.
8. Preserve the evidence of the fix.

Do not make speculative architecture changes to solve an environment problem.

Do not change research strategy to compensate for a database error.

Do not add fake fallbacks.

---

# 19. WHAT “DONE” MEANS

Do not tell the user “done” merely because:

- files compile;
- CI is green;
- a page renders;
- a database table exists;
- a job says completed;
- an LLM produced a plausible report.

For Apex, completion means the requested layer is actually verified.

For a real investigation, “done” requires source-backed durable observations and truthful state.

For release readiness, it requires fresh runtime and empirical evidence, not just architecture tests.

---

# 20. DOCUMENTATION DISCIPLINE

If you discover that a current document says an old branch is canonical, update it.

Canonical documents must not continue to tell future agents to work on historical branches.

At minimum, keep consistent:

- `README.md`;
- `docs/context.md`;
- `docs/RUN_BUREAU.md`;
- `docs/REPLIT_NEW_ACCOUNT_SETUP.md`;
- release review;
- architecture docs;
- handoff docs.

When documenting a historical state, label it historical.

Do not silently rewrite history.

---

# 21. DO NOT LOSE THE PRODUCT PHILOSOPHY

Apex is being built around several principles:

### Truth over appearance
A failed search is better than a fabricated contact.

### Evidence over assertion
A source-backed observation is better than a convincing LLM sentence.

### Autonomy over scripts
The Investigator should reason about research trajectory rather than execute a hidden workflow.

### Deterministic integrity around model autonomy
The model gets strategic freedom; code protects the evidence boundary.

### Uncertainty is a valid answer
Apex must be able to say “not enough evidence.”

### Public evidence only
No private-data fantasy, credential scraping, or invented relationships.

### Independent corroboration matters
Five copied pages are not five independent sources.

### The UI reflects reality
The Reactor is a window into the research system, not theatre.

### Empirical quality beats architecture theatre
A beautiful architecture and green tests do not prove field reliability.

### Failure must remain visible
Provider failures, tool failures, cancellation, stale sources and identity conflicts must not disappear into successful-looking output.

---

# 22. EXPECTED AGENT BEHAVIOR

The ideal future agent behaves like a senior staff engineer + research-systems auditor:

- reads before changing;
- traces before guessing;
- verifies before claiming;
- preserves existing architecture;
- challenges stale assumptions;
- distinguishes source truth from model prose;
- uses small controlled fixes;
- records exact SHAs/commands/results;
- keeps the user in control of live runtime actions;
- spends the available working window doing the actual work.

Do not optimize for producing a fast answer.

Optimize for producing a **true answer**.

---

# 23. IMMEDIATE NEXT MILESTONE

The immediate milestone is:

> **Make `main` the verified, runnable Apex Atlas integration line on the user's Replit environment, then conduct exactly one real investigation and inspect the entire evidence/event/UI path.**

After that, proceed to controlled empirical campaign execution.

Do not skip the single live investigation.

Do not call the system production-ready until the empirical gates support that statement.

---

# 24. HANDOFF TERMINAL CHECKLIST

Before handing Apex to another agent, report:

- current main SHA;
- working-tree state;
- tests/checks run;
- database schema state;
- boot state;
- health endpoint state;
- auth state;
- Redis state;
- provider state;
- live investigation ID(s);
- observation count;
- source/provenance state;
- evidence promotion state;
- contact attribution state;
- Reactor event state;
- known blockers;
- exact next action.

A handoff is successful when another agent can continue without reconstructing the entire history from chat.

---

**End of master handoff.**
