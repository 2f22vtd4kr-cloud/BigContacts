# Live implementation finding — Dig provider starvation (2026-08-30)

## Observed failure

Live audit run 153 (`3f7d9696c26c700cb315e016c6c2de9b6f7ff09d`) built successfully and entered the canonical discovery-first route, but completed with **0 entities** and only **2 searches / 0 visits** across the ten requested discovery slots. The final health state was `bureauIntegrity=critical` because the last agentic LLM step failed across configured providers.

The trajectory contained long sequences of `llm_wait` spans. The active model that did complete a decision was NVIDIA NIM, while Gemini preflight was unavailable/429 and Groq/NVIDIA preflight were both healthy.

## Root cause

The repository source of truth for `agentic-web-research.ts` still contained a module-global provider circuit and a two-stage provider strategy:

1. Gemini + NVIDIA in parallel;
2. only after both failed, Groq + Mistral.

A build-time hardening script rewrote that source before every API build. The hardening had a 55-second provider decision deadline. This meant that when the first-stage providers were slow/unavailable, concurrent discovery slots could spend most of the live audit waiting for provider decisions before the healthy Groq fallback was reached. The build mutation also meant the committed TypeScript source did not itself express the runtime behavior being tested.

This was an orchestration/provider-capacity failure, not evidence that free-ReAct discovery should be replaced with a scripted research path.

## Correction

The build-time hardening now installs an explicit Dig-only failover chain:

`Groq → Mistral → Gemini → NVIDIA`

with:

- bounded concurrent provider-decision slots (`4` by default);
- an 18-second deadline per provider attempt;
- no module-global cross-target provider circuit;
- explicit comments distinguishing Dig failover from the canonical **Boss = Gemini / Right-hand = NVIDIA** architecture.

The runtime invariant checker now verifies the canonical Dig chain, the bounded deadline, concurrency guard, and absence of the old global circuit.

## Architectural consequence

Provider fallback is a transport/capacity mechanism for the Dig capability. It must not be described as the Bureau's leadership hierarchy. Gemini remains Boss; NVIDIA remains right-hand; the Dig investigator may use the configured Dig failover chain.

## Validation rule

The next live ten-target run must be judged on actual research output and trajectory, not merely completion. A green build or successful provider preflight is insufficient. We need source-backed candidates, visits, evidence, and non-empty cards before treating the provider fix as successful.
