# Apex Atlas Successor Handoff — 2026-10-06

## Why this file exists

Continue the Apex Atlas / BigContacts engineering and live-run audit from the previous ChatGPT session.

The user explicitly required: **do not answer until everything is actually verified, fixed, improved, adjusted, and ready for another canonical live Atlas run and sequential audit.**

The previous agent failed this standard by stopping mid-work and by repeatedly getting ahead of its evidence. Do not repeat that. Tool activity and verification first; claims second.

## Repository rules

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Work ONLY on `main`.
- Do not create/use optimization or feature branches.
- Do not use Replit during engineering. The user runs Apex on Replit for live validation.
- Never claim CI green without actual workflow/status evidence.
- Never infer provider capacity from configured secret presence.
- Never fabricate a live result.

## Current main state

The previous agent's stale checkpoint was around `8732ed71a57b7afd5d2020ced5c7451f57b62f2e`.

GitHub currently shows subsequent commits including:

- `e248a7fa6ec899a93d9fd410097376914a1022d3` — build workspace declarations before API typecheck.
- `7dfd51e577942a621c5535e21efda0a61ec971fa` — restore canonical target control guard newlines.
- `5d04f94e41d776da8ba7f58323a9e6803cbb76d6` — label target durable context at Investigator boundary.
- `11385297689d08b3d62f86d8d353c8601318e022` — tighten Investigator context floor to 3,900.
- `d8ff9ce2c8738746fbee3bbdf1e9e070f8fc00c2` — align context-compaction guard with current budgets.
- `80203c12b522ee68b4dae74318c6d20cabb685de` — preserve latest Investigator trajectory record.
- `cf28dc6e72a4dd47dc22ebbade933c54f3eee146` — guard latest Investigator trajectory visibility.
- `9ae59673ee5bfe67da0c08b21472787da879b5fc` — regression test that latest trajectory survives compaction.
- `503d215214a60ca40393ccc5f6349c273bb7dffb` — pin Atlas CI actions / correct pnpm setup.
- `8f3cef2b67a70694c5c27c818f88a7a4c2a8937a` — separate discovery source descriptors from anchors.
- `958bf764b11bf50852dd16e6dae30188d39b3e74` — require concrete registry anchors.
- `8732ed71a57b7afd5d2020ced5c7451f57b62f2e` — generic discovery source-descriptor tests.

A recent-commit query returned `9ae59673ee5bfe67da0c08b21472787da879b5fc` as the latest visible commit. **Re-query current HEAD before doing anything else.**

## Important correction to the previous agent's last status

The previous agent believed the TURN-30/latest-context issue remained unresolved.

That is now stale.

Current `investigation-context-compaction.ts` explicitly emits:

`LATEST TRAJECTORY RECORD (must remain visible to the next Investigator)`

when trajectory records exist, with a bounded allocation. The two associated guards/tests are:

- `cf28dc6e72a4dd47dc22ebbade933c54f3eee146`
- `9ae59673ee5bfe67da0c08b21472787da879b5fc`

Verify them; do not re-open the issue merely from the old audit wording.

## User's sequential live audit

The user supplied a detailed audit in chat named:

`audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-06.md`

A GitHub fetch for that path returned NOT_FOUND, so do not claim that exact audit file is committed unless a fresh lookup proves it.

Its pre-launch baseline was:

- entities=0
- research_cases=0
- research_case_events=0
- research_sessions=0
- research_run_events=0
- research_evidence=0
- contact_evidence=0
- active Atlas job=false
- health/readiness passed
- no canonical live launch had yet been made at that checkpoint.

The audit reported an earlier full API suite of 128 files / 722 tests with 10 failing files / 14 failing tests. **That is historical, not current. Run the current suite.**

## Architecture invariants

Never sacrifice:

- positive evidence
- negative evidence
- conflicting evidence
- unresolved identity
- rejected candidates
- inaccessible/failed resources
- resource-limited state
- source provenance
- independent corroboration

Search snippets are leads, not claim evidence. Promotion requires observed, provenance-bound source material.

Canonical flow:

```
USER OBJECTIVE
 -> Gemini/Groq Boss
 -> runtime Investigator capability selection
 -> Investigator-owned research trajectory
 -> validated execution
 -> real observations + source URLs
 -> evidence/identity/attribution
 -> promotion boundary
 -> complete episode
 -> Right-hand review
 -> Boss continuation/redirect/stop
 -> durable terminal state
 -> UI
```

Investigator owns action/query/pivot/corroboration/stop. Do not replace autonomy with a fixed search recipe.

Capability semantics:

