# Apex Atlas — Deep System Introduction

## Product

Apex Atlas is the canonical public-web OSINT research bureau inside BigContacts/Apex Finder. It investigates people and organizations using public information and produces attributable, source-backed findings and contact paths.

It is deliberately not a deterministic enrichment script.

Governing principle:

The model owns research strategy; deterministic software owns safety, authorization, validation, provenance, persistence, cancellation, and resource budgets.

## Architecture

CASE / OBJECTIVE
  -> Gemini Boss + Gemini Right-hand
  -> select Groq or Mistral Investigator
  -> Investigator chooses next research act
  -> validated real capability
  -> observation + provenance
  -> claims / identity hypotheses / contradictions / contacts / negatives
  -> durable case/event/evidence state
  -> Right-hand oversight
  -> Boss disposition
  -> next Investigator act

There is no hidden identity -> company -> LinkedIn -> email recipe. Tools are capabilities. The Investigator chooses the route.

## Gemini Boss

Boss is the control-plane decision maker. It interprets objectives, opens/directs cases, selects the Investigator, reviews progress, and decides continuation/pivot/stop.

Boss must not become the Investigator or invent evidence.

## Gemini Right-hand

Right-hand is independent bounded oversight. It critiques research state, gaps, contradictions and objective alignment and advises control transitions.

Right-hand must not browse or invent evidence.

If required Right-hand oversight is unavailable, Atlas fails closed.

## Investigator

Groq/Mistral is the actual researcher. The Investigator owns query formulation, tool choice, source selection, revisits, pivots, verification/disproof and stopping.

Gemini is not an Investigator fallback.

## Evidence law

Lead, observation, attribution, corroboration and verification are different states.

Search results are leads. Snippets are not proof. LLM prose is not proof. Guessed emails are not discovered contacts.

Durable evidence should preserve URL, provenance, retrieval time, source family/class, extraction/supporting observation, identity attribution and uncertainty.

Organization-level contacts remain organization-scoped unless evidence attributes them to a person.

Unknown or insufficient evidence is valid.

## Safety law

Never seed fake candidates, findings, URLs, contacts, cards or UI events.

Never convert provider/tool failure into success.

Never add scripted research to compensate for provider failure.

Never use Gemini as Investigator fallback.

Never parallelize a canonical sequential target proof.

The Reactor/UI is a projection of canonical state.

## Durable truth

The card/dossier is a projection. Durable state includes case/objective, assignment, provider/model, selected actions, actual execution, observations, evidence/provenance, claims, identity hypotheses, contradictions, contacts, negative findings, oversight decisions and run/correlation IDs.

The latest audit demonstrated an important observability distinction: durable case events existed while the Redis-backed trace endpoint returned zero slots. This discrepancy must be investigated, not hidden.

## Runtime

Canonical API: port 8080.
Desk: /.
API: /api/.
Normal boot: bash scripts/replit-boot.sh.

First-time schema initialization is explicit:
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh

Normal boot must not mutate schema.

## Research quality

Static checks are not empirical research proof. Keep separate system failure, insufficient evidence, wrong answer and correct abstention.

Do not reduce Apex to a single smartness score or model ranking.

## Successor mindset

Establish exact main SHA, study the repository, reproduce the smallest defect, identify the true layer, make the smallest root-cause fix, test narrowly, test broadly, then run live verification. Never declare GREEN prematurely.
