# Context addendum — 31 August 2026, live recovery

This addendum is intentionally append-only because `docs/context.md` is a large historical living handoff and must not be rewritten from a truncated connector view.

## Current repository truth

- Current `main` tip: `05a699eac5eed77482ad1bbd425697bca7cb0084`.
- Canonical architecture remains **Gemini = Boss**, **NVIDIA NIM = Right Hand**, **Groq → Mistral = Dig/investigator**.
- No credentials are recorded here.

## Latest real 10-target evidence

The provider-backed run `33402713023` completed the Bureau loop but failed the research-quality audit. Artifact facts: 0 entities, 0 admitted candidates, 0 contacts, 19 searches, 16 visits, Qwen3.8-27B, `degraded=true`. This is a genuine failure and is retained as such.

## Recovery applied

1. Discovery admission now accepts an explicitly named `personName` or explicit `person:` finding from an organization-scoped source. This fixes the semantic distinction between *evidence scope* and *person identity* without admitting generic organization facts.
2. ReAct `done` findings are now summarized into the trajectory for forensic inspection. This is observability only; it does not bypass identity/provenance admission.
3. The resilient live-audit trigger has been touched on the current main tip so a new real provider-backed run executes the repaired source.

## Required next proof

Do not call the new run green from launch/build/preflight. Collect the terminal artifact, inspect the model-declared findings and visited-source evidence, inspect every admitted candidate/card, then run the independent blind OpenAI comparison for the same targets.

## Comparison law

Apex is evaluated against an independent single-LLM research pass. No Apex hypothesis, trajectory, card, or evidence may leak into the baseline. Research truth, identity precision, provenance, contact-route honesty, and practical reachability are the scoring basis.
