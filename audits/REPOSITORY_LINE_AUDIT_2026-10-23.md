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


## Semantic disposition: confirmed findings and false positives

This section records the risk-based semantic review after the whole-tree line-pattern scan. Findings are grounded in source/call-path evidence at snapshot f53dbd1fd246cea2162b4f14e16badd60c4542d4. This does not mean an external deployment was penetrated or a live database/provider was exercised.

### P1 — API authentication is intentionally unmounted; deployment exposure must be resolved

Evidence:
- [Active route aggregator](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/routes/index.ts) explicitly says operator authentication is intentionally unmounted for the current Replit deployment and mounts route routers without requireOperatorAuth or the operator-auth router.
- [HTTP app](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/app.ts) mounts the router at /api; CORS is configured, but CORS is not authentication.
- [Operator-auth implementation](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/lib/operator-auth.ts) implements token/session/Origin controls, but it is not on the live route path. [The auth test](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/test/operator-auth.test.ts) deliberately asserts that authentication remains unmounted.
- [.replit](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/.replit) configures an autoscale application deployment and maps port 8080 externally.

If the deployed application endpoint is reachable by untrusted clients, the application itself does not require an operator session for its API routes. Replit platform network policy, custom edge authentication and any deployment access layer were not inspectable here, so public reachability is not proven. This is a high-severity deployment decision to resolve before exposing the app to an untrusted network. Enabling the existing middleware requires integrating the desk/login flow and changing tests that assert it is disabled; it should not be switched on without that work.

### P1 — Prompt capture can put contact data in a visible tracked audit file

Evidence: [.replit](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/.replit) sets APEX_CAPTURE_MODEL_PROMPTS=true, APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA=true, APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE=true and directs output to audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-21_FRESH_REPLIT_IMPORT_RUN_02.md. [The writer](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/lib/model-prompt-audit.ts) deliberately bypasses contact-field masking when the include-contact-data opt-in is true. This creates repeatable risk that future prompts/traces put real emails or phone numbers in a visible tracked artifact. The scan did not prove a current contact-data leak; this is a configuration risk, not an observed disclosure. Recommendation: disable contact capture by default and require narrow per-run opt-in to a private audit destination.

### P1 — Useful lead-to-review-card path is not guaranteed

Evidence: [canonical discovery materialization](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts) can materialize source-backed organization leads only when the Investigator emits an appropriate organization finding and a successful fetched-source observation supports the exact organization name. The entity API/UI supports Corporation and PersonCandidate records; the UI has a “Candidate — wealth unverified” type label and API contactOutcome filters for candidate/org review. Those views operate on already persisted entities; the path does not guarantee a new entity/review card for every useful snippet-only search lead.

The October 21–22 audit for job 81a955bf-f44f-4faf-a39a-e2bcffbc5014 records 32 unfetched leads, no findings/admissions/evidence/cards and a terminal lead-exhaustion rationale. This proves the discovery/control path failed before creating findings; it does not prove a valid finding was lost in a database transaction. Correct remediation is a durable, clearly review-only preliminary-lead path with truthful snippet provenance and API/UI support. Weakening person admission or treating snippets as verified facts would be incorrect.

### P1 — Active prompts and trajectory can change a URL into a different URL by slicing it

Evidence:
- [Investigator prompt envelope](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/lib/agentic-web-research-core.ts) slices sanitized observedUrls/leadUrls and truncates URL arguments in its emergency envelope.
- [Atlas control prompt compaction](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/lib/atlas-control-decision.ts) slices pinned lead/source/failed-route URLs for Boss/Right-hand control state.
- [Durable Bureau projection](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/lib/bureau-agentic-pass.ts) clips URL-valued args at 800 characters and lead URLs at 500 in the bounded caseFile projection used to mount context.

The immutable event ledger provides a potential recovery source, but main at this SHA does not consistently preserve exact URL identity in every prompt/projection path. A sliced source route may point to no resource or a different route. URL-atomic projection and event-rehydration work on PR #728 is not in this pinned snapshot and still requires exact-head verification; this audit did not merge it.

### P2 — Post-merge schema workflow bypasses the explicit migration/hardening initializer

Evidence: [post-merge hook](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/scripts/post-merge.sh) runs pnpm --filter @workspace/db run push and converts failure to a warning before continuing. [The DB package](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/lib/db/package.json) maps this to raw drizzle-kit push. The explicit [schema initializer](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/scripts/initialize-apex-schema.sh) gates push behind APEX_ALLOW_SCHEMA_PUSH=true, executes hardening and migrations 002–004, and verifies required tables/invariants. The source-migration-parity guard checks the initializer, but post-merge.sh does not invoke it.

Impact: post-merge verification may continue after schema-push failure and does not prove all committed hardening/migrations were applied. Route required schema setup through the explicit initializer, or clearly define the post-merge hook as diagnostics-only and fail closed when database setup is required.

A second mismatch is explicit in [.replit](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/.replit): scripts/post-merge.sh is assigned timeoutMs=20000 while the script performs frozen workspace install, database operations, Python tool installation, a long check:bureau chain, type checks and API/frontend builds. No execution timing was measured, but this workload is structurally inconsistent with a 20-second ceiling and may be terminated before verification completes.

### P2 — Divergent legacy and active API source roots