- selected Investigator capability stays fixed within an Investigator episode
- `groq-investigator-1` maps to `GROQ_INVESTIGATOR_API_KEY`
- `groq-investigator-2` maps to `GROQ_INVESTIGATOR_API_KEY_1`
- model name is routing, not capability identity
- no silent key switching
- same-role fallback only
- no Right-hand -> Investigator fallback
- no Mistral -> Groq substitution

Safety ceilings are ceilings, not model strategy:

- MAX_RESEARCH_ACTIONS=64
- MAX_NO_PROGRESS=64
- MAX_FOLLOW_UPS=64
- MAX_AGENTIC_ITERATIONS=64

## Prompt/context optimization

The intended information architecture is:

```
DURABLE EVIDENCE LEDGER
 -> STRUCTURED DECISION STATE
 -> COMPACT MODEL CONTEXT
 -> LOCAL RECENT WINDOW
 -> CURRENT ACTION / OBSERVATION
```

Current Investigator optimization includes:

- working context around 3,900 characters
- reduced intelligence-state layer
- reduced capability guidance
- duplicate institutional orientation removed from dynamic prompt
- duplicate full action schema removed from dynamic prompt
- structured response schema remains at provider boundary
- provider prompt safety ceiling
- Groq token-window awareness
- safe rate-limit telemetry without credentials/raw provider bodies.

Do not increase context just to make a test pass.

## Discovery gate

A real defect was found where generic source descriptors could masquerade as concrete anchors.

Current design distinguishes source descriptors such as “official”, “interview”, “company profile” from actual anchors such as:

- named organization/person
- explicit domain/site anchor
- concrete registry anchor.

Generic role/sector/date/source-only discovery should be blocked until a concrete anchor exists.

Do not introduce crude plural/singular patches without reproducing the actual validator defect.

## Evidence engine

A previous real bug collapsed multi-source findings to the first URL. It was repaired so each supporting source URL can retain its own provenance-bound evidence record.

Do not regress independent corroboration/source diversity.

## Target oversight

A `slice(-3)` exists in target oversight as a bounded recent/advisory projection. It is not the durable ledger. The current act is excluded from that prior-act projection.

Do not remove it unless durable persistence is proven to be truncated.

## Replit/build performance

A prior Replit run took about 24 minutes before useful execution.

Confirmed repository-side issue: root workspace build already built API, then `scripts/replit-boot.sh` built API again.

Repair:

- API build writes `dist/.atlas-build-stamp.json`
- stamp records revision/dirty/builtAt
- boot reuses matching clean API build
- dirty/mismatched revisions rebuild.

Also repaired:

1. Investigator prompt test fixture missing required `model`.
2. nullable durable context passed to optional string; normalized with `?? undefined`.

Do not claim repository code caused all 24 minutes; Replit phase timings are needed to attribute install/import time.

## Required readiness gate

Before telling the user “ready”, establish:

1. current main HEAD
2. current source/architecture review
3. complete API test suite green, preferably zero failures
4. `pnpm run check:bureau` green
5. typecheck green
6. production/workspace build green
7. prompt-budget guards green
8. latest-trajectory compaction tests green
9. discovery-anchor tests green
10. evidence-engine tests green
11. provider-gate/capability-boundary tests green
12. GitHub CI green if observable; otherwise explicitly unobservable
13. no unexplained safety/control failure remains.

Only then is the repository ready for the user's next live run.

Readiness does NOT mean provider capacity is available. The live run must establish that.

## Canonical live-run protocol

When the engineering gate is genuinely green, the user wants one UI-equivalent attempt using exactly:

```
POST /api/ingest/atlas-run
{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}
```

Before launch:

- snapshot entity/evidence ledger
- record IDs/counts
- verify active job=false
- verify health
- do not make separate provider probes.

During/after:

- preserve first provider failure boundary
- distinguish model claims from observed source data
- record raw search text and observed public URLs where runtime exposes them
- do not treat job completion as evidence admission
- verify entity/evidence rows directly
- preserve rejection/unresolved/resource-limited outcomes
- do not retry in a loop merely to obtain success.

## Do not

- claim green without execution proof
- call a stale test a product regression without tracing source
- weaken architecture to satisfy an old assertion
- call an advisory projection a durable-ledger truncation
- treat search snippets as evidence
- silently change Investigator capabilities
- probe providers separately
- use Replit for engineering
- say “still working” without actual tool activity
- stop after a tool call and leave the task hanging.

## Immediate next task

1. Query current main HEAD and recent commits.
2. Study the current relevant files before changing anything.
3. Run the complete API suite.
4. Run bureau checks.
5. Run typecheck/build.
6. Classify every remaining failure from source, not from expectation.
7. Fix genuine defects only.
8. Re-run the complete gate.
9. Only after all evidence supports it, tell the user the repository is ready for the canonical live run.

The objective is not to make Apex look green. The objective is to make Apex actually ready.
