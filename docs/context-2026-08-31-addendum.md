# Context addendum — 31 August 2026, live recovery

This addendum is intentionally append-only because `docs/context.md` is a large historical living handoff and must not be rewritten from a truncated connector view.

## Current repository truth

- Current `main` tip: `ab16e8e7ab6ff8ebec0ce105ce929a222975d607`.
- Canonical architecture remains **Gemini = Boss**, **NVIDIA NIM = Right Hand**, **Groq → Mistral = Dig/investigator**.
- No credentials are recorded here.

## Latest real 10-target evidence

The provider-backed run `33402713023` completed the Bureau loop but failed the research-quality audit. Artifact facts: 0 entities, 0 admitted candidates, 0 contacts, 19 searches, 16 visits, Qwen3.8-27B, `degraded=true`. This is a genuine failure and is retained as such.

## Recovery applied

1. Discovery admission now accepts an explicitly named `personName` or explicit `person:` finding from an organization-scoped source. This fixes the semantic distinction between *evidence scope* and *person identity* without admitting generic organization facts.
2. ReAct `done` findings are now summarized into the trajectory for forensic inspection. This is observability only; it does not bypass identity/provenance admission.
3. A regression test now covers organization-scoped named-person admission and requires the cited source to have actually been visited.
4. The discovery hardener resolves repository paths from its own script location, because API package builds execute with `artifacts/api-server` as the working directory.
5. The resilient live-audit trigger has been touched on the current main tip so a new real provider-backed run executes the repaired source.

## Build incident

Run `33408605584` was a genuine pre-launch build failure caused by the first version of the new hardener resolving `artifacts/api-server/src/...` relative to the package working directory. The failure was isolated from product/research quality and fixed before the next trigger. It must not be counted as a research result.

## Current live run

Run `33408734065` is the current provider-backed audit. At the latest verified state it has passed dependency installation, local services, API build, static autonomy checks, provider preflight, API startup, and the real 10-target discovery-first launch. **Poll Bureau remains in progress.** No quality verdict has been asserted.

## Required next proof

Do not call the current run green from launch/build/preflight. Collect the terminal artifact, inspect the model-declared findings and visited-source evidence, inspect every admitted candidate/card, then run the independent blind OpenAI comparison for the same targets.

## Comparison law

Apex is evaluated against an independent single-LLM research pass. No Apex hypothesis, trajectory, card, or evidence may leak into the baseline. Research truth, identity precision, provenance, contact-route honesty, and practical reachability are the scoring basis.
