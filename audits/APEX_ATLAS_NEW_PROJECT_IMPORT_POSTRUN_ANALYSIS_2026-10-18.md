# Apex Atlas — New Project Import Run Post-Run Analysis

**Date:** 18 October 2026  
**Observed source commit:** 2a0f6714e177313ccf654d16ebf9314566636a2e  
**Outcome:** failed / incomplete; no Investigator research began.

## Executive finding

Replit sent the canonical UI-default launch at **09:15:18 UTC** to POST /api/ingest/atlas-run. The API returned HTTP 202 with job e08bfac9-df3e-4786-b5e1-9e0e0a327030. This was an accepted launch, not a successful research run.

The job then failed at progress 0/4, Atlas phase 0, with one recorded error. Boss's opening request to GPT-OSS 120B succeeded (HTTP 200); the Right-hand opening review failed before Investigator startup. Four Right-hand requests (two using GPT-OSS 120B and two using GPT-OSS 20B) returned HTTP 400 json_validate_failed. The provider diagnostic explicitly identified completion-token exhaustion on a failed generation. No Investigator request, search, page visit, finding, admission, entity, contact, or card followed.

## Separate pre-launch telemetry issue

The audit had accumulated 65 request/response pairs from API test/check traffic before launch. All 65 pairs were matched and all had null job and case IDs, so they are test telemetry, not a research trajectory. The logger was then changed to require the separate APEX_CAPTURE_MODEL_PROMPTS_IN_TEST=true opt-in whenever it detects a test runner, even if tests inherit NODE_ENV=development. The focused logger suite and workspace typecheck passed after that fix, and the audit count remained unchanged.

## Root cause

The canonical opening Right-hand call used the generic 768-token completion budget with medium reasoning and did not pass the existing generationBudgetRecovery request options. Structured-output failure therefore fell back to JSON-object mode at the same token cap, then repeated on the fallback model. The logged error is not evidence of Investigator quota exhaustion, broken search integration, or a card-persistence failure.

The PTC/SQL inspection errors described in the Replit workspace notes were local inspection-tool/syntax errors; the failed SQL parse executed no database query and did not cause the canonical job to fail.

## Changes on main

- Give the opening Right-hand review a task-scoped low-reasoning output budget of 1,024 tokens, at most four outbound requests, and one bounded recovery to 1,536 tokens. Existing fail-closed approval validation remains unchanged.
- Add a regression guard that the canonical opening review actually passes those recovery options; retain existing unit tests for exhaustion recovery.
- Remove raw failed_generation content from provider-error audit records. Retain only safe diagnostic metadata (whether it was present, length, and whether it indicates token-budget exhaustion).
- Disable visible in-workspace prompt-audit writing. Live raw capture goes under ignored private-audits/; contact-data capture stays false, and tests require their separate explicit capture opt-in.
- Remove the raw 15,675-line prompt audit from the public audits/ tree. Its content remains in prior Git history; this commit does not rewrite history. This document preserves the operational result without copying raw prompts or provider payloads.

## Next-run acceptance criteria

1. Pull the latest main commit into the Replit project and restart the canonical API once.
2. Confirm the API is healthy, the active Atlas lock is idle, and private audit capture is configured with contact-data capture disabled.
3. Send exactly one UI-default launch: POST /api/ingest/atlas-run with {"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}.
4. Confirm the job-bound trace contains Boss, then successful Right-hand approval, then the first Investigator request and actual external research actions. An HTTP 202 alone is not a success.
5. Reconcile the terminal job and durable case/evidence/admission/card state. Do not claim success from dashboard narration or candidate counts alone.
