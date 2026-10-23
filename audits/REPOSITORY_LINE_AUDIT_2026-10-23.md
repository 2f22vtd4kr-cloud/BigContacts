# Repository line-by-line static audit

Repository: 2f22vtd4kr-cloud/BigContacts
Snapshot SHA: f53dbd1fd246cea2162b4f14e16badd60c4542d4
Tree entries including directories: 3436
Tracked blob files: 3349
Text files line-scanned: 3217
Text lines scanned: 556,985
Binary/non-UTF-8 files inventoried, not text-line-scanned: 132
Path/line/rule hits: 2266 (triage signals, not confirmed vulnerabilities)
Critical/high pattern hits: 18
Review-level hits: 601
JavaScript/shell/YAML/JSON/JSONL/Python syntax findings: 0
Unreadable paths: 0

## Method
Checked out the exact snapshot and enumerated all blobs with git ls-tree. Every readable text line was checked against the versioned static rule set in the JSON artifact. JSON/JSONL were parsed; tracked Python files were syntax-checked with python3 -m py_compile, JavaScript/MJS/CJS with node --check, shell with bash -n, and YAML with the Ruby YAML parser. CSV manifest has one row per blob with SHA, byte size, line count or binary disposition, path class and hit count.

This is a comprehensive automated line-by-line static pass, not a claim that regex checks replace semantic human review of every line. Binary assets have no source lines. Pattern hits require contextual triage; false positives are expected. No dependencies, external provider requests, database-backed integration, deployment, or Replit run was performed.

## Coverage by path class
- documentation: 2030
- first-party-implementation: 741
- operational-script: 266
- visual-or-attachment-asset: 174
- historical-audit-record: 62
- runtime-or-repository-configuration: 39
- ci-workflow: 18
- other-tracked-file: 13
- build-or-dependency-configuration: 6

## Coverage by language
- documentation: 2157
- javascript-typescript: 905
- asset: 132
- json: 40
- web: 39
- yaml: 26
- python: 14
- shell: 13
- configuration: 10
- other-text: 9
- sql: 4

## Most frequent rules
- QUALITY-ANY-TYPE: 1051
- QUALITY-DEBUG-LOG: 475
- AI-URL-TRUNCATION-SHAPE: 180
- SEC-URL-FETCH-INPUT: 139
- MAINT-EXTREME-LINE-LENGTH: 103
- SEC-SHELL-EXEC: 70
- AI-EMPTY-CATCH: 69
- QUALITY-UNBOUNDED-READ: 63
- AI-URL-REDACTION-SHAPE: 43
- SEC-SQL-RAW-INTERPOLATION: 18
- SEC-DYNAMIC-EVAL: 14
- QUALITY-TODO-FIXME: 10
- SEC-HTML-INJECTION: 8
- OPS-CAPTURE-PROMPTS: 5
- QUALITY-ESLINT-DISABLE: 5
- OPS-TRACKED-CONTACT-AUDIT: 4
- OPS-VISIBLE-PROMPT-AUDIT: 3
- QUALITY-COMMENTED-SECURITY: 3
- SEC-HARDCODED-SECRET-ASSIGNMENT: 2
- TEST-SKIP: 1

## Critical/high locations
- .replit:30 — OPS-TRACKED-CONTACT-AUDIT (high); source text withheld
- artifacts/api-server/.replit-artifact/artifact.toml:18 — OPS-TRACKED-CONTACT-AUDIT (high); source text withheld
- artifacts/api-server/src/src/lib/canonical-job-lock.ts:53 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/canonical-job-lock.ts:97 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/canonical-job-lock.ts:121 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/canonical-job-lock.ts:141 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/canonical-job-lock.ts:204 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/job-queue.ts:30 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/job-queue.ts:62 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/job-queue.ts:84 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/job-queue.ts:104 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/job-queue.ts:138 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/job-queue.ts:140 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/job-queue.ts:188 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/job-queue.ts:190 — SEC-DYNAMIC-EVAL (high); source text withheld
- artifacts/api-server/src/src/lib/model-prompt-audit.test.ts:54 — OPS-TRACKED-CONTACT-AUDIT (high); source text withheld
- artifacts/api-server/src/src/lib/model-prompt-audit.test.ts:59 — OPS-TRACKED-CONTACT-AUDIT (high); source text withheld
- scripts/check-canonical-job-lock-boundary.mjs:16 — SEC-DYNAMIC-EVAL (high); source text withheld

## Parse issues
- None detected by available parsers.

## Read errors
- None.

## High-impact findings from focused architecture review
1. Research-to-card gap: job 81a955bf-f44f-4faf-a39a-e2bcffbc5014 recorded 32 unfetched leads and zero findings/admissions/evidence/cards despite a terminal lead-exhaustion rationale. Source-backed organization materialization does not guarantee review records for snippet-only leads.
2. URL integrity: the active #728 branch contains the URL-atomic projection/replay fix effort but is not in this pinned main snapshot.
3. Audit privacy: tracked .replit enables prompt capture and contact-data inclusion in a visible audit path; this is a future exposure risk, not a claim of present leakage.
4. Worker readiness: SpiderFoot and related tools exist in source, but live worker attestation, image digests, configured tool set, and an authorized live call remain unverified.

## Artifacts
- REPOSITORY_LINE_AUDIT_MANIFEST_2026-10-23.csv: one row per tracked blob.
- REPOSITORY_LINE_AUDIT_FINDINGS_2026-10-23.json: path/line/rule findings and scan metadata without source excerpts.

## Coverage definition
Every blob in this pinned snapshot is either text-line-scanned or inventoried as binary/non-UTF-8/read-error. Runtime behavior, semantic review and live-provider truth are separate workstreams.
