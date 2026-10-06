# Apex Atlas Successor Handoff — Current Main Index

**Updated:** 2026-10-06  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Current architecture:** Groq Boss → Groq Right-hand → selected Groq Investigator capability → model-owned ReAct → deterministic evidence/provenance/promotion/lifecycle rails.

## Source-of-truth rule

The current repository at the verified `main` SHA outranks every handoff document. The documents below contain historical migration/audit records; provider topology described inside an older volume must not override current source.

## Mandatory current reading

1. `docs/context.md`
2. `README.md`
3. `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`
4. `docs/RUN_BUREAU.md`
5. `docs/REPLIT_NEW_ACCOUNT_SETUP.md`
6. `docs/BUREAU_REACT_ARCHITECTURE.md`
7. `docs/apex-atlas-handoff/17-groq-boss-migration.md` (historical migration context only)
8. `docs/apex-atlas-handoff/18-mistral-right-hand-migration.md` (historical migration context only)

## Current non-negotiables

- Groq Boss and Groq Right-hand are the canonical control-plane roles.
- Investigator credentials are separately selectable Groq capabilities; `groq-investigator-1` through `groq-investigator-6` map one-to-one to the six Investigator key slots.
- Selecting an Investigator capability never silently rotates to another Investigator credential.
- Qwen 3.8 27B, GPT-OSS 20B, and GPT-OSS 120B are model routes inside the selected Groq capability.
- Search results/snippets are leads, not claim-grade evidence.
- Multi-source attribution is valid when each cited source is actually observed and the value/identity spans are grounded.
- Models own research strategy; deterministic code owns safety, provenance, persistence, budgets, authorization, and terminal/admission rails.
- No fixed search sequence, forced research hops, synthetic observations, or fake evidence.
- No Replit/Apex live run is implied by static verification.

## Historical volumes

The older numbered handoff volumes remain valuable for incident chronology and migration history. They are not current provider contracts. In particular, `02_GEMINI_CONTROL_PLANE.md`, `19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md`, and other pre-2026-10-06 volumes must be treated as historical wherever they conflict with `docs/context.md` or executable source.

---

