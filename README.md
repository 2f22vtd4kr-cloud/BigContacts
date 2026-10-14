# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is an OSINT research desk built to identify decision-makers, owners, founders, operators, and high-net-worth individuals connected to private companies and capital, then surface **real, attributable contact paths** from public sources.

> **★ Active live audit:** [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_03.md](audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_03.md)

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

The latest user-operated live-run evidence is the [October 14, 2026 Live Run 08 audit](audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_08.md). Canonical Atlas job `9884c4a6-203b-43fa-a6cc-45a87e2f9a7c` ended `failed/incomplete` at phase 3/4 with zero admissions and no card. The final in-scope Washington State corporate-filings search observed six URLs but produced no findings and no successful fetched-page visits before `upstream_token_window_wait_exceeded`; the recorded run therefore never reached candidate admission, so this is not evidence of a downstream card-persistence failure. Its HTTP 429 token-window telemetry did not prove hard request-quota exhaustion. The audit also records an authorized recovery request for case 1 accepted with HTTP 202 as job `583c11a6-e704-4588-81d9-2bb81cf7a297`, but it does not establish that job's terminal status or later database/event deltas. Its outcome remains **unknown and unreconciled**; do not assume success or failure or launch a duplicate while durable status is ambiguous. Earlier Run 03–07 audits remain historical incident evidence. Subsequent source fixes address the corporation-search scope guard and the interaction between productive provider-failed episodes and the separate token-window recovery threshold. Current CI must be checked against the exact current `main` SHA, and CI green is not live-research certification. A subsequent operator-controlled Replit audit must verify actual fetched pages, source-bound `done(findings)`, durable candidate admission, target/contact attribution, and a truthful downstream card.

## Runtime secret contract

Never print or commit secret values. Do not ask the user for GitHub credentials when repository access is already connected.

## Canonical documents

- `docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md` — master agent continuation contract.
- `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md` — mandatory repository study protocol.
- `docs/context.md` — living architecture, deployment truth, release gates, and research handoff.
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
