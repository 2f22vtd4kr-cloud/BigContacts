# Apex Atlas — Main Canonical Consolidation Record
**Date:** 2026-09-21  
**Canonical branch:** `main`  
**Repository:** `2f22vtd4kr-cloud/BigContacts`

## Purpose

This record closes the historical branch-consolidation review requested by the Apex Atlas handoff. The repository was reviewed from the current `main` tree, with the historical Apex branch family compared against `main` so that development does not continue by hopping between stale branches.

## Current canonical state

- `main` is the sole future-work line.
- The old `audit/genuine-five-green-final` line is historical.
- The Very Strong audit line is historical and its substantive implementation is already represented on `main`.
- Repository code contains the current canonical control plane: Gemini Boss direction/oversight, bounded Gemini Right-hand critique, and Groq/Mistral Investigator trajectory ownership.
- Canonical discovery and canonical target research are the active research surfaces.
- Legacy deterministic research routes and retired provider vocabulary are not present in the current code-search surface.
- Search/action URLs are not accepted as proof merely because a URL exists; canonical target/discovery admission binds observations and provenance before durable promotion.
- Durable research cases and append-only case events are part of the current schema/runtime contract.
- Canonical Redis job ownership is fail-closed and lease loss fences active cases rather than allowing silent continuation.
- Replit boot does not mutate schema unless an operator explicitly enables `APEX_ALLOW_SCHEMA_PUSH=true`.

## Historical branch review

The repository contains a very large historical branch family. Representative Apex branches were compared directly against `main`, including architecture-hardening, Free-ReAct, evidence-boundary, canonical discovery, canonical target runner, Reactor live-source, provider-role, provenance, cancellation, job-lock, retirement, and audit branches.

The important finding is that most of these branches are old snapshots that are thousands of commits behind the current `main` lineage. Their apparent commits-ahead counts therefore do not mean they are newer development lines. Their unique changes must not be merged blindly because they were authored against much older architecture.

### Examples of already-integrated work

- `apex/dig-live-tool-spans`: its relevant live-span/runtime files already exist in current `main`.
- `apex/reactor-live-source-truth`: its Reactor live-store/model/surface work is represented in current `main`.
- `fix/strict-investigator-provenance`: its provenance-boundary files are represented in current `main`.
- `fix/investigator-free-react-initial-action`: the current Free-ReAct and legacy-mutation guard architecture supersedes the historical patch.
- `fix/atomic-canonical-atlas-launch-lock`: current `canonical-job-lock.ts` already contains the hardened lock/lease implementation.
- `audit/apex-final-massive-hardening-2026-09-11`: current canonical job locking and launch boundaries are represented on `main`.
- `audit/bureau-round2-final-2026-09-12`: its relevant browser/contact/SSRF boundary changes are represented by the current architecture.
- `feat/reactor-live-theatre`: the current Reactor implementation is newer than this historical branch; its isolated browser fixture files are not automatically part of the production runtime.
- `tmp/audit-sync-branch`: its unique workflow/trigger artifacts are temporary audit machinery and are not production Apex code.

## Deliberately not merged from stale branches

Some historical branches contain files that no longer exist on `main`, but absence alone is not evidence of missing production functionality.

Examples include:

- old identity-admission tests tied to an earlier `discovery-agent-admit` implementation;
- isolated Reactor browser inspection fixtures;
- temporary audit workflows and trigger markers;
- historical 40K planning documents.

These were inspected as historical implementation evidence. They were not copied into `main` because doing so would reintroduce obsolete control paths, duplicate CI surfaces, or stale abstractions. Current `main` contains newer equivalents where the behavior remains canonical.

## Repository-wide drift checks

The current `main` search surface was checked for retired/legacy terms that would indicate old architecture leaking back into the active line:

- `perplexity`
- `nvidiaNim`
- `whoxy`
- `whoisjson`
- `Groq Boss`
- `Mistral Boss`
- `providerFallback`
- `TRANSPORT FALLBACK`
- historical branch names used as future-work instructions

No matches were found in the current code-search surface for those terms.

## Runtime boundary still requiring operator verification

The repository schema now explicitly contains:

`research_cases.target_entity_id`

with a nullable foreign key to `entities`.

The boot contract intentionally does **not** mutate an existing production database automatically. Therefore a previously observed live Replit database missing this column remains a deployment-state problem, not a reason to alter the canonical application schema blindly.

The correct sequence remains:

1. inspect the live database without mutation;
2. compare it with the current `main` schema;
3. apply the explicit schema operation only if the inspection proves it is required;
4. boot with schema mutation disabled;
5. verify health/auth/Redis;
6. execute exactly one genuine investigation;
7. inspect durable case events, observations, provenance, evidence, oversight and Reactor truth;
8. only then authorize empirical research runs.

## Branch policy from this point

New Apex engineering work goes to `main`.

A temporary branch may be created only when a change genuinely requires isolated review. It must be reconciled back into `main` before becoming part of the canonical implementation. Historical branches are references, not development destinations.

No future agent should interpret a branch's commit count as proof that it contains newer Apex code. The relevant question is whether its implementation is newer and compatible with the current canonical architecture.

## Completion standard

The branch-consolidation work is considered complete at the source-control level when:

- `main` contains the current canonical Apex implementation;
- stale branch instructions no longer direct future work elsewhere;
- historical branches are treated as evidence, not active development lines;
- unique historical files are merged only when their behavior is still canonical and compatible;
- temporary audit artifacts are not promoted into production architecture;
- runtime/database validation remains explicitly separated from static source-control confidence.

The next unresolved milestone is therefore runtime truth, not another branch migration.
