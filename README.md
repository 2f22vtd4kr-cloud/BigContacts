# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is an OSINT research desk built to identify decision-makers, owners, founders, operators, and high-net-worth individuals connected to private companies and capital, then surface **real, attributable contact paths** from public sources.

It is a model-led research bureau, not a fixed enrichment script:

- **Gemini Boss** directs the case and selects the Investigator.
- **Gemini Right-hand** provides independent bounded oversight.
- **Groq or Mistral Investigator** owns the actual research trajectory.
- Deterministic runtime code enforces safety, authorization, provenance, identity, persistence, cancellation, and resource limits.

## Current engineering state

### Reviewed development branch

`audit/apex-atlas-very-strong-v1`

This branch contains the current **Very Strong** engineering batch:

- evidence-graph cognition in the Investigator context;
- bounded, lossless context compaction;
- information-gain and capability-semantic research assessment;
- adaptive discovery portfolios with diversity floors;
- optional independent Investigator trajectories;
- provider-native structured action outputs;
- source-family/source-class intelligence;
- failure observability for identity, attribution, source, stopping, injection, and system errors;
- dedicated CI verification.

### Production/certification branch

`audit/genuine-five-green-final`

The five-consecutive-green milestone on that branch is an **architecture/regression milestone**, not proof of research superiority and not proof of production readiness.

The current development branch is intentionally not described as production-certified until fresh runtime and empirical research gates pass.

## Architecture in one view

```
CASE / OBJECTIVE
    ↓
Gemini Boss + Gemini Right-hand
    ↓
select Groq OR Mistral Investigator
    ↓
Investigator chooses WHAT / WHERE / HOW
    ↓
validated tool execution
    ↓
observation + provenance
    ↓
evidence graph: claims / identity / contradictions / contacts / negatives
    ↓
bounded cognitive context
    ↺ oversight and next Investigator act
    ↓
finding / abstention / promotion / stop
```

**Tools are capabilities, not stages.** There is no mandatory identity → organization → contact hop recipe.

## What makes the current Apex different

### 1. Model-owned research trajectory

The Investigator chooses queries, providers, page visits, registries, domain/footprint tools, pivots, verification and stopping based on the evidence available at that point.

Deterministic code can reject an unsafe or invalid action. It must not secretly replace the Investigator with a fixed research sequence.

### 2. Evidence is first-class state

Apex keeps durable observations, provenance, claims, competing identity hypotheses, contradictions, contact states, negative findings, open questions, and trajectory records.

An LLM assertion or search snippet is a lead, not proof.

### 3. Corroboration means independent evidence

Copied/syndicated pages are not treated as independent simply because they have different URLs. Source family and source class are explicit research state.

### 4. Discovery is adaptive

Discovery can use historical yield while retaining diversity across geography, occupation, wealth mechanism, reachability, and source kind. The system is not a celebrity or raw-wealth ranking engine.

### 5. Structured decisions

Investigator actions use provider-native structured output where supported, followed by semantic validation. The system does not depend on fragile brace extraction as its primary action parser.

### 6. Failure is visible

Apex records diagnostic signals for identity collisions, stale or misleading sources, copied contacts, attribution errors, missed/unnecessary pivots, stopping errors, prompt injection, tool selection, source quality, and system failures.

## Research-quality program

**Apex Research Gauntlet v1** is the empirical quality gate.

Current registry:

- schema: `research-gauntlet-v1`
- version: `1.1.1`
- status: `grounded-reviewed`
- cases: **38**
- ground truth frozen as of **2026-09-18**

It measures identity, attribution, evidence support, contradictions, source quality, negative findings, useful pivots, operational cost, and failure behavior separately.

It does **not** reduce the system to a single “smartness” score, and an architecture diagram or green CI run is not research-quality evidence.

## Runtime and deployment

Canonical API boundary:

- API: `8080`
- desk: `/`
- API: `/api/`
- canonical startup: `bash scripts/replit-boot.sh`

First-time database initialization is explicit:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Do not leave schema mutation enabled for ordinary runtime boot.

The last canonical runtime audit was blocked by a missing Apex provenance/database schema. Until schema initialization, canonical boot, health verification, and a controlled real research run succeed, **Apex is not a production release**.

## Runtime secret contract

Exactly **13 active provider/integration names**:

```text
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
GEMINI_RIGHT_HAND_API_KEY
```

Separate deployment/browser security controls:

```text
APEX_API_AUTH_TOKEN
APEX_OPERATOR_PASSWORD
APEX_SESSION_SECRET
```

DeepSeek/NVIDIA and WHOISJSON are retired/legacy. Do not request or document them as active Apex credentials.

Never print or commit secret values. Do not ask for GitHub credentials or `DATABASE_URL` as operator secrets.

## Core operating principles

- Public evidence only.
- No invented people, contacts, relationships, URLs, or wealth.
- Organization inboxes remain organization-scoped unless attribution is independently evidenced.
- Unknown/insufficient evidence is a valid outcome.
- Tool/provider failures remain failures.
- Prompt injection from public pages is treated as untrusted content.
- Python-backed network OSINT remains fail-closed until enforceable sandbox egress exists.
- The UI is a projection of canonical evidence state; it must not become a parallel source of truth.

## Canonical documents

- `docs/context.md` — living architecture, deployment truth, release gates, and research handoff.
- `docs/BUREAU_REACT_ARCHITECTURE.md` — role law and canonical ReAct boundary.
- `docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md` — current Very Strong implementation and remaining hardening.
- `docs/APEX_RESEARCH_GAUNTLET_V1.md` — empirical research-quality protocol.
- `benchmarks/research-gauntlet-v1.json` — versioned grounded registry.
- `docs/REPLIT_NEW_ACCOUNT_SETUP.md` — deployment/import contract.
- `docs/RUN_BUREAU.md` — canonical operational run procedure.

## Product principle

**Every contact should be a person you can justify from the public record — not a guess that looks like one.**

Architecture makes that behavior enforceable. Only controlled live investigations can prove that Apex consistently achieves it.
