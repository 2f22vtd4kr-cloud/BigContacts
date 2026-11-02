# Apex Atlas — Combined Main Validation Record

**Record date:** 2026-11-02  
**Purpose:** Record the code changes merged after the November 2 run review and the evidence used to validate the combined revision. This is not a live-run success report.

## Baseline and merged changes

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Run-review remediation PR #806 merged as `396d9303f0762fe541fcf2766a9304abed495f56`.
- Run-readiness / job-scoped audit-feed PR #807 merged as `dfe362a61eb4114ef710211b629fd17c984269a0`.
- Private contact-data audit PR #808 merged as `8352f1190646d1ee8fd6706356502a09059df39a`.
- Objective-aligned discovery PR #809 merged as `bc964ab0bc6955f89f5b545b83061c7ae57b180b`.

## Changes now present on main

1. Private model traces can retain source-published email and phone fields under the development-only `private-audits/` path. The path is gitignored, and `{jobId}` is expanded to a sanitized job-specific filename so request and response records from separate runs do not share one file. Credential/token redaction remains active, provider-private reasoning remains excluded, and the visible sequential audit remains separate.
2. Discovery prompts no longer require a plausible local-owner route or a defined sector/geography before a source is considered relevant. The Investigator retains target, source, provider, query, and action-order choice, subject to the human objective and active scope.
3. Run-02 context-integrity corrections from #806 preserve same-case URL grounding, distinguish lossy AI memory from evidence/authority, treat search-only snippets as unverified leads, and fail closed when AI semantic compaction cannot produce a valid summary.
4. Run-readiness corrections from #807 include strict JSON-schema compatibility for the Boss compactor, application-side summary-size validation, retry against original source with a smaller output budget, and job-scoped audit feeds.
5. Organization review cards remain distinct from research-target eligibility; search-only organization snippets are not silently promoted into target-scoped research.

## Compaction architecture review

- Historical case memory is assembled from the complete structured intelligence state, findings, prior history, durable URL inventory, prior queries, control context, and historical trajectory records before AI summarization.
- Boss LLM semantic compaction chooses which information to retain. Transport chunking preserves source segments; the application validates summary size and URL provenance.
- Oversized recent observations are also sent through Boss semantic compaction. If compaction is unavailable or fails validation, the Investigator turn returns unavailable; code does not silently replace the observation with a deterministic excerpt.
- Deterministic limits remain for prompt assembly, provider budgets, URL-safe transport, and bounded working-context projections. These controls are not substitutes for the AI summaries of historical memory or oversized recent observations.
- Model-generated summaries remain explicitly lossy/untrusted context. The human objective, active Boss scope, same-case observations, and durable evidence ledger remain authoritative.

## Validation evidence

- PR #808: five consecutive full codebase audit jobs completed successfully (workflow run `41408442589`); the separate five-green audit completed successfully (run `41408442681`).
- PR #809: five consecutive full codebase audit jobs completed successfully (workflow run `41409283601`); the separate five-green audit completed successfully (run `41409283542`).
- PR #809 API build/typecheck/regression job completed successfully (run `41409283539`): 208 test files passed, 1 skipped; 1,867 tests passed, 17 skipped; additional focused suites also passed.
- The final full-audit job on #809 passed the API build, typecheck, bureau checks, Atlas control contract regression, ephemeral database initialization/invariants, live API smoke test, and isolated API test suite.
- No failing test was deleted or weakened to obtain these results.

## Explicitly not claimed

- No provider-backed Apex investigation was launched during this remediation.
- No new run ID, evidence ID, company/person card ID, or persisted card read-back exists as a result of this work.
- GitHub Actions validation is not proof that a deployed Replit or Vercel application is running the merged revision.
- The manual-only provider-backed canonical runtime proof workflow was not dispatched. It requires configured GitHub Actions provider secrets and consumes real provider quota.
- A successful build or API smoke test is not a successful investigative run.

## Next acceptance gate

Before calling the next live run successful, launch exactly one user-approved canonical run on the merged revision, retain the complete private model trace and visible sequential audit, and reconcile the terminal job, released active-job lock, durable evidence, review cards, and ordinary API/UI read-back. Record the run ID, source/evidence IDs, exact source URLs, and card/entity IDs. Do not fabricate a card or retry by launching a duplicate run.
