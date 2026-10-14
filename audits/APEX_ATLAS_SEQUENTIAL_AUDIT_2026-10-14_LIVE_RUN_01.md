# Apex Atlas Sequential Audit — 2026-10-14 Live Run 01

**Status:** In progress — setup and pre-launch baseline verified; UI-equivalent default launch is next.  
**Started:** 2026-10-14, Europe/Kyiv  
**Repository:** `https://github.com/2f22vtd4kr-cloud/BigContacts`  
**Branch / commit:** `main` / `955b0cc97c04313cb247ce33e67ea3b4ee4393a3`  
**Environment:** New Replit development project; development database only  
**Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_01.md`  
**Visibility:** Saved in the ordinary `audits/` directory. This path is not gitignored and is not in a private-audits directory.

## Audit purpose and evidence boundaries

Trace one standard, unseeded launch matching the UI's default “Launch Apex Atlas” action through discovery, model-directed research, evidence-backed admission/card creation, and terminal state. Record the sequence as it occurs: observable application model requests, visible structured model outputs and control decisions, selected Investigator capability, actual tool inputs/results, public source URLs and relevant excerpts, durable identifiers and state transitions, failures, and any recovery.

The user requested internal model thoughts. This audit records the exact allowlisted application request bodies captured by the repository's development-only prompt-audit hook and the model's observable structured decisions/actions. Provider requests set `include_reasoning=false`; hidden private chain-of-thought is not requested or available and will not be reconstructed. Summarize decisions using their emitted structured reason/action and corroborating application events.

The request-body hook excludes authorization headers and non-allowlisted request fields. Never record secret values, cookies, session material, or database connection strings. Keep raw research content limited to relevant public search text, source excerpts, and URLs; record a contact value only when observed in a public source and correctly scoped/attributed by the application. Do not add unrelated personal data.

## Setup record

### S-001 — Repository import and environment

- The supplied GitHub repository is checked out on its canonical `main` branch at `955b0cc97c04313cb247ce33e67ea3b4ee4393a3`; `origin` tracks the repository's `main`.
- Initial connector access in the preceding setup turn failed token validation. In this project, the authorized GitHub connection was found and bound; Git CLI fetch/checkout then succeeded. No GitHub credential was requested.
- The Replit starter workspace was replaced by the repository checkout. No application source code was generated or changed for this audit.
- Setup verification: Node `v22.22.0`; `pnpm install --frozen-lockfile` passed; full `pnpm run typecheck` passed; `pnpm run check:no-force-dig` passed; repository preflight passed.

### S-002 — Secrets and database

- Preflight confirmed the 13 requested provider-secret names are present. Secret values were not read, printed, or copied into this file.
- The new development database had zero public tables before first-time setup. The repository's documented one-time `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` completed, including durable hardening and migrations 002–004; required-table verification passed. Migration 004 corrected zero legacy rows. Schema mutation was not retained for normal boot.
- Pre-launch read-only counts at 2026-10-14T02:51Z: `entities=0`, `research_cases=0`, `research_case_events=0`, `research_evidence=0`, `contact_evidence=0`, `research_run_events=0`, `research_sessions=0`.
- No previous run's case/job IDs or database rows are being treated as current. This development database is fresh.

### S-003 — Build and runtime readiness

- The canonical `artifacts/api-server: API Server` workflow builds the repository's bundled Apex Atlas desk and API through `bash scripts/replit-boot.sh`; the desk is served at `/` and API at `/api/`.
- The repository build and embedded architecture checks completed during workflow startup. The preview rendered the actual desk UI.
- Readiness at 2026-10-14T02:51Z: `/api/healthz` returned HTTP 200, `status=ok`, Redis `status=ok`, and `researchKeysConfigured=true`; `/api/system/status` reported `bureauIntegrity=ok` and Postgres/Redis ready. These are readiness checks, not proof of provider quota or research success.
- `GET /api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`. No current run is active.
- The application explicitly disables app-level operator authentication in this Replit configuration. Do not publish or expose the operational API to an untrusted audience during this audit.

## Prior Replit run review and carry-forward

- Reviewed `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-13_LIVE_RUN_01.md` and `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-13_LIVE_RUN_02.md`.
- Do not repeat the earlier agent's mistaken request for an operator-supplied discovery seed. The user explicitly requested the UI-equivalent default launch; the previous audit records that the intended discovery test is unseeded and self-directed.
- The 2026-10-13 run 01 failed before a usable second Investigator pass at prompt preparation after scope-guard feedback. It produced no admission/card and was not a provider-quota failure. Current `main` contains the prompt-overflow fix (`adad2778` and later commits); the current API build/typecheck passed.
- The 2026-10-13 run 02 used the unseeded UI default and made real searches/visits, but admitted no candidate. It ended incomplete after a malformed `parallel_registry_search` action omitted required `searches`; replay also found event-iteration regressions. No Groq hard-quota 429 was observed; the page-fetch failures were attributed to Scrapfly/external fetch, and malformed model output was classified as `json_validate_failed`/`invalid_contract`, not quota exhaustion.
- Current `main` includes action-specific parse-recovery guidance and monotonic event-iteration persistence (commit `955b0cc9`). Verify the resulting behavior from this run's events; do not assume the fixes worked solely because the build passed.
- Do not retry a run merely to probe quota, force queries/targets/tools, bypass scope or evidence gates, or count a summary as a card. Prove a fresh admission from the development-ledger delta and its durable evidence/provenance.
- Investigator capability changes are permitted only through the existing architecture: on an explicitly classified hard request-quota exhaustion, Groq Boss may select an available Investigator capability and the assignment must be durably recorded. No silent rotation, cross-role substitution, or switching for token-window limits, transient 429s, HTTP 413, malformed output, external fetch errors, Redis failures, or local exceptions.

## UI-equivalent launch contract

The current UI helper's default request is:

```json
{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}
```

It contains no `singleTargetId`, operator target, market seed, search query, or tool sequence. The canonical endpoint is `POST /api/ingest/atlas-run`. The request will be sent once through the API boundary, matching the UI button behavior; the active-job lease and durable job status remain authoritative.

## Sequential run journal

No launch request has been sent in this audit yet. The current baseline is idle and empty. The development-only prompt capture has been pointed at this file and must be confirmed after restarting the canonical workflow. Append timestamped observations as actions occur. Preserve failures before making any fix or recovery attempt.

