# Volume 434 — Provider Role and Source-of-Truth Correction

**Date:** 2026-08-30  
**Status:** binding living-plan correction  
**Supersedes:** Volume 433 where provider-role wording conflicts

## Finding

Apex has four distinct concerns that must not be collapsed into a generic “LLM provider” concept:

1. **Boss / Head Investigator — Gemini**
2. **Right-hand Advisor — NVIDIA NIM**
3. **Investigator / Dig — Groq → Mistral**
4. **Tools — web and OSINT executors selected by the investigator model**

Gemini and NVIDIA do **not** conduct the web research. They reason over case state. The Dig investigator is the actor that searches, visits pages, chooses OSINT tools, forms hypotheses, pivots, verifies evidence, and stops.

## Why this matters

The distinction is architectural, not cosmetic. If a Dig fallback silently calls Gemini or NVIDIA, the runtime has changed the actor responsible for research. That makes telemetry misleading, invalidates provider-quality diagnosis, and can cause a model to be used outside the role for which its prompt and evaluation contract were designed.

Therefore the current canonical statement is:

```text
Boss = Gemini
Right-hand = NVIDIA NIM
Dig investigator = Groq → Mistral
```

The Dig chain is a capability-local availability mechanism. It is not the Bureau hierarchy.

## Source-of-truth rule

The repository contains a historical build-time hardening layer. Until the generated Dig source itself is committed as the canonical implementation, the canonical hardener is `scripts/apply-agentic-concurrency-hardening.mjs`. Any compatibility entry point must delegate to that hardener rather than maintain a second provider implementation.

The old `scripts/apply-agentic-runtime-hardening.mjs` implementation violated this rule by containing a separate provider router that could put Gemini and NVIDIA ahead of the actual investigator providers. It is now only a compatibility delegator.

The runtime invariant must fail if the generated Dig `llmStep` contains:

- `callGeminiJson`
- `callNvidiaJson`
- a `gemini` Dig provider tuple
- an `nvidia` Dig provider tuple

and must require both Groq and Mistral in the Dig lane.

## Research freedom is unchanged

Removing Gemini/NVIDIA from the Dig provider lane is **not** a restriction on research judgment. The investigator model still chooses:

- whether to search;
- what query to issue;
- which result to inspect;
- whether to visit or browser-fetch;
- which OSINT tool to invoke;
- what hypothesis to pursue;
- when to pivot;
- whether to corroborate;
- when to stop.

The provider layer only determines which model can make that decision. Deterministic code still enforces safety, budgets, provenance, integrity, and persistence.

## Evaluation consequence

Every trajectory must record role and provider separately. A valid trace should be interpretable as:

```text
role=boss provider=gemini       -> case direction
role=right_hand provider=nvidia -> advisory critique
role=dig provider=groq          -> web-research decision
role=dig provider=mistral       -> web-research decision after failover
```

A run in which Gemini or NVIDIA appears as the Dig provider is a **provider-role violation**, regardless of whether the final card happens to look good.

## Next implementation gate

Before claiming the provider-role correction is fully complete, run:

1. static runtime invariant checks;
2. API build, including the canonical hardener;
3. trajectory fixture checks;
4. a provider-backed single-target Dig run when valid credentials are available;
5. a ten-target batch only after the single-target trace demonstrates actual model-selected research actions and source-backed evidence.

Do not call a green static check a research-quality pass.
