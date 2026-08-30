# Live Failure Postmortem — Discovery Batch / Investigator Separation

**Date:** 2026-08-30
**Status:** active corrective specification
**Scope:** Apex Atlas discovery-first Bureau

## 1. Observed production-like failure

Live Bureau Audit run `33329789604` built successfully and passed the static autonomy/provenance checks, then launched a real ten-slot discovery-first Bureau with configured Gemini, Groq, and NVIDIA providers.

The provider preflight proved real generation capability: Gemini returned HTTP 200, Groq returned HTTP 200, and NVIDIA returned HTTP 200. Mistral was not configured in that environment.

The live Bureau nevertheless completed with zero entities. Its recorded state showed one actual model-selected search (`2023 acquisition of private manufacturing company CEO interview`), zero visits, zero admitted entities, and `degraded=true`. The audit correctly failed rather than calling this a success.

This is an important distinction: **the model did make a real research choice, but the Bureau did not convert the resulting research into a truthful candidate/card.**

## 2. Root causes identified

### 2.1 Candidate admission lost the trajectory

The concurrent discovery batch called:

`parsePersonFindings(result.findings ?? [])`

but the identity admission boundary intentionally requires evidence that the candidate's source URL was actually visited. Without the trajectory argument, `hasObservedPageSource(...)` necessarily fails closed.

This created the exact kind of upstream/downstream boundary mismatch the project is intended to eliminate: the research layer could produce a useful finding, but the promotion layer lacked the state required to prove it.

The correction passes `result.trajectory` into candidate admission.

### 2.2 Ten discovery slots entered the agentic provider layer simultaneously

The discovery batch controller launched ten independent model runs at once. That is acceptable as a logical batch, but it is not acceptable as an unconstrained provider burst. The underlying investigator loop already has a provider-decision concurrency bound; ten concurrent research loops could still create unnecessary contention and correlated failures.

The correction adds a separate bounded concurrency semaphore around complete agentic research runs. The default is four concurrent runs and is configurable through `APEX_AGENTIC_CONCURRENCY`.

This is a resource-integrity guard, not a research playbook. Each admitted run retains complete model control over search, visit, OSINT tools, pivots, evidence gathering, and stopping.

### 2.3 Health state is process-global

`agentic-llm-health.ts` currently stores only `lastOk`, `lastModel`, and `lastError`. Concurrent investigator runs can therefore race while updating this state. One failed model step can overwrite a successful step from another concurrent target and make the Bureau appear globally degraded.

This is not yet treated as a resolved research-quality issue. The next corrective pass must make health telemetry job/run scoped or otherwise concurrency-safe. A global "last step" is not a valid representation of a multi-target autonomous Bureau.

## 3. What this proves

The failure does **not** justify adding more forced research hops.

It proves that the autonomy architecture can generate a genuine model-selected action while the surrounding state/promotion system can still destroy the result.

Therefore the debugging rule remains:

> When a live Bureau loses to a cleaner primary-source path, locate the exact boundary where useful evidence was lost before changing the model's research freedom.

## 4. Corrective invariants

1. A candidate admission function that requires visited-source evidence must receive the actual trajectory.
2. Logical batch size and provider concurrency are separate controls.
3. Provider concurrency limits must never dictate query order, source order, hop count, or stopping behavior.
4. Health telemetry must distinguish per-run failure from global provider availability.
5. A successful live provider preflight is not evidence of successful Bureau research.
6. A completed job with zero truthful entities remains a research-quality failure.
7. Static autonomy checks must be followed by real trajectory inspection.

## 5. Next validation gate

The next live ten-target batch must establish all of the following before any 100-target evaluation is considered:

- investigator models are Groq/Mistral lane only;
- Gemini remains Boss and NVIDIA remains right hand;
- discovery slots are independently model-directed;
- complete agentic runs are concurrency-bounded;
- visited-source evidence reaches identity admission;
- at least one source-backed candidate survives discovery admission;
- final cards retain provenance;
- organization contacts remain distinct from direct personal contacts;
- no hallucinated identity appears;
- trajectory evidence identifies the exact model/tool/action chain;
- a clean run is not counted as a superiority result until compared against the baseline.

## 6. Living-plan update

This postmortem supersedes any plan language implying that a ten-slot discovery batch can safely launch ten complete investigator loops without a resource boundary, and it explicitly records the trajectory-loss bug so it cannot be reintroduced by future batch patches.
