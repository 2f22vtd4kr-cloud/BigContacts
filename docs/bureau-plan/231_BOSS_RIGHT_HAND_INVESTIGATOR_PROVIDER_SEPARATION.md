# Volume 231 — Boss / Right-Hand / Investigator Provider Separation

**Status:** normative architecture correction for the living 40K plan
**Date:** 2026-09-06

## Purpose

The models that provide Bureau-level reasoning are not the same architectural role as the systems that conduct web research. The investigator role must remain open to multiple LLM adapters and multiple external research capabilities.

## Canonical architecture

```text
                         CASE / MISSION
                              |
                              v
                     +-------------------+
                     |       BOSS        |
                     |      Gemini       |
                     | strategy /        |
                     | priorities /      |
                     | stopping /        |
                     | evidence demands  |
                     +---------+---------+
                               |
                         case direction
                               |
                               v
                     +-------------------+
                     |    RIGHT-HAND     |
                     |    NVIDIA NIM     |
                     | challenge / gaps |
                     | alternate angles  |
                     +---------+---------+
                               |
                     investigator brief
                               |
                               v
                +-----------------------------+
                | ACTUAL WEB-RESEARCH         |
                | INVESTIGATOR / DIG MODEL    |
                | configurable LLM pool       |
                |                             |
                | model chooses:              |
                | search / visit / browser /  |
                | registry / OSINT / pivot /  |
                | hypothesis / stopping       |
                +--------------+---------------+
                               |
                  +------------+-------------+
                  | research capability pool |
                  | Serper / Tavily / Exa     |
                  | Scrapfly / ZenRows / ... |
                  +------------+-------------+
                               |
                               v
                         observations
                               |
                               v
                    evidence + identity graph
                               |
                               v
                          entity/contact card
```

## Non-negotiable role rules

### Boss — Gemini

Boss is the head strategic reasoning layer. It may interpret the mission, prioritize cases, formulate investigator goals and evidence requirements, and decide whether evidence is sufficient. Boss must not directly browse or replace the investigator merely because an investigator adapter is unavailable.

### Right-hand — NVIDIA NIM

Right-hand is the complementary reasoning/advisory layer. It may challenge hypotheses, identify evidence gaps and propose alternate research angles. It must not directly browse or impose a numbered research sequence.

### Investigator / Dig — actual web researcher

The investigator is the model that conducts the research. It owns query formulation, result selection, page visits, browser escalation, registry/OSINT tool choice, hypothesis formation, pivots, identity investigation, contact-route investigation, evidence depth and stopping.

The investigator provider pool is **provider-neutral**. It is not defined by a two-vendor chain. Groq and Mistral are supported investigator LLM adapters in the current implementation; additional investigator LLM adapters may be added without changing the role contract.

The research/search/fetch pool is separate from the investigator LLM pool. Providers such as **Tavily, Exa, Serper, Scrapfly, ZenRows**, registry APIs and OSINT tools are capabilities the investigator can select. They are not substitutes for the investigator model itself.

If the configured investigator LLM pool is unavailable, the bureau must fail closed or report degraded research. It must not silently change the Boss/right-hand role or invent evidence.

## Why this separation matters

A provider name is an implementation detail, not an architectural identity. Hard-coding a vendor pair into the role creates false constraints and makes the system look as if Tavily/Exa/Scrapfly/etc. are secondary when they are actually first-class research capabilities.

Provider fallback is transport infrastructure, not hierarchy. The same objective/state is passed to whichever configured investigator adapter is selected, and that adapter independently chooses its next research action.

## Autonomy requirement

The investigator still receives a mission, case state, evidence requirements and available tools, then independently chooses the next action. The harness may enforce budgets, timeouts, provenance, permissions, malformed-action rejection, persistence integrity and provider health. It must not choose the next useful research move merely because a particular provider is unavailable.

## Evaluation consequence

Every trajectory should record, when applicable:

- Boss model/provider;
- right-hand model/provider;
- investigator model/provider and adapter;
- provider selection/fallback reason;
- selected tool/action and research-provider backend;
- observation;
- resulting evidence;
- promoted identity/contact claims.

A run in which Gemini or NVIDIA performs actual web research without an explicit investigator-adapter configuration is an architecture/infrastructure failure, not a successful investigator run.

## Relationship to the 40K plan

This document supersedes wording that describes `Groq -> Mistral` as the definition of the investigator role. That phrase may describe a temporary current implementation configuration in an implementation log, but it is not the architecture. The architecture is **investigator LLM capability pool + model-selected research capability pool**.
