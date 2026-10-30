# Apex Atlas Successor Handoff — Current Main Index

**Updated:** 2026-10-30  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Current handoff:** [22 — 30 October 2026](./22_MASTER_SUCCESSOR_HANDOFF_2026-10-30.md)

## Source-of-truth rule

The executable repository at the latest verified `main` SHA outranks every handoff, README paragraph, audit, or historical migration note. This index and handoff 22 are the current ownership-transfer documents. Refresh GitHub `main`, PRs, and Actions before acting; never rely on a SHA copied from an earlier handoff.

## Mandatory current reading

1. `README.md`
2. `docs/context.md`
3. `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`
4. `docs/BUREAU_REACT_ARCHITECTURE.md`
5. `docs/RUN_BUREAU.md`
6. `docs/REPLIT_NEW_ACCOUNT_SETUP.md`
7. `docs/apex-atlas-handoff/22_MASTER_SUCCESSOR_HANDOFF_2026-10-30.md`
8. The newest actual job-bound audit under `audits/` — distinguish a live run from preflight, fixture, or jobless validation telemetry.

## Current architecture law

- Groq Boss owns case direction and Investigator-capability selection.
- Groq Right-hand provides independent, bounded oversight; it does not browse or select Investigator tools.
- The selected Groq Investigator capability owns research strategy, hypotheses, queries, source selection, tool choices, pivots, falsification, and stopping.
- Tools are optional capabilities, never a universal recipe or fixed sequence.
- Python OSINT tools are exposed to a turn only after fresh signed worker attestation, independently pinned immutable worker/proxy images, and the isolated egress contract pass.
- The model decides whether an attested tool is useful. The runtime decides whether it is available and safe to execute.
- Deterministic runtime gates protect authorization, scope, network safety, provenance, identity attribution, evidence admission, persistence, cancellation, budgets, and truthful terminal state. They must not become semantic scripts that decide research strategy or hard-code a blacklist of plausible names.
- Search results and worker outputs are leads. A fetched page is not automatically a finding; a finding is not an admitted candidate; an admitted candidate is not a card until durable persistence and UI projection agree.
- Unknown or insufficient evidence is a valid outcome. No invented people, ownership, contacts, source URLs, or fabricated tool activity.

## Current UI truth

- The manual and System Status page must show only canonical Groq roles and active search capabilities.
- The launch header control has no aim/crosshair glyph.
- Data Sources reports the actual `pythonTools` availability map returned by `/api/system/status`, including SpiderFoot. It must not suggest local pip installation for the isolated remote worker.
- A worker tool marked unavailable is not connected to that runtime. Do not conceal this or bypass attestation to make it appear available.

## Historical volumes

The following are preserved for chronology and migration history, not current provider contracts or run instructions: `02_GEMINI_CONTROL_PLANE.md`, `18-mistral-right-hand-migration.md`, `19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md`, `20_MASTER_SUCCESSOR_HANDOFF_2026-10-17.md`, and `21_SUCCESSOR_HANDOFF_2026-10-19_PR715.md`. Their current-state sections are superseded by handoff 22, `docs/context.md`, and executable `main`.
