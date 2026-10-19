# Apex Atlas — Mandatory Repository Study Protocol
## For every future ChatGPT / coding / research agent

This file exists to prevent shallow handoffs.

Apex Atlas is too consequential to continue by reading only a few “important” files and guessing the rest.

## Rule 1 — Study the repository before changing it

A future agent must treat the repository itself as the primary engineering artifact.

Before relying on any handoff or status paragraph, inspect recent commits on `main`, list dated live-run audits, and choose the newest actual run by timestamp/run sequence. A dated audit records one attempt; it is not a timeless description of current source or runtime. Never copy an old active-audit path, SHA, branch status, or file reference forward without checking the current tree.

The agent must:

1. check out `main`;
2. record HEAD;
3. inspect worktree status;
4. inventory all tracked files;
5. identify source, tests, scripts, configuration, workflows, schemas, docs, benchmarks, generated artifacts, and assets;
6. read the relevant content systematically;
7. trace dependencies and runtime entrypoints;
8. only then modify code.

Do not claim “I studied the repository” after reading only README/context.

## Rule 2 — Exhaustive means exhaustive

Use repository tooling to enumerate the full tree.

For text-bearing files, inspect all files rather than assuming the documentation index is complete.

At minimum include:

- root configuration;
- package manifests and lockfiles;
- workspace configuration;
- API source;
- frontend source;
- shared packages;
- database/schema/migrations;
- scripts;
- tests;
- CI workflows;
- benchmark fixtures;
- benchmark scorers;
- deployment scripts;
- prompts;
- docs;
- CSS/assets where behavior depends on them.

For very large generated/vendor files, record them and determine whether they are source-of-truth or generated output. Do not waste the entire context reproducing irrelevant generated blobs, but do not silently omit them from the inventory.

## Rule 3 — Read, then trace

Reading files in isolation is insufficient.

Trace at least these paths:

### Runtime path

```
process entry
→ server startup
→ database initialization
→ Redis/job setup
→ auth
→ routes
→ case creation
→ job execution
→ Investigator selection
→ Investigator action
→ tool capability
→ observation
→ evidence graph
→ oversight
→ persistence
→ terminal result
```

### Frontend path

```
router
→ dashboard / mission entry
→ launch
→ run state hook/store
→ live event transport
→ Reactor
→ evidence/report projection
```

### Research-quality path

```
gauntlet registry
→ run schema
→ campaign launcher
→ raw artifact
→ validator
→ scorer
→ failure observatory
→ release interpretation
```

### Deployment path

```
Replit import
→ environment/preflight
→ schema initialization
→ normal boot
→ health
→ auth
→ Redis
→ provider calls
→ real investigation
```

## Rule 4 — Never trust a document over executable truth

If a document says “production ready” but the application does not boot, the application is not production ready.

If a document says “main is canonical” but Git history says otherwise, investigate and reconcile.

If a document says a migration exists but the live schema lacks the column, inspect the migration/init mechanism.

If a test passes but runtime evidence contradicts it, preserve both facts and investigate the gap.

## Rule 5 — Architecture law

The agent must preserve the architecture implemented on current `main`:

- Groq Boss owns case direction and Investigator-capability selection;
- Groq Right-hand provides independent bounded oversight, not research/tool selection;
- the selected Groq Investigator capability owns the research trajectory;
- configured role-scoped Groq Investigator credential slots are capabilities, not a scripted model/provider ladder;
- actual model-selected capability execution, observations, durable evidence, provenance, identity hypotheses, contradictions, and contact attribution;
- deterministic source-backed admission/promotion and evidence-backed terminal state;
- truthful typed provider/tool/system failures;
- cancellation, authorization, SSRF/egress and resource ceilings.

Gemini/Mistral control or Investigator references in older incident documents are historical; they must not override `README.md`, `docs/context.md`, or executable code on current `main`.

Do not turn the architecture into a scripted enrichment pipeline.

## Rule 6 — No fake execution

Never fabricate:

- search results;
- web pages;
- observations;
- source URLs;
- contacts;
- evidence;
- confidence;
- progress;
- Reactor events;
- benchmark runs;
- CI results;
- Replit results.

If a tool is unavailable, say so.

If a run was not performed, say so.

If the user performed the run and supplied output, label it as user-reported evidence.

## Rule 7 — Database discipline

Before changing schema:

1. inspect repository schema;
2. inspect migration/init mechanism;
3. inspect live schema;
4. identify exact mismatch;
5. determine whether migration is additive/safe;
6. preserve existing data;
7. use the repository's canonical mechanism;
8. verify constraints and types afterward;
9. boot with mutation disabled.

Never use “make boot green” as the only migration criterion.

## Rule 8 — Provider discipline

Verify actual provider identity from execution records.

The canonical Investigator is a Boss-selected Groq capability. Groq is also the canonical provider family for Boss and Right-hand oversight.

Gemini, Mistral and DeepSeek/NVIDIA are retired from the canonical control/Investigator path.

Provider failures are not successful research.

Do not silently fall back to another model/provider.

## Rule 9 — Evidence discipline

