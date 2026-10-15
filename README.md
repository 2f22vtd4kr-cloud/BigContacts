# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is an OSINT research desk built to identify decision-makers, owners, founders, operators, and high-net-worth individuals connected to private companies and capital, then surface **real, attributable contact paths** from public sources.

> **Latest live-run evidence (2026-10-15):** [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_03.md](audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_03.md) — failed/incomplete, 20 Investigator iterations, one successful page visit, zero findings/admissions/cards. See [Current verified status](docs/CURRENT_STATUS_2026-10-15.md) for the code/CI snapshot and next acceptance criteria.

It is a model-led research bureau, not a fixed enrichment script:

- **Groq Boss** directs the case and selects the Investigator.
- **Groq Right-hand** provides independent bounded oversight.
- **Groq Investigator** owns the actual research trajectory.
- Deterministic runtime code enforces safety, authorization, provenance, identity, persistence, cancellation, and resource limits.

## Canonical branch

**`main` is the canonical working and integration branch for all future Apex Atlas work.**

The repository default branch is `main`. `main` contains `audit/genuine-five-green-final` as an ancestor; merge base is `7cb15619113cad7c19750bdcf7747e7bf39970a8`. The current `main` HEAD is the source of truth for future work. The newer Very Strong implementation/documentation work is therefore on `main`.

`audit/genuine-five-green-final` remains a historical architecture/regression milestone. Do not switch future work back to it merely because older documents call it the production/certification branch.

For a full agent continuation contract, read:

- `docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md`
- `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`

## Current engineering state

The current `main` line contains the Very Strong engineering batch and the later Groq control-plane remediation, including:

- evidence-graph cognition in the Investigator context;
- bounded, lossless context compaction;
- information-gain and capability-semantic research assessment;
- adaptive discovery portfolios with diversity floors;
- optional independent Investigator trajectories;
- provider-native structured action outputs;
- source-family/source-class intelligence;
- failure observability for identity, attribution, source, stopping, injection, and system errors;
- explicit caller-owned transient-429 retry boundaries for Groq control/research roles;
- GPT-OSS request-contract hardening with `include_reasoning:false` and no `reasoning_format`;
- complete final Right-hand prompt bounding below the adapter's 20,000-character ceiling;
- Groq-only canonical control plane and retired Mistral/Gemini control transports;
- all configured Groq Investigator credential slots honored by the canonical entry gate;
- dedicated CI/static verification workflows.

These are architecture/engineering capabilities. They are **not** proof of empirical research superiority or live production readiness.

## Architecture in one view

```
CASE / OBJECTIVE
    ↓
Groq Boss
    ↓
model-owned Investigator research loop
    ↓
immutable observations + provenance
    ↓
Research Intelligence
    ↺ Groq Right-hand oversight when justified ↺
    ↓
Groq Boss next control action
    ↓
deterministic terminal/admission gate
```

**Tools are capabilities, not stages.** There is no mandatory identity → organization → contact hop recipe.

## Product law

- Public evidence only.
- No invented people, contacts, relationships, URLs, or wealth.
- Organization inboxes remain organization-scoped unless attribution is independently evidenced.
- Unknown/insufficient evidence is a valid outcome.
- Tool/provider failures remain failures.
- Prompt injection from public pages is untrusted content.
- Python-backed network OSINT remains fail-closed until enforceable sandbox egress exists.
- The UI is a projection of canonical evidence state; it must not become a parallel source of truth.
- The Reactor must show real backend events, never synthetic research activity.

## Research-quality program

The Research Gauntlet is the empirical quality program. The historical grounded registry is 38 cases, schema `research-gauntlet-v1`, version `1.1.1`, with ground truth frozen as of 2026-09-18. The repository also contains later extension/campaign work that future agents must inspect directly rather than relying on this summary.

Metrics remain separate:

- identity precision/recall;
- false-positive identity rate;
- claim support correctness;
- unsupported claim rate;
- contact precision/recall;
- contradiction recall;
- source-quality correctness;
- negative-finding calibration;
- useful pivots;
- unnecessary calls;
- successful observations;
- trajectory length;
- system failures.

