# Volume 231 — Boss / Right-Hand / Investigator Provider Separation

**Status:** normative architecture correction for the living 40K plan
**Date:** 2026-08-30

## Purpose

This document resolves a critical ambiguity found during live-research architecture review: the models that provide Bureau-level reasoning are not the models that conduct web research.

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
                |                              |
                | Groq -> Mistral failover    |
                |                              |
                | model chooses:              |
                | search / visit / browser /  |
                | registry / OSINT / pivot /  |
                | hypothesis / stopping       |
                +--------------+---------------+
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

Boss is the head investigator and strategic reasoning layer.

Boss may:

- interpret the mission;
- prioritize cases;
- decide research direction;
- formulate investigator goals;
- set evidence requirements;
- accept or override right-hand advice;
- decide whether evidence is sufficient.

Boss must not:

- browse the web;
- call web-search or page-fetch tools directly;
- invent evidence;
- replace the actual investigator when the investigator provider is unavailable.

### Right-hand — NVIDIA NIM

Right-hand is the complementary reasoning/advisory layer.

Right-hand may:

- challenge the current hypothesis;
- identify evidence gaps;
- propose alternative research angles;
- recommend a next high-leverage direction.

Right-hand must not:

- browse the web;
- call OSINT tools directly;
- invent evidence;
- impose a numbered research sequence.

### Investigator / Dig — actual web researcher

The investigator is the model that conducts the research.

It owns:

- query formulation;
- result selection;
- page visits;
- browser escalation;
- registry/OSINT tool choice;
- hypothesis formation;
- pivots;
- identity investigation;
- contact-route investigation;
- evidence depth;
- stopping.

The canonical investigator provider pool is independent of Boss/right-hand roles. Current failover is:

`Groq -> Mistral`

If that pool is unavailable, the bureau must fail closed or report degraded research. It must **not** silently use Gemini or NVIDIA as substitute web researchers.

## Why this separation matters

Using Gemini or NVIDIA as investigator fallback creates a hidden architecture change. The same request can become:

- Boss-controlled research;
- right-hand-controlled research;
- actual investigator research;

depending on provider availability.

That makes trajectory comparisons invalid and can hide infrastructure failures as apparent research behavior.

Provider fallback is therefore transport infrastructure, not agent hierarchy.

## Autonomy requirement

Separating the providers does not mean constraining the investigator. The investigator still receives a mission, case state, evidence requirements and available tools, then independently chooses the next action. The harness may enforce:

- budgets;
- timeouts;
- provenance;
- permissions;
- malformed-action rejection;
- persistence integrity;
- provider health.

It must not choose the next useful research move merely because a particular provider is unavailable.

## Evaluation consequence

Every trajectory must record at minimum:

- Boss model/provider, if Boss participated;
- right-hand model/provider, if right-hand participated;
- investigator model/provider;
- provider fallback reason;
- selected tool/action;
- observation;
- resulting evidence;
- promoted identity/contact claims.

A run in which Gemini or NVIDIA performs the actual web research is not a valid run of the canonical investigator architecture. It must be classified as an architecture/infrastructure failure rather than counted toward research-quality superiority.

## Relationship to the 40K plan

This document is a normative correction to the living 40K plan. It supersedes any earlier wording that describes `Groq -> Mistral -> Gemini -> NVIDIA` as a single Dig provider chain. Gemini and NVIDIA remain part of Apex's multi-model architecture, but they belong to the reasoning/control layer. The investigator lane is separate.