For every important claim, ask:

- What observation supports it?
- Does that observation actually exist?
- Is the URL real?
- Is the source independent?
- Does it identify the same entity?
- Is the timestamp relevant?
- Is the contact person-scoped or organization-scoped?
- Are there contradictions?
- Is the state attribution/corroboration/verification actually justified?

If the answer is unknown, preserve uncertainty.

## Rule 10 — Frontend discipline

The Reactor must consume real state.

If a frontend animation needs an event, the backend must emit a real event.

Never invent “research activity” to make the UI look alive.

## Rule 11 — Benchmark discipline

A benchmark is not proof until actual runs are performed and artifacts are preserved.

Keep separate:

- system failure;
- insufficient evidence;
- wrong answer;
- correct abstention.

Do not create a single composite “smartness” ranking.

## Rule 12 — Use the working window

When the task is broad, do not answer after a superficial scan.

Spend the available working window on:

- repository inspection;
- source tracing;
- tests;
- runtime diagnostics;
- targeted fixes;
- verification;
- documentation reconciliation.

The final answer should summarize actual work performed.

## Rule 13 — Branch law

`main` is canonical for future work.

Historical branches may be inspected, but do not move development back to them unless the user explicitly asks.

Do not reset main backward to an old milestone.

## Rule 14 — Required final report

Every substantial agent session should finish with:

### Verified
Concrete facts directly observed.

### Changed
Exact files/commits changed.

### Tested
Exact commands/tests and outcomes.

### Runtime
Boot/health/auth/Redis/provider state.

### Research
Live investigation evidence, if any.

### Blockers
Exact unresolved blocker and layer.

### Next action
One concrete next step.

Do not hide uncertainty behind prose.

---

# Required study sequence for a new agent

## Current-state precedence (2026-10-16 update)

1. Confirm actual `main` HEAD and inspect recent commits first.
2. Read `README.md` and `docs/CURRENT_STATUS_2026-10-15.md`; verify both the newest run-specific audit and the latest appended evidence. Run 05 has a separate audit, while later Run 05 request/response records were appended to the Run 04 file.
3. Re-check GitHub Actions against the actual HEAD. CI snapshots in documents are historical.
4. Continue the required study sequence below; discover current file names from the tree if the repository changes.


Follow this sequence unless a user explicitly changes the task:

1. Read `README.md`.
2. Read `docs/CURRENT_STATUS_2026-10-15.md` and verify the newest audit pointer.
3. Read `docs/context.md`.
4. Read `docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md` — follow its current override at the top; treat the dated body as historical incident lineage.
5. Read `docs/BUREAU_REACT_ARCHITECTURE.md`.
5. Read `docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md`.
6. Read `docs/APEX_ATLAS_CEO_RELEASE_REVIEW_2026-09-20.md`.
7. Read `docs/RUN_BUREAU.md`.
8. Read `docs/REPLIT_NEW_ACCOUNT_SETUP.md`.
9. Read all remaining Apex architecture/research/deployment documents.
10. Inventory the entire source tree.
11. Read the API runtime and trace the canonical case path.
12. Read Investigator/tool/evidence/promotion code.
13. Read database/schema code.
14. Read frontend launch/event/Reactors code.
15. Read all relevant tests.
16. Read all benchmark/campaign scripts and workflow definitions.
17. Compare documentation claims against implementation.
18. Run the appropriate static/build/test gates.
19. Only then propose or execute changes.

This protocol is intentionally strict.

Apex is a research system where a plausible answer can be more dangerous than an obvious error. The engineering process must therefore prefer verified truth over speed.


## Current empirical-state addendum — 2026-10-19

The 16 October Run 05 details below are historical. The newest saved actual launch currently recorded in the tracked repository is `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-18_FRESH_PROJECT_RUN_03.md`, job `718ed715-aa6d-43c9-916f-463371485ad8`. Its visible discovery trace has zero findings/admissions and does not contain the final durable terminal status, post-run case/evidence/admission/card counts, or the active-lock reconciliation. Before any subsequent canonical run, the user/operator must inspect this job and the live active-job lock in the actual runtime, read-only, and confirm it is terminal and idle. This ChatGPT code review must not access or run Replit.

GitHub CI must be rechecked at the actual current `main` HEAD after integration; past green checks are revision-specific. Passing CI only makes the code a candidate for operator-controlled live validation. It does not establish productive research or end-to-end acceptance.

## Empirical-state guard — 2026-10-16

The live control loop is demonstrated, but the bureau is not live-accepted end-to-end. Run 04 executed and stopped at its 20-iteration ceiling with zero findings/admissions/cards. Run 05 executed to at least 30 recorded Investigator turns; its final job state and durable counts have not been reconciled. Read `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_05.md` and the complete `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_04.md` before drawing conclusions.

Do not infer a card-rendering failure without evidence of a candidate crossing admission. Distinguish strict-schema/output validation, local action validation, scope guard blocks, actual outbound execution, fetched evidence, findings, admission, persistence and UI projection. A blocked proposal is not a network request, and CI success is not a live research acceptance test.