At the pinned tree, artifacts/api-server/src/lib/ contains 71 TypeScript files and artifacts/api-server/src/src/lib/ contains 224; 69 relative paths overlap, 24 pairs have identical blob hashes and 45 pairs diverge. The active build configuration and entrypoint use src/src, while the old src/index.ts acts as a compatibility entry into that tree. Divergent duplicates make reviews and static checks easy to aim at the wrong implementation. No bulk deletion was performed. Add a legacy-path inventory and a check preventing unreviewed duplicate names, then retire copies deliberately.

### P2 — A documented file-touch can launch a real provider-backed workflow

[The canonical runtime proof workflow](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/.github/workflows/apex-canonical-runtime-proof.yml) runs on main when scripts/live-batch-trigger.md changes and also supports manual dispatch. It provisions ephemeral Postgres/Redis, requires real Groq/search/browser/registry credentials, launches the app and performs a discovery-first case. The marker file explicitly states that touching it intentionally launches the proof audit, so the trigger is documented behavior. It can still spend external provider quota from a file change. Consider manual-only dispatch or an explicit approval condition and per-run budget ceiling. This audit did not dispatch the workflow or call any live provider.

### P2 — One legacy OSINT router is not mounted in the canonical API aggregator

The tracked routes/extended-osint.ts defines routes but the active [route aggregator](https://github.com/2f22vtd4kr-cloud/BigContacts/blob/f53dbd1fd246cea2162b4f14e16badd60c4542d4/artifacts/api-server/src/src/routes/index.ts) does not import or mount that router; it mounts osint-tools.ts and the canonical research/Bureau routes instead. This may be intentional retirement, not a defect in the new Investigator action path. It does mean documentation or UI references to the legacy extended-OSINT endpoints should not imply that they are reachable in the current router composition.

### P2 — Worker implementation exists; deployment templates and live capability remain unverified

The client and worker source implement SpiderFoot alongside Holehe, Maigret, Sherlock and theHarvester. SpiderFoot has registered action mapping and profile-scoped modules. The worker client requires a fresh signed attestation, operator-pinned image digests, isolation proof and egress-broker identity before advertising tools. Network policies and Squid add a public-web-only proxy boundary. However, tracked deployment templates deliberately contain replace-before-apply image/digest placeholders and the example worker ingress hostname. No live Kubernetes attestation or authorized worker call was performed, so SpiderFoot availability must not be inferred from code or CI.

### Confirmed protections observed during manual semantic review

- research_case_events hardening is append-only, bounds payload/case-file size, enforces correlation-key replay integrity, job binding, event-count limits and durable cancellation fencing. Promotion requires an active target case bound to the job.
- ssrf-safe-fetch.ts resolves public IPs and binds the checked address to the outbound socket, rejects private/reserved/link-local/metadata destinations, does not automatically follow redirects, and bounds request/response bytes and deadlines.
- provider-gate.ts bounds concurrency, provider request budgets, waiters/state and response-cache memory; quota/cooldown behavior is explicit.
- legacy-apex-mutation-guard.ts blocks direct person-card creation/contact mutation that would bypass evidence-bound Investigator promotion; entity-visibility-guard.ts applies hidden-entity visibility checks to entity-specific reads.
- The Python worker deployment runs non-root, disables service-account token mounting, drops Linux capabilities, uses read-only roots and memory-backed temporary files, and is configured to route external traffic through the dedicated egress proxy.

### Static-rule false-positive adjudication

- The 14 SEC-DYNAMIC-EVAL hits are calls to Redis eval for parameterized Lua scripts implementing atomic lock/queue state, plus the associated static guard. They are not JavaScript eval() or dynamic source execution.
- The two SEC-HARDCODED-SECRET-ASSIGNMENT hits are test fixtures containing the word “secret”; no actual provider/API credential was exposed by these hits.
- The sole TEST-SKIP hit is in a documentation report, not an executable skipped test.
- SEC-SQL-RAW-INTERPOLATION, SEC-URL-FETCH-INPUT, shell-execution and HTML-injection matches were not confirmed vulnerabilities merely by matching their syntax; they include bounded ID lists, provider wrappers, operational scripts, tests and offline QA/mockup files. Representative call paths were sampled. All matches remain available with path and line in the findings JSON; not every low-severity match was manually proven benign.
- The URL-truncation rule produced 180 hits because it also matches ordinary array truncation and hostname labels. Only cases slicing URL-valued strings were classified as the confirmed URL-integrity issue above.
- No private-key block, common literal GitHub token, AWS access-key ID or Slack token pattern was found by this rule set. This does not prove no secret of any kind exists.

## Human-review boundary and exclusions

The automated per-line inspection is exhaustive for the pinned snapshot's 3,217 readable text files and 556,985 text lines. The final scan also parsed JSON/JSONL and ran Python py_compile, JavaScript node --check, shell bash -n and the Ruby YAML parser on matching tracked files; none reported an issue. Manual semantic review was risk-based and focused on architecture, database invariants, active API controls, prompt/trajectory URL handling, card materialization, UI/API listing, worker/egress, .replit configuration and selected workflows/scripts. It would be false to say that a human interpreted each of those 556,985 lines individually. Documentation and historical audit contents were line-scanned but not each independently fact-checked. The 132 binary/non-UTF-8 assets were inventoried with path/size/blob SHA; their pixels/binary internals were not semantically interpreted. Third-party package source, live external APIs, Replit platform edge controls, production database state/migration execution, runtime provider credentials and deployed worker state were not accessed or exercised.

The reviewed SHA is immutable f53dbd1fd246cea2162b4f14e16badd60c4542d4; later changes on shared PR #728 are not included. They require a separate delta review.
