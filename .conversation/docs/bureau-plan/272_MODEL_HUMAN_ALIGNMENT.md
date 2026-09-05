# Batch 272 — Model/human research alignment

Date: 2026-08-30

## Why this batch exists

The live GitHub Bureau audit against the current `main` build exposed an important distinction: the free-ReAct discovery path was structurally correct, but the model could still make low-value research decisions. The previous live run did **not** chase Forbes or billionaire lists; instead it chose two sensible business-oriented searches and then stopped without inspecting a promising result, producing zero candidates.

That is a model-usage/prompting problem, not a reason to add a deterministic discovery playbook.

## Implemented

### Discovery role
- Discovery no longer prepends a second investigator role over the generic agentic-dig orientation.
- The discovery assignment explicitly defines the task as choosing a person for later research, not researching a pre-supplied person.
- The model is instructed to optimize for information gain and practical public reachability rather than fame or net worth.
- Forbes/Bloomberg/richest/billionaire lists are explicitly treated as low expected-value discovery routes. If encountered incidentally, the model should pivot to the underlying company, principal, filing, transaction, office, intermediary, or other concrete public surface.
- Search results are explicitly treated as leads. When a result looks plausibly useful, inspecting it before issuing another broad search is recommended as a judgment principle, not enforced as a hop.
- `done` is framed as appropriate after evidence is exhausted or a source-backed person is found, not merely because the latest search was noisy.

### Target dig
The target-contact prompt now emphasizes:
- attributable and realistic routes rather than fame/wealth;
- primary company/filing/leadership/operating-company evidence;
- evidence-led pivots instead of repeated broad searches;
- no generic contact-form hunting before a useful identity surface is established;
- model-owned tool choice and stopping point;
- exact source URLs and organization-vs-person scope.

### Safety boundary
The deterministic discovery gate remains identity/provenance only: person-shaped name, exact HTTP(S) provenance, and rejection of obvious generic/title/list-only identities. It does not rank candidates by wealth, fame, or an HNWI score.

## Live evidence from audit run 42

- Build, desk build, API build, no-force-dig, free-ReAct, discovery-quality, trajectory, and comparison-contract checks passed.
- Health was `bureauIntegrity=ok`; Redis became connected after explicit Launch; the active agentic model was `openai/gpt-oss-120b`.
- The model chose two non-Forbes discovery searches:
  - `private company founder interview 2023 "family business"`
  - `"acquired a majority stake in" "founder" "CEO" 2024 press release`
- No legacy Phase 0/template markers or billionaire/Forbes drift appeared.
- The agent stopped after two searches without visiting, so zero candidates were admitted. This was the reason the audit failed its entity requirement.

## Design rule

Do not repair this failure by adding a fixed query list, forced visit after search, Forbes blacklist in the tool router, ranking gate, or scripted target lane. The model must own the research path. The harness may only enforce lifecycle, provenance, identity safety, budgets, and persistence integrity.
