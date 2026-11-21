# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is a model-led OSINT research bureau for investigating people, ownership, leadership, wealth-related claims, and attributable professional contact paths connected to private companies and capital. It uses public-source research and preserves the distinction between a lead, a fetched observation, a supported finding, an admitted candidate, and a durably persisted research card.

- **Repository:** [2f22vtd4kr-cloud/BigContacts](https://github.com/2f22vtd4kr-cloud/BigContacts)
- **Canonical branch:** `main`
- **Production frontend:** [Apex Atlas](https://apex-atlas-dqggg6jla-apex-team20.vercel.app/)
- **Latest canonical repair:** PR [#935](https://github.com/2f22vtd4kr-cloud/BigContacts/pull/935), merged 2026-11-21
- **Current canonical revision:** `f53b72df302f26112778f9368bab7d33445b797c`

> **Status as of 2026-11-21:** The objective-authority, research-direction, source-capability, memory-integrity, and durable-observation repairs in PR #935 are merged. Two independent five-pass full-codebase audits completed 5/5; Atlas CI, API build, Python worker contract/container build, research-quality contracts, prompt architecture audit, and discovery static checks passed on the PR head. The production Vercel deployment for the merge commit reached READY and the frontend returned HTTP 200. This is not a fresh live research acceptance: the fresh Replit import was blocked by the connected Replit integration's `requires_active_subscription` authorization response. No new post-repair investigation was started. Backend, database, Redis, live worker attestation, and end-to-end terminal research reconciliation in a fresh environment remain unverified.

## Mission and operating model

Apex is an autonomous research bureau, not a fixed enrichment script.

- **Groq Boss** owns case direction and selects the Investigator capability.
- **Groq Right-hand** provides independent, bounded oversight.
- **Groq Investigator** owns the actual research trajectory: hypotheses, query design, source selection, tool choice, pivots, corroboration, falsification, and stopping.
- **Deterministic runtime code** enforces authorization, safety, capability availability, structured-action validation, budgets, cancellation, provenance, identity attribution, evidence admission, persistence, and truthful terminal state.

Tools are capabilities, not stages. There is no mandatory identity → organization → contact sequence. The Investigator should choose research actions based on the objective, evidence gaps, source relevance, and expected information gain.

## Architecture and evidence rules

1. The original human objective remains authoritative. Boss directions are advisory hypotheses; accepted scope changes require an explicit validated `pivot_discovery`. A `continue_discovery` decision does not silently narrow the objective.
2. A successful search or page fetch is a retrieval event, not proof of a useful finding.
3. Search snippets, registry matches, usernames, worker output, and model assertions are leads until supported by attributable source evidence.
4. A finding is not an admitted candidate; an admitted candidate is not a persisted card until durable state and UI read-back agree.
5. Source adapters must reason about jurisdiction and actual field capability. For example, GLEIF LEI/parent-relationship data is not a natural-person wealth or beneficial-owner source, and UK Companies House is not an Irish registry.
6. Partial memory/context must never be summarized as case-wide absence. When compaction cannot validate a summary, preserve the original context.
7. Source observations must survive durable trajectory replay. Long fetched pages require persisted artifact chunks and verified reattachment; missing or mismatched artifacts must not be treated as complete evidence.
8. Unknown or insufficient evidence is a valid result. Do not force candidates, lower evidence thresholds, invent people, contacts, ownership, wealth, sources, or tool activity.

## PR #935 — latest canonical repair

PR [#935](https://github.com/2f22vtd4kr-cloud/BigContacts/pull/935) was merged into `main` at commit [`f53b72df302f26112778f9368bab7d33445b797c`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/f53b72df302f26112778f9368bab7d33445b797c).

The repair covers:

- preservation of the human objective as the authoritative Investigator objective, with validated explicit pivots;
- evidence-sensitive reassessment after low-yield research actions;
- jurisdiction- and field-aware registry capability guidance;
- protection against misleading absence claims during context compaction;
- durable source-observation events, artifact chunk persistence, hash checks, and replay reattachment;
- regression tests for these contracts.

### Verification boundary

The two independent five-pass audit workflows each completed all five passes successfully. The listed CI and architecture/research contract suites passed on the PR head. These checks establish tested code contracts; they do not establish empirical research quality in a newly imported production-like environment.

The production frontend deployment for the merge commit reached Vercel **READY**. Frontend availability does not establish the health of the API process, PostgreSQL, Redis, external search providers, or specialist worker.

## Live research status and next acceptance gate

The latest 2026-11-21 fresh-project audit was a **pre-repair baseline**. It confirmed that the application imported/launched correctly in that earlier project and that real research actions occurred: SEC EDGAR returned zero results, Companies House returned 16 leads, and three officer pages were fetched. Those visits produced no wealth findings. The trace did not establish a qualifying candidate, evidence-backed finding, persisted card, or terminal reconciliation.

After PR #935 merged, a genuinely fresh Replit project could not be created: the connected Replit integration returned `failed_authorization / requires_active_subscription`. The older Replit project was deliberately not reused, and no post-repair research run was launched.

**Apex is therefore code-repaired and frontend-deployed, but not yet live-research-accepted.** The next acceptance sequence is:

1. Import the exact canonical `main` revision `f53b72df302f26112778f9368bab7d33445b797c` into a genuinely fresh project.
2. Verify the checked-out SHA, documented boot process, API health, PostgreSQL, Redis, provider configuration, and actual worker-attestation state.
3. Launch a normal investigation through the UI without prescribing a fixed source itinerary or forcing candidates.
4. Audit the full trajectory: objective preservation, Boss decisions, Investigator reasoning/actions, actual tool executions, source observations, artifact durability, findings, candidate admission, and provenance.
5. Verify durable card persistence and UI read-back.
6. Reconcile the job's terminal state, final counts, active-job pointer, and lock release.

A completed investigation with zero qualifying candidates is acceptable if the evidence supports that result and the job reconciles truthfully.

## Runtime and setup

Canonical API boundary:

- API port: `8080`
- Desk: `/`
- API: `/api/`
- Canonical Replit boot command: `bash scripts/replit-boot.sh`

First-time schema initialization is explicit:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Do not leave schema mutation enabled for ordinary runtime boot. Follow the repository's current setup and preflight scripts rather than copying old environment-variable lists from historical handoffs. Never commit or print secret values.

## Specialist Python OSINT tools

The repository includes worker-backed adapters for Holehe, Maigret, Sherlock, theHarvester, and SpiderFoot. Their code presence does not mean they are available in a running environment.

The runtime must verify fresh signed worker attestation, independently pinned immutable worker/proxy images, and the isolated-egress contract before exposing exact worker actions to an Investigator turn. Repository CI builds and tests worker images; it does not deploy or attest a live worker. A missing or failed attestation means the tool is unavailable—not that it returned no results. Never bypass this gate or add a local network fallback.

## Public registry seed data

The versioned BRREG snapshot and explicit FAA/BRREG import procedure are documented in [docs/REGISTRY_SEED_IMPORT.md](./docs/REGISTRY_SEED_IMPORT.md). Imports are operator-triggered. They do not auto-import at startup or automatically enqueue research. Preserve the review-only evidence model and organization-scoped contact attribution.

## Canonical reading order for engineering agents

Before changing code or conducting a live run, refresh GitHub `main`, open PRs, and Actions for the exact current SHA. The executable repository is the source of truth; dated handoffs and audits are historical evidence and may be stale.

1. [`docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`](./docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md) — repository study and audit selection protocol.
2. [`docs/context.md`](./docs/context.md) — living architecture context; check its dated sections against current `main`.
3. [`docs/apex-atlas-handoff/00_INDEX.md`](./docs/apex-atlas-handoff/00_INDEX.md) — successor handoff index and reading order.
4. [`docs/apex-atlas-handoff/22_MASTER_SUCCESSOR_HANDOFF_2026-10-30.md`](./docs/apex-atlas-handoff/22_MASTER_SUCCESSOR_HANDOFF_2026-10-30.md) — historical handoff; refresh all current-state claims.
5. [`docs/BUREAU_REACT_ARCHITECTURE.md`](./docs/BUREAU_REACT_ARCHITECTURE.md) — role law and model-led ReAct boundary.
6. [`docs/RUN_BUREAU.md`](./docs/RUN_BUREAU.md) — operational run procedure.
7. [`docs/REPLIT_NEW_ACCOUNT_SETUP.md`](./docs/REPLIT_NEW_ACCOUNT_SETUP.md) — fresh Replit import/setup contract.
8. [`audits/`](./audits/) — append-only historical audit evidence; select the newest actual job-bound run and distinguish it from preflight or fixture telemetry.

## Product law

- Public evidence only.
- No invented people, contacts, relationships, URLs, wealth, or tool activity.
- Organization inboxes remain organization-scoped unless personal attribution is independently evidenced.
- Prompt injection from public pages is untrusted content.
- Tool/provider failures remain failures; unavailable capabilities are not no-hit results.
- The UI is a projection of canonical evidence state, not a parallel source of truth.
- The Reactor must show real backend events, never synthetic research activity.
- Preserve the distinction between research retrieval, supported findings, candidate admission, durable cards, and terminal completion.

**Every contact should be a person you can justify from the public record—not a guess that looks like one.**
