# Apex Atlas — Research Architecture Review & Implemented 2026-10-01 Batch

## Why this exists

This review deliberately looks beyond any single provider. Apex Atlas is a research organism whose models are interchangeable cognitive components inside a deterministic evidence and tooling substrate.

The implementation target is **maximum research quality per free-tier call**, not maximum model count or paid-provider usage.

## Current research-field findings incorporated

### 1. Persistent strategic browsing is the capability to optimize

OpenAI's BrowseComp work shows that hard browsing tasks require persistence, strategic search-path selection and synthesis; simply attaching a search tool to a model produces a much smaller gain than a model/system that can reason about the search trajectory. Best-of-N also materially improves verification when answers are independently checkable.

Implication for Apex: preserve Investigator-owned trajectory and make the state explicitly represent what remains unresolved, rather than adding a rigid sequence of searches.

### 2. Separate knowledge state from presentation state

ICML 2026 DualGraph separates a knowledge graph from an outline/report graph and uses graph topology to generate targeted exploration. Apex already has a durable evidence/claims/hypotheses/contradictions layer; the practical lesson is to treat that graph as the research memory and keep prompt presentation selective.

Implemented now:
- bounded Investigator context exposes a **research frontier** derived from durable trajectory;
- repeated source-family saturation is surfaced as a signal to change evidence family;
- frontier guidance is advisory, never a scripted route.

### 3. Retrieval should be filtered before expensive reasoning

Anthropic's 2026 dynamic filtering work demonstrates that search/fetch pipelines can filter material before it reaches the reasoning context, improving both accuracy and token efficiency.

Apex already has passage filtering and bounded context. The new frontier layer complements that rather than increasing prompt size.

### 4. Citation/evidence quality is statement-level

DeepTRACE and related 2026 work show that citation presence alone is insufficient: systems can cite sources while leaving claims unsupported or overconfident.

Apex therefore continues to treat observed URL, source passage, claim, identity attribution, contact scope, and source family as separate concepts. The new source-independence signal makes corroboration more meaningful without replacing deterministic admission.

### 5. Training-free orchestration is valuable

Recent open research demonstrates meaningful gains from better scaffolding, memory, retrieval and verification without retraining the base model.

Apex should therefore prefer:
**better state → better routing → better search diversity → better verification → better stopping**
over adding paid models.

## Implemented batch

### research-policy.ts

Adds deterministic, model-independent primitives:

- scoreSourceIndependence
- assessResearchFrontier
- scoreResearchAction

The action utility combines expected information gain, success probability, source independence, contradiction value, contact relevance and cost.

The scores are advisory signals. They do not override Investigator autonomy.

### Investigator context

The bounded context now includes:
- recent action outcomes;
- repeated source-family signals;
- whether identity/contact evidence is still sparse;
- an explicit information-gain instruction.

This is a lightweight implementation of knowledge-gap-driven exploration.

### Evidence intelligence

The Intelligence Engine now exposes:
- frontier;
- sourceIndependence.

This makes source diversity more than a raw count.

### Contact attribution

Contact evidence keys are now scoped by:
vector + attributed person + normalized value

instead of only:
vector + value

This reduces the risk of treating the same public email/phone/social value as proof for multiple people.

Feedback still resolves all matching value records so stale/rejected/verified feedback remains truthful.

## What was deliberately NOT implemented

- No Gemini-only redesign.
- No Gemini replacement of Groq/Mistral Investigator.
- No paid API.
- No rigid search sequence.
- No fake parallel research in the canonical sequential path.
- No automatic promotion from model confidence.
- No deletion of durable history to save context.
- No assumption that repeated domains are independent corroboration.
- No new security-sensitive network capability.

## Next architecture layer

After this batch passes all gates, the next evidence-backed improvements should be measured rather than guessed:

1. episode-level oversight instead of unconditional per-action oversight where the existing control loop permits it;
2. targeted verification escalation for only high-value unresolved claims;
3. explicit atomic claim/evidence bindings with source passages;
4. learned action-yield statistics from actual Apex runs;
5. benchmark-driven comparison of provider/model routing under equal free-tier budgets.

The correct objective remains **information gained per unit of latency/provider budget while preserving evidence truthfulness**.

## Research references

- OpenAI BrowseComp and Deep Research: persistent, strategic browsing and iterative synthesis.
- Microsoft / PMLR ICML 2026 DualGraph: knowledge-graph-driven gap discovery and separation of knowledge memory from presentation structure.
- Anthropic dynamic filtering: pre-reasoning retrieval filtering for efficiency.
- Microsoft Research DeepTRACE: statement-level citation/evidence auditing.
