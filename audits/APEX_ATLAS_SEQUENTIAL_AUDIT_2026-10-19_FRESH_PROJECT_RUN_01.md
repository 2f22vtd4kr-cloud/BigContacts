# ⭐ Apex Atlas Sequential Audit — Fresh-project run 01

**Date:** 2026-10-19  
**Status:** Pre-launch reconciliation in progress; no new run has been started  
**Runtime source:** `main` at `f4c5341`  
**Prior run requiring reconciliation:** `8237e1a8-192a-480e-b415-78f24eb94407`

## Audit handling

This is a chronological record of observed setup, runtime, model-visible requests and responses, tool actions, decisions, source evidence, failures, fixes, and outcomes. It records concise diagnostic rationales, not this assistant's hidden chain-of-thought or any provider-private reasoning. Secret values are never recorded. Raw contact values are not copied into this tracked report; when relevant, it will record attribution, contact type, redacted value, and source URL. Public business contact information may be recorded only when clearly published for that business and relevant to the result.

The filename is marked with a star for visibility and is in the repository's normal `audits/` directory, which is not ignored. Any raw provider diagnostic capture, if enabled, must remain run-scoped and credential-filtered; the tracked report will contain sanitized, verifiable checkpoints.

## P000 — Import and startup setup

- Imported the complete public GitHub `main` source at commit `f4c5341`; configured the existing Replit checkout to track `origin/main`. No replacement app was generated.
- Setup issue: `rsync` was unavailable. A first fallback cleanup hit Replit's Git-metadata safeguard after workspace files had been removed, temporarily removing the starter artifact registrations. Recovered from the staged repository, preserved the existing Replit `.git`, fetched and reset to `origin/main`, and revalidated the repository's API and canvas manifests. Both artifacts and workflows were restored.
- Installed dependencies with `pnpm install --frozen-lockfile`; the lockfile was already current.
- First API preview showed HTTP 500 errors on dashboard queries because the new development database had no application tables. Read-only schema inspection confirmed no public tables existed. Ran the repository's explicit `scripts/initialize-apex-schema.sh` against the development database only; required durable tables and invariants were confirmed. No production database was changed.
- After restart, the repository's frontend and API build checks passed. `/api/healthz` and `/api/dashboard/stats` returned HTTP 200, and the root desk rendered without browser errors. The new database has no research records, so zero entity/card counts are expected.
- The 13 requested API-key names were confirmed present through secret-existence checks; no secret values were read or written by the audit.

## P001 — Prior launch evidence from the repository

- The latest tracked upstream report says the UI-default launch of job `8237e1a8-192a-480e-b415-78f24eb94407` was accepted with HTTP 202.
- That report contains no later progress checkpoint, terminal status, final durable evidence/admission/card counts, or post-run active-lock check. This is an evidence gap; it does not prove the job is active, idle, successful, or failed.
- Repository instructions require read-only reconciliation of that job and the active Atlas lock before any new launch. No new launch has been sent in this project.
- Source: `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-19_MAIN_REFRESH_RELAUNCH_01.md` (P011–P013), `README.md`, and `docs/apex-atlas-handoff/20_MASTER_SUCCESSOR_HANDOFF_2026-10-17.md`.

## P002 — UI launch contract

- The inspected UI helper posts to `POST /api/ingest/atlas-run`.
- Its default request is `targetCount=3`, `researchDepth=standard`, and `targetTimeoutMs=420000`, without `singleTargetId`; this enters discovery-first mode.
- No request has been sent. Before any launch, the prior job, active pointer/lock, provider readiness, bureau integrity, database state, runtime commit, and run-scoped audit path must be checked.

## P003 — Read-only prior-job and lock reconciliation

**Checkpoint:** 2026-10-19, approximately 05:40 UTC.

- `GET /api/healthz/details` returned HTTP 200: Redis `ok`; `bureauIntegrity=ok`; no integrity reasons; `registryShallowRisk=false`; `autoPipeline=false`. Runtime capability counts were Groq 2, Groq Right-hand 1, Exa 1, Tavily 1, Serper 1, Companies House 1, Scrapfly 1, and ZenRows 1; Gemini and Perplexity were not configured.
- `GET /api/ingest/job/8237e1a8-192a-480e-b415-78f24eb94407` returned HTTP 200. The Redis job record is terminal `failed`, `outcome=incomplete`, phase 3 of 4, with the message “Canonical Investigator iteration ceiling reached after 20 Investigator iteration(s); case preserved for review.” It started `2026-10-19T04:14:46.565Z` and finished `2026-10-19T04:21:16.274Z`.
- `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false` and `jobId=null`. There is no active Atlas pointer at this checkpoint.
- `GET /api/ingest/atlas-status` returned HTTP 410; this legacy status endpoint is not used as evidence. The exact-job endpoint and active-pointer endpoint above supplied the status.
- Read-only counts in this new project's **development** database were zero for `research_cases`, `research_case_events`, `research_run_events`, `research_evidence`, `entities`, `assets`, `relationships`, `contact_evidence`, `identity_candidates`, and `identity_bundles`.
- This project has a newly initialized development database, separate from the prior project's durable database. The zero counts here do **not** establish the prior job's evidence, admissions, or card totals. The Redis job hash does not expose a case ID in its core status fields; the exact-job response also contains bounded log/result fields that still need safe review.

**Reconciliation state:** prior job terminal/incomplete and current active pointer idle. Historical durable case/evidence/admission/card counts remain unverified because the prior database is not available in this project. Do not attribute the new database's empty counts to the prior run.

### P003a — Safe summary of the prior serialized job result

- The Redis job result identifies prior discovery case `2`. Groq Right-hand completed with approval; Groq Boss completed and selected Investigator capability `groq-investigator-1`. Both control roles reported model identifier `openai/gpt-oss-120b`.
- The visible direction summary focused on UK renewable-energy firms and company-registry ownership records. The first Investigator search instead used the query `wealthy individual investor real estate developer private equity stakeholder site:linkedin.com/in "CEO" "Founder" "investment" "London"`; subsequent Boss directions pivoted to Bavarian manufacturing registries. This is an observed direction/action mismatch, not a conclusion about model intent.
- Discovery completed with 9 searches, 5 visits, and 0 findings. The serialized health summary reported 20/20 Investigator iterations used, 4 successful fetched pages, 43 unfetched search-lead URLs, 3 blocked actions, 1 scope-guard block, 0 unsupported registry actions, 1 action-contract failure, 0 provider rate-limit events, and 0 admitted candidates. The control loop used 3 turns and ended with `stop`; no target was researched and no card was promoted.
- One visible contract failure was a proposed `visit` missing its required `hypothesis`; the record states no outbound request was made for that malformed action. The recent job log also records fetch failures for a Companies House officer page and an Invest in Bavaria article. No Investigator key exhaustion is evidenced, so no key rotation or reassignment is justified by this prior run.
- The serialized result contains raw trajectory fields, including a `thought` field and unfiltered page excerpts. Those values are intentionally omitted from this tracked report. The previous workspace's `.local/audits/` trace was not imported into this new project, so the full provider request/response transcript for job `8237…` is unavailable here.
- The result reports the case ID, but its durable case/evidence/admission/card rows cannot be queried from this project's empty development database. The prior job's exact runtime SHA is not stored in the Redis job record; the upstream audit documented a different pre-refresh source SHA, so do not attribute this outcome to current `main` without qualification.
