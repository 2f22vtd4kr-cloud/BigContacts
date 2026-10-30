# Apex Atlas — Current System Introduction

**Updated:** 2026-10-30  
**Authority:** current executable `main`, `README.md`, `docs/context.md`, and handoff 22.

## Mission

Apex Atlas is a model-led public-source investigative bureau. Its mission is to find the people behind money — owners, decision-makers, founders, operators, intermediaries, and the public contact routes that can be attributed to them.

It is not a deterministic enrichment script, a fixed identity-to-company-to-email recipe, or a list generator that fills gaps with guesses.

## Core architecture law

> **The models own research strategy. The runtime owns the integrity boundary.**

The Investigator decides what is worth investigating next: hypotheses, queries, sources, tools, pivots, corroboration, falsification, and when to stop. The runtime does not prescribe a universal search itinerary. It enforces the boundaries within which model decisions can be executed safely and audited truthfully.

## Model roles

### Groq Boss

Owns case direction, objective interpretation, high-level continuation/redirection/stopping decisions, and selection of an Investigator capability. It does not browse as the Investigator and cannot manufacture evidence.

### Groq Right-hand

Provides independent, bounded critique of the case state, evidence gaps, contradictions, and whether further work is justified. It is advisory: it does not browse, execute tools, or take over the Investigator's trajectory.

### Groq Investigator

The selected Investigator capability owns the actual research trajectory. It reasons from the institutional mission, the case objective, accumulated evidence, hypotheses, contradictions, and the capabilities made available for that turn. It may search, visit, inspect a registry, use a specialist tool, pivot, falsify, revisit, or stop — whichever is justified.

Configured Investigator credentials are separately selectable capabilities. Selecting one does not silently rotate to a different credential. Model routing inside the selected capability does not replace model-owned research strategy.

## Tool and capability model

Search, browser/fetch, registries, domain inspection, email/username footprinting, and infrastructure tools are capabilities, not fixed phases.

The Investigator chooses among the capabilities actually exposed in its current action schema. A capability is exposed only when its implementation and runtime availability contract say it is callable. A missing capability is omitted, not simulated, and not treated as an empty search result.

### Python-backed OSINT tools

The repository contains worker adapters for Holehe, Maigret, Sherlock, theHarvester, and SpiderFoot. They are not local API-server subprocesses. They execute through a separate isolated worker and public-egress proxy.

They become model-selectable only after the runtime verifies:
- a fresh signed worker attestation;
- independently operator-pinned immutable worker and proxy image digests;
- the required sandbox, network-namespace, and egress-boundary proof;
- that the attestation names the specific available tool.

The turn's action allowlist is authoritative. The Investigator can choose any available specialist tool when it is relevant; there is no mandatory Maigret-before-Sherlock rule or other fixed order. If the worker is not deployed/configured/attested, the tools remain unavailable. CI building the images is not deployment or live attestation.

Worker outputs are untrusted leads. They do not directly establish a person's identity, account ownership, relationship, or contact route and cannot promote a card.

## Runtime integrity boundary

Deterministic code is responsible for:
- authorization, scope, SSRF/egress policy, and capability availability;
- bounded requests, resource budgets, cancellation, and job/target locks;
- parsing and validating structured actions;
- source observation, URL provenance, and exact source-span binding;
- identity attribution, contradiction handling, contact scope, and evidence admission;
- durable case/evidence events, persistence, projections, and terminal-state truth.

These gates must validate evidence and execution integrity, not hard-code the model's research decisions. Do not add a fixed denylist of company names such as generic placeholder strings as a substitute for evidence attribution. A model's proposed claim should advance only when its source and identity support satisfy the evidence contract; unsupported claims remain unpromoted because they lack evidence, not because a string appears on a static blacklist.

## Evidence and card lifecycle

```
objective + institutional role context
  → model-authored hypothesis / next action
  → runtime capability and safety validation
  → actual tool execution
  → observation + provenance
  → model-authored finding / claim
  → deterministic identity, attribution, scope and evidence validation
  → durable evidence/admission event
  → card projection
  → terminal outcome + lock release
```

A search snippet is a lead, not proof. A fetched page is not automatically a finding. A model assertion is not evidence. A worker profile hit is not identity proof. A finding is not an admitted candidate. A candidate is not a durable UI card until the database and projection agree.

Unknown, incomplete, contradicted, and negative findings are legitimate outcomes when supported by the actual research. Runtime errors, unavailable adapters, and blocked actions must remain distinct from genuine no-hit results.

## Current UI/operator truth

The manual and System Status page must reflect the active Groq roles and current search capability pools. Specialist worker availability is read from the canonical system-status endpoint and displayed as attested/unavailable, including SpiderFoot. No UI should suggest installing a local Python package to enable a separately deployed worker. The header Launch control is text-led and does not use an aim/crosshair icon.

## Release standard

Green CI is necessary, not empirical research acceptance. A release requires a fresh canonical Replit build, reconciled active-job state, a real UI-launched run, source-backed findings, correct identity/contact attribution, durable evidence and card projection, truthful failure/terminal status, and lock release. Never report live acceptance based on static checks alone.
