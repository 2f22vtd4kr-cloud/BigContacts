# ⭐ APEX ATLAS SEQUENTIAL AUDIT — FRESH PROJECT RUN 03

**Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-18_FRESH_PROJECT_RUN_03.md`  
**Status:** OPEN — setup verified; no live research job has been launched yet.  
**Audit opened:** 2026-10-18T18:26:18Z  
**Branch / source:** `main` / `5720812017a0139498c9c2ec0b29b96369d64629`  
**Product:** Apex Atlas / BigContacts

## Scope and audit boundary

This report records setup events, observable model inputs and outputs, provider/tool activity, search queries, visited source URLs, durable state changes, errors, recoveries, and concise technical rationale summaries in chronological order. It does not reproduce hidden chain-of-thought or secret values. Personal contact values are redacted in this tracked report; source URLs, field types, provenance, and admission decisions may be recorded so the result remains auditable without publishing personal contact details.

The run must follow the repository's model-led control flow and evidence/admission rules. No forced search itinerary, fabricated result, synthetic contact, silent provider/key rotation, or manual card insertion is permitted. A provider failure remains a failure unless the existing typed recovery flow records a valid recovery.

## Pre-run setup record

1. **Repository access:** cloned the public repository from the supplied URL and imported its `main` source. The initial checkout is shallow; source HEAD is recorded above. No application replacement or generated product code was created.
2. **Import friction:** the first copy attempt could not use `rsync` because it was unavailable. A subsequent cleanup stopped at a protected `.conversation` mount. The source was then copied with an archive-based transfer; the imported Git working tree was confirmed clean. No source files were lost.
3. **Dependencies:** `pnpm install --frozen-lockfile` completed successfully.
4. **Secrets:** presence-only checks confirmed all 13 repository-required secret names are set. Secret values were neither read nor recorded.
5. **Database:** before schema setup, the development database had zero public tables. The repository's documented one-time initializer created the schema; its required-table check passed, and migration 004 reported zero legacy rows corrected. Post-setup read-only check: 16 public tables, zero entities.
6. **Build and runtime:** repository frontend/API build checks and `pnpm run typecheck` passed. The canonical API workflow is running on port 8080; `/` and `/api/healthz` returned HTTP 200. Health reported Redis `ok` and `researchKeysConfigured=true`.
7. **Baseline:** the desk showed zero entities, assets, relationships, or priority profiles. No Apex launch or live provider research was started during setup.
8. **Pre-existing audit setting found:** the imported configuration pointed model-request capture at the prior `FRESH_PROJECT_RUN_02` report and enabled contact-data capture. Before this run, that destination must be changed to this report and contact-value capture disabled; visible prompt/output capture may remain enabled only with secret and private-reasoning filters active.

## Run log

_Append each event here immediately. Include the timestamp, action, observable result, durable identifiers, and a concise rationale or correction. Distinguish model/tool activity from admitted evidence and cards._

