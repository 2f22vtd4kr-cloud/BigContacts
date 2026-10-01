# Apex Atlas — In-Depth System Introduction

## Mission

Apex Atlas is the canonical AI-powered public-web OSINT/research bureau inside BigContacts. It is not a deterministic enrichment script, search-result scraper, fixed identity-to-email recipe, or fake research dashboard.

Core law:

> The model owns research strategy; deterministic code owns safety, evidence integrity, authorization, persistence, and resource budgets.

Canonical conceptual loop:

CASE/OBJECTIVE
 -> Gemini Boss
 -> Gemini Right-hand oversight
 -> select Investigator provider
 -> Groq OR Mistral Investigator
 -> model-owned free-form ReAct research
 -> validated capabilities
 -> immutable observations + provenance
 -> durable evidence graph/case ledger
 -> Right-hand review
 -> Boss disposition
 -> next action / pivot / abstain / stop
 -> validated entity/evidence/card projection

## Roles

### Gemini Boss
Owns case direction, assignment, Investigator selection, continuation disposition, and high-level review. It does not browse as the Investigator and cannot manufacture evidence.

### Gemini Right-hand
Independent Gemini oversight. Reviews latest state, evidence gaps, contradictions, research objective, and whether the direction should continue/pivot/stop. It is not the Investigator and must not be silently replaced by Groq/Mistral.

### Investigator
Groq or Mistral owns the actual research trajectory: queries, source selection, visits, pivots, verification, disproof, hypotheses, and stopping.

## Capabilities

Search, browser/fetch, registry, domain, footprint, harvesting, email/username footprint, and related mechanisms are capabilities, not fixed phases. The Investigator chooses them. Deterministic code validates authorization, safety, availability, and execution.

A missing tool is not success. A provider error is not evidence. A search snippet is not identity proof. An LLM assertion is not proof. A guessed email pattern is not contact evidence.

## Evidence

The dossier/card is a projection. Durable state is authoritative.

Expected progression:
raw observation
 -> model-authored claim/hypothesis
 -> promotion proposal
 -> deterministic identity/provenance/scope validation
 -> durable evidence/event
 -> projection

Durable state must retain objective, actions, actual provider/tool, observations, URLs, provenance, claims, uncertainty, hypotheses, contradictions, contacts, negative findings, open questions, oversight decisions, and correlation/replay identifiers.

## Runtime

Canonical UI-equivalent launch for the controlled audit:
targetCount=3
researchDepth=standard
targetTimeoutMs=420000

The canonical test must prove sequential target execution from runtime evidence, not source inspection alone.

The canonical application is the existing Apex Atlas UI/API. Do not create replacement applications or fake dashboards.

## Schema

First-time schema initialization is explicitly operator-authorized:
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh

Ordinary boot must not silently mutate schema.

## Context management

Full Investigator history should remain durable outside the model prompt. Model-facing context must be bounded while preserving:
- objective;
- active hypotheses/discriminators;
- contradictions;
- negative findings;
- open questions;
- source-family coverage;
- recent actions;
- high-value evidence;
- provenance pointers.

The latest live run exposed request-size growth to about 214,957 characters and repeated Groq/Qwen HTTP 413s. Do not solve this by blindly deleting history.

## Required source study

Read:
- artifacts/apex-finder/src/lib/launch-atlas.ts
- artifacts/apex-finder/src/lib/use-atlas-run.ts
- artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts
- artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts
- artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts
- artifacts/api-server/src/src/lib/atlas-control-decision.ts
- artifacts/api-server/src/src/lib/case-bureau.ts
- artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts
- artifacts/api-server/src/src/lib/gemini-model-pool.ts
- artifacts/api-server/src/src/lib/gemini-interactions-transport.ts
- artifacts/api-server/src/src/lib/gemini-transient-retry.ts
- artifacts/api-server/src/src/lib/provider-error-diagnostics.ts
- artifacts/api-server/src/src/lib/agentic-execution-context.ts
- artifacts/api-server/src/src/lib/agentic-web-research-core.ts
- artifacts/api-server/src/src/lib/bureau-agentic-pass.ts
- artifacts/api-server/src/src/lib/contact-validation.ts
- lib/db/src/schema/research_cases.ts
- research event/session/run/evidence/entity schemas
- artifacts/api-server/src/src/routes/system-status.ts
- trace routes and durable event readers
- relevant Gemini, Investigator, context, retry, model-pool, and API tests

Never infer current behavior from this volume without checking source.