Do not collapse these into a single “smartness” or winner score.

## Runtime

Canonical API boundary:

- API: `8080`
- desk: `/`
- API: `/api/`
- canonical startup: `bash scripts/replit-boot.sh`

First-time schema initialization is explicit:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Do not leave schema mutation enabled for ordinary runtime boot.

The latest user-operated live run is the [October 15, 2026 Live Run 03 audit](audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_03.md). Canonical job `8eb7c47b-dc94-46d6-a851-133104a6a806` ended `failed/incomplete` at the 20-Investigator-iteration ceiling (phase 3/4). The recorded totals are 8 successful web-search actions, 1 successful page visit, 0 findings, 0 admissions/inserts, and 0 cards. The turn-by-turn audit currently itemizes six successful provider search requests, so its search count remains unreconciled; do not guess the difference.

The fetched GrowthCap/private-equity article produced no named target or attributable target contact. Later turns were consumed by a malformed Investigator registry action, scope-guard blocks (including one semantically aligned Secretary-of-State query the old guard rejected), one empty search result, and OpenCorporates HTTP 401 errors. The post-run database check showed no entities, assets, relationships, contact evidence, research evidence/sessions, or research-run events beyond the preserved discovery-case trace. Therefore there is no evidence of a downstream card-rendering/persistence failure: no candidate reached admission.

Since Run 03, `main` includes the phrase-aware source-class normalization regression, runtime schema filtering for registries that require credentials, safe registry-auth status handling, and OpenCorporates authentication using its documented `api_token` query parameter. These changes are not yet proven by a new Replit live run. After subsequent documentation-only pushes, the latest checked docs-updated HEAD (`e1e0f4dd7fce171fd00590f053e896cd6f460178`) had Atlas CI passing (15/15 jobs), frontend gate passing, and discovery static check passing; the API Build had passed on code revision `40a243d05f8d315f4a7c8446f18f0514fecd6f94`. The five-consecutive-audits workflow was still in Audit 1 (14/19 steps completed, no failure observed); previous audit workflows were cancelled by newer pushes and do not count as five green audits. Re-query Actions after any new commit. See [Current verified status](docs/CURRENT_STATUS_2026-10-15.md); always refresh GitHub Actions before claiming a gate is green. CI success does not certify live research. The next live acceptance must show real fetched-page observations, source-bound findings, durable evidence-backed admission, and a card backed by that newly admitted state.

## Runtime secret contract

Never print or commit secret values. Do not ask the user for GitHub credentials when repository access is already connected.

## Canonical documents

- `docs/CURRENT_STATUS_2026-10-15.md` — latest audited run, verified fixes, CI snapshot, and next live-acceptance criteria.
- `docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md` — current override at the top, followed by explicitly historical handoff material.
- `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md` — mandatory repository study, HEAD-check, and newest-audit selection procedure.
- `docs/context.md` — living architecture, runtime status pointer, deployment truth, and release gates.
- `docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md` — historical continuation background; its dated body is subordinate to current status, source, and newest audit.
- `docs/BUREAU_REACT_ARCHITECTURE.md` — role law and canonical ReAct boundary.
- `docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md` — Very Strong implementation and remaining hardening.
- `docs/APEX_RESEARCH_GAUNTLET_V1.md` — empirical research-quality protocol.
- `docs/REPLIT_NEW_ACCOUNT_SETUP.md` — deployment/import contract.
- `docs/RUN_BUREAU.md` — canonical operational run procedure.
- `docs/APEX_ATLAS_CEO_RELEASE_REVIEW_2026-09-20.md` — CEO/lead-engineer release gate and risk review.

## Product principle

**Every contact should be a person you can justify from the public record — not a guess that looks like one.**

Architecture makes that behavior enforceable. Only controlled live investigations can prove that Apex consistently achieves it.

<!-- Recovery verification remains empirical: static green gates do not replace the canonical Replit launch. -->
