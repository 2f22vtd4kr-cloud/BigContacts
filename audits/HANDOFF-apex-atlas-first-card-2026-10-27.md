# Apex Atlas first-card recovery — handoff for a new chat

**Date:** 2026-10-27  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Active PR:** [#759 — Fix canonical Atlas company cards from one search](https://github.com/2f22vtd4kr-cloud/BigContacts/pull/759)  
**Working branch:** `apex-atlas-first-card-2026-10-27`  
**Current PR head:** re-fetch [PR #759](https://github.com/2f22vtd4kr-cloud/BigContacts/pull/759) before acting; any SHA recorded below may be historical.  
**Sequential audit:** `audits/apex-atlas-first-card-sequential-audit-2026-10-27.md`

## User's non-negotiable objective

Continue working, not just advising. Repair Apex in its existing architecture and run it canonically through the real UI/API/job path until **at least one naturally generated company card is persisted and read back through the normal application API/UI**. No synthetic rows, test fixtures, hand-written cards, or claims based only on source code/CI. Keep writing a chronological, factual audit as work happens. If a new chat is used, read this handoff and the full sequential audit before making changes.

The product goal: every research depth should yield useful reviewable output when there is an honest source-backed lead, starting with a company/business card from a single successful web query if the query result names an organization and includes an eligible URL. Search snippets are leads, not verified facts. A search-only company card must be visibly low-confidence/review-only and preserve the exact source URL, clearly label that the page has not been fetched, and make no ownership, wealth, identity, or contact claim. Stronger claims require observed page content. Person/HNWI cards need evidence that binds the exact person, role, and a relevant ownership/control/equity/investment clue; do not infer wealth from title. Never fabricate evidence.

Discovery must be model-driven and source-neutral. Do **not** default to Companies House. Select sources based on objective, geography/jurisdiction, hypothesis, evidence, expected information gain, identity discrimination, and cost. Registries are one source family among broad web search, local reporting, company websites, directories, licensing/permit lists, events, filings, asset reporting, and other applicable sources. Do not impose a scripted source order.

## What was actually done in this work window

Changes were made on the PR branch (not merged to `main`):

- Added/adjusted company review-card admission guidance for a successful search result that contains an exact organization name and eligible URL, while retaining stricter evidence requirements for fetched-page business/person claims.
- Rewrote Investigator source-selection guidance to remove registry-first pressure and explicitly forbid defaulting to Companies House merely because the adapter exists.
- Tightened and shortened prompt contracts to reduce emergency prompt overflow; retained required JSON envelope and the partial company-card rule.
- Worked on prompt compaction and control-model budgets. Recent commits include:
  - `2475a4a4a61d6d9518ea46831988a8bd20b39715` — reduce control prompt and retry budgets
  - `f29a18df4caf8205f14ab0c01bf72c786182d980` — preserve authoritative Boss state budget
  - `b2246fd84b273bd8f4e0dfe6a71dfae525be1415` — restore prompt compaction/remove duplicated source context
  - `d240f3dcbd98aa9d4d1e60ca0939f246d8a14786` — match actual composed prompt delimiters
- Appended detailed entries to the sequential audit. Read its latest tail; it records the prior diagnosis and quota caveats.

These are source/CI changes only. They do **not** prove a live run, successful provider call, persisted card, deployment, or user-visible read-back.

## Historical CI state at original handoff (superseded; not current status)

PR #759 was open and unmerged; latest observed head was `d240f3dcbd98aa9d4d1e60ca0939f246d8a14786`, updated at 2026-10-27 18:07 UTC. At handoff, no later commit/run was observed. Check current GitHub state first.

Workflow runs on that SHA:

- [API Build #40556681637](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40556681637) — **failed** at “Run discovery pivot-scope regression tests.” Logs show 2 test files failed, 14 failed / 180 passed. Prompt assertions report missing composed-context markers including “LAST SUCCESSFUL FETCHED SOURCE,” “source-backed leads,” “Target-scoped research owns independent…,” active Boss scope, trajectory history, PDF retrieval limits, and “SOURCE-ROUTE RECOVERY JUDGMENT.” This may indicate real prompt context was dropped during compaction, not merely stale test wording. Inspect the actual composed prompt by tier and fix the underlying contract/context loss.
- [Five Green Complete Codebase Audit #40556681612](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40556681612) — **failed** in Audit 1, then audits 2–5 skipped. API tests: 1 test file failed, 5 failed / 41 passed. Control-contract assertions expect the Right Hand request shape and important Boss orientation markers such as “Rejected concrete URL/tool destination…,” “LATEST REPORT,” “SOURCE-ROUTE RECOVERY JUDGMENT,” and “PINNED AUTHORITATIVE CASE STATE.”
- [Five Consecutive Full Code Audits #40556681754](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40556681754) — **failed** in Audit 1, then audits 2–5 skipped. Same control-contract regression family.
- [Apex Research Quality Contracts #40556681649](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40556681649) — passed.
- [apex-discovery-static-check #40556681382](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40556681382) — passed.
- [Apex Prompt Architecture Audit #40556681358](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40556681358) — passed.
- [Apex Python OSINT Worker #40556681968](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40556681968) — passed.

The latest green static/architecture checks do not override failing runtime-contract/API tests.

## Important quota/latency work to inspect and finish

The user reports being asked for replacement Groq keys very frequently. Treat this as a product/runtime reliability problem to diagnose, not just rotate keys.

Audit notes say code changes attempted:
- Deduplicate identical secret values so aliases of the same key do not masquerade as independent quota pools.
- Bound Boss credential fallback to the selected key plus at most two distinct fallbacks per control decision.
- Reduce Boss compact JSON decision completion allowance to 1,024 tokens.
- Reduce Right Hand completion allowance/retry budgets.
- Allow a distinct secondary credential after hard request-quota failure; preserve same-role model recovery for token-window/model-specific errors.
- Keep fallback bounded and do not weaken fail-closed behavior or cross roles incorrectly.

These changes need code-level review and regression tests. Distinguish provider responses: rate/request quota (possibly shared account/project quota), per-minute throttling, context-window overflow, max completion token rejection, authentication/invalid model, and transient network/server errors. Do not indiscriminately retry a hard quota failure, and do not assume changing keys helps when keys share the same org/project quota. Prefer short compact control prompts, low completion budgets, one bounded retry where justified, and observable failure classifications. Preserve the original failure and each fallback attempt in the audit without logging secret values. Check all call paths (Boss, Right Hand, Investigators) for duplicated retry layers and token-budget inflation.

## Access and deployment facts

- No canonical launch/job ID, real live search result, persisted company-card/entity ID, evidence-row ID, or normal API/UI read-back has been observed in this recovery pass.
- No claim has been established that PR #759 or this branch is deployed to production.
- Vercel's visible team context at last check was team ID `team_A2ZxrJwBh2CZdhvfn12qxfk2`, slug `komarovychpet-3830s-projects`, plan Hobby, with **no linked Git projects listed**. This may not be the team/project hosting the running app.
- A Vercel team consent link was generated during the previous chat, but it is single-use and expires in 10 minutes; do not rely on it. To regenerate, call the Vercel connection's `authorize_team_access` for the exact target team ID/slug once identified, then ask the user to open and approve the returned link. If the target team is not listed, use `list_teams` and identify the actual team/project rather than assuming the visible Hobby team is correct.
- If the project is on Replit or another host instead, identify the real canonical deployment and use its supported runtime/log access. Do not keep retrying guessed app IDs.

## Required next actions, in order

1. Re-read this handoff and the full sequential audit, then re-check PR #759 head/status and all workflows. Do not repeat the prior exploratory work blindly.
2. Inspect the latest source diff, particularly `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`, `apex-bureau-orientation.ts`, `atlas-control-decision.ts`, quota/fallback helpers, and their focused tests. The canonical API implementation is under `artifacts/api-server/src/src/lib/`; there is a second older source tree, so verify the path used by runtime/build.
3. Fix prompt compaction by making each prompt tier preserve essential objective/scope, last successful fetched source, actionable trajectory, available tools, source-neutral discovery, and the partial company-card admission contract. Measure/test the final composed prompt at every tier and ensure it stays under the provider context budget. Do not simply delete assertions to turn CI green. Keep a minimal emergency prompt that still contains the durable objective, exact source observation/URL, and valid output contract.
4. Fix the failing control prompt/request-shape regressions; retain authoritative case state, blocked-vs-failed-vs-unfetched URL distinctions, concrete source-route judgment, and correct Right Hand request schema. Re-run focused tests, API build, research-quality contracts, static discovery check, prompt architecture audit, and both full-code-audit workflows until all are green.
5. Investigate actual Groq usage: record model, role, prompt chars/tokens if available, completion cap, provider status/error class, attempts, elapsed time, key-alias pool ID (not key value), and whether fallback helped. Optimize prompt sizes/retries across roles; avoid repeating full context or huge history where compact structured state suffices.
6. The user has chosen to launch the next canonical run themselves on Replit. Do not pursue Vercel or launch a separate provider-backed run. Prepare the codebase for the user's run; verify the merged `main` SHA and Replit setup instructions.
7. Do not launch Replit on the user's behalf. Keep the GitHub runtime-proof workflow manual-only; a merge must not trigger an automatic provider-backed investigation. The user controls the next Replit launch.
8. Prove completion with the canonical job/run ID, actual search query/provider and returned URL, source-backed company-card record ID, related evidence/source provenance ID(s), and normal API/UI read-back. Append all facts and blockers to `audits/apex-atlas-first-card-sequential-audit-2026-10-27.md`.
9. Only then report success. If blocked, report the precise failure and continue fixing rather than claiming a card was created.

## Audit and privacy of diagnostic content

Keep a sanitized chronological audit public in the repository: report model roles/actions, tool/provider choices, redacted or summarized observations, error classes, timings, job/case/card/evidence IDs, and diagnoses. Raw model prompts/completions and contact values belong only in the ignored private `.local/audits/` trace, never in tracked `audits/` files. The current Replit development config targets `.local/audits/APEX_ATLAS_MODEL_AUDIT_2026-10-28_CANONICAL_RUN_01.md`, includes contact data for this controlled diagnostic run, and sets visible-file opt-in false. Do not claim access to hidden chain-of-thought; record only the explicit model response fields the provider actually returns.

## User's frustration / communication requirement

The user explicitly complained that PR #759 sat idle for hours and that earlier responses overstated progress. Be direct and evidence-based. No vague “working on it” updates, no claim that code changes equal successful execution, and no stopping after another provider error. State exactly what was changed, what CI says, and whether a canonical card has actually been persisted. The task is not complete until the first naturally generated card is proven through the normal path.


## Recovery update — 2026-10-28, current codebase work

Confirmed and fixed on PR #759:
- Configured `browser_fetch` actions were being unconditionally rewritten to `visit`. The runtime now preserves the model-selected browser action when its provider is available, and falls back to `visit` only for an unavailable/stale provider label.
- Search-result title fallback could admit generic discovery metadata such as `Case Co`. A narrow placeholder guard and regression test now reject generic metadata while preserving a concrete business-like company result. This is an identity-quality guard only; it does not prescribe a research itinerary.
- Raw model trace capture now writes to ignored private `.local/audits/`, not a tracked public file.
- The GitHub provider-backed runtime-proof workflow is manual-only. Merging this PR will not silently launch a second investigation or spend provider quota.

Read current checks on PR #759 for the final head before merge. Codebase readiness and live acceptance remain separate: the next canonical run is the user's Replit run, and success requires real persisted card/evidence records, both normal API projections, truthful terminal status, and released active-job lock.