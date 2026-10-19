# Apex Atlas — Successor Handoff (19 October 2026)

> **Purpose:** this is a continuation brief for the next ChatGPT/coding agent taking over Apex Atlas. It is not a substitute for the repository study. Start by studying the code and architecture, then continue the exact audit/fix sequence below. Do not ask the user to repeat context already recorded here.

## Executive state

- Repository: `2f22vtd4kr-cloud/BigContacts`; canonical branch: `main`.
- Read `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md` first and follow it fully. Read `docs/apex-atlas-handoff/20_MASTER_SUCCESSOR_HANDOFF_2026-10-17.md`, `docs/context.md`, `docs/BUREAU_REACT_ARCHITECTURE.md`, `docs/RUN_BUREAU.md`, `README.md`, and this latest audit: `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-19_FRESH_REPLIT_IMPORT_RUN_01.md`.
- PR **#715 — Add bounded PDF reading and gate unavailable registry adapters** is the active code/fix vehicle. Its branch is `fix/pdf-evidence-and-registry-availability-20261019`. Do not treat it as merged until GitHub confirms it. The work here adds bounded PDF text extraction, disables a stale Dutch registry adapter, corrects the proposed German Datasette route, updates related tests/coverage notes, and disables unsafe public audit-capture defaults.
- During review of PR #715, CI uncovered a **real PDF integration defect**: static import of `pdfjs-dist@5.7.284` throws `ReferenceError: DOMMatrix is not defined` in Node 22 because the project intentionally excludes PDF.js's optional native canvas package. This also fails unrelated test files that import the shared research core. A text-only import bootstrap has been added on the PR branch; re-check the exact head and all CI after that edit. Do not merge if this regression remains.
- Apex is **not live-accepted**. Builds and static architecture checks are necessary, not sufficient; the last recorded real run has not demonstrated admitted source-backed candidates/cards.

## Current audit evidence — keep attempts distinct

### Attempt 1: job `d7993dc4-4e4e-4fa8-99b9-172146524249`

The tracked audit P012–P014 already records this job as terminal `failed / incomplete`, phase 3/4, with 30 durable case events, no evidence/admissions/entities/cards, and an idle active pointer at reconciliation. Workspace notes subsequently explained that Investigator provider rate-limit events were zero. The failure boundary was repeated KVK/German registry adapter exceptions, unsupported PDF fetching, rejected/out-of-scope model actions, and a Boss `stop` that did not establish an evidence-backed terminal candidate. Do not call this quota exhaustion.

The operator's supplemental notes say:
- KVK's old public mirror failed DNS; the official API is subscription-based; a separate open company-data set needs an independently reviewed integration.
- An in-app endpoint test initially used the wrong API route and returned 404; that did **not** test the adapter.
- A direct check of the old German Open Register route returned 502.
- Two PDF visits were unsupported by the prior implementation.
These are operator-reported runtime observations, not evidence that the new source branch's endpoint works.

### Attempt 2: job `0bc6087d-4070-4420-a645-ca2606549052`

The latest tracked audit's P018/P019 directly observed this different job at discovery phase 1/4, Investigator iteration 8, 13 case-ledger events, four successful tool observations, two blocked actions and two model/tool-action errors, with no established candidate. The Replit audit observer ran out of credits after that checkpoint. **The later terminal state, final database/evidence/admission/card outcome and active lock were not observed in the tracked audit.** Never copy Attempt 1's failure or idle-lock assertion onto Attempt 2.

Before another launch, query the actual Replit runtime read-only for this job, case 2, final durable evidence/admission/card state and the active Atlas pointer/lock. If it is active, allow it to finish or use the documented cancellation path. If its state cannot be reconciled, do not launch concurrently; record the blocker and ask the operator to restore runtime visibility.

## PR #715 — review/merge instructions

1. Refresh the actual open PR #715 head, diff, review comments, and CI state; do not reuse a SHA from this handoff.
2. Fix the `DOMMatrix`/PDF.js integration issue. The repository intentionally excluded the native canvas package, and the capability is text-only. Any workaround must be tightly scoped to import/bootstrap and must never claim to support PDF page rendering or OCR. Ensure valid PDF text can be extracted by a real unit test under Node 22, and that importing shared research modules no longer crashes test startup. Keep byte/page/character limits, cancellation, sanitization, source/page markers, and untrusted-content treatment.
3. Verify PDF detection for `application/pdf`, extension, content-disposition filename and PDF header without allowing an oversized response to bypass byte bounds. An extracted PDF must only become an observed source if usable text was actually read; scanned/image-only, encrypted, malformed, blocked, or over-limit files must stay errors/no-evidence.
4. Critically recheck the German Open Register URL/query/response contract. The URL unit test only verifies the constructed URL; it cannot establish live endpoint health or schema. Never label a failed HTTP/DNS/parse response as a no-hit. If the replacement URL is not verified by reliable source docs and real safe runtime response, keep the adapter unavailable rather than advertising it as working.
5. Keep KVK unavailable in the advertised capability list until a supported endpoint/data licence and response contract are validated. Keep its failure distinct from an empty search result. Don't restore the obsolete `openkvk.nl` mirror or make paid APIs appear anonymous/free.
6. Read every changed file and the complete resulting PR diff, not only the summary. Check the package manifest/lock consistency, PDF parser dependency placement, build externals, cancellation/time/resource bounds, log redaction, and exact registry coverage labels. Follow a failed CI job through its log; don't assume only the named new tests matter.
7. Require green results on the exact PR head for the API build (including unit tests/typecheck), OSINT worker contract tests, architecture/static checks, research-quality contracts and required multi-pass audit workflows. Check conclusion and `head_sha`; stale green checks, running checks, failures, skipped required gates and deploy-preview success do not equal full CI acceptance.
8. Add regression tests before each source-level fix. Update the public chronological audit with sanitized facts only; no raw model prompts/responses, private reasoning, secret values, personal contact values, or full fetched pages in a tracked file.
9. Once all required checks pass, review mergeability and head SHA, then merge PR #715 using the expected head SHA. Verify PR state = closed/merged, capture merge commit SHA, verify files on `main`, then check workflows on that exact main SHA. Do not report the product live-ready merely because #715 merges.

## Architectural invariants to preserve

Apex is a **model-led public-source research bureau**, not a scripted enrichment pipeline:
- Groq Boss owns case direction and Investigator-capability selection.
- Groq Right-hand provides bounded, independent oversight; it does not take over research.
- The selected Groq Investigator capability owns its research trajectory and chooses among enabled tools.
- Deterministic code enforces safety, capability availability, SSRF/egress rules, cancellation, resource bounds, provenance, identity/attribution, admission, persistence, locks and truthful terminal state.
- Search results and registry-returned links are unvisited leads, not fetched evidence. A fetched page/PDF is not automatically a finding. A finding is not an admitted person. An admitted person is not a card until durable persistence and UI projection match.
- Unknown/insufficient evidence is a valid result. Never invent a person, ownership, wealth, source, relationship, contact or successful registry result to improve apparent productivity.
- Do not script search sequences, add forced identity/company/contact hops, weaken admission or scope guards, silently rotate provider keys, or classify tool errors as provider quota errors without evidence.

## Required source-study / sequential workflow

After checking current GitHub state, inventory the full repository and worktree as required by the study protocol. Trace these coupled seams end to end rather than inspecting components in isolation:

1. UI launch → API route → durable job/case → active-lock acquisition → Boss/Right-hand/Investigator requests.
2. Model-visible context/compaction → structured action parse → capability/guard decision → actual outbound tool request → HTTP/provider response → sanitized observation.
3. Lead URL → fetched page/PDF → source provenance → claim/finding grounding → identity and counter-evidence → candidate admission.
4. Evidence/target state → persistence transaction → event ledger → card/React/Reactor projection → terminal outcome and lock release.
5. Current deployment SHA/build stamp → environment flags and ignored private audit path → database/Redis/schema/health → real run-bound telemetry.

Record the first broken link in that chain, exact observed error classification, expected-vs-actual behavior, and a falsifiable regression test. Fix the earliest root cause with the smallest complete change. Run focused tests, typecheck/build, `pnpm run check:bureau`/equivalent canonical gates and required CI on the exact PR SHA before merging. Keep status documents and the run audit consistent with evidence actually collected.

## PDF capability contract

PR #715 intends to make ordinary `visit` able to read **text-bearing PDFs** through bounded PDF.js text extraction: maximum 8,000,000 downloaded bytes, 50 pages and 16,000 output characters. Each page has a marker; text remains untrusted. It does not add OCR, does not execute embedded actions, and does not imply that scans, encrypted files or malformed PDFs are readable. HTML-oriented `browser_fetch` should not pretend to read PDF bytes; route supported PDF work through `visit` and prevent repeated no-text/parser failures from wasting Investigator turns. Verify end-to-end test behavior, not just a source-string assertion.

## Registry capability contract

- **KVK Netherlands:** unavailable until a verifiable public route/dataset, licence and result contract are tested. The action should return an explicit unavailable/failure signal—not an empty result—so the model can choose another source.
- **German Open Register:** PR #715 changes the Datasette JSON URL to the `openregister-ef9e802` database route with a URL contract test. This is a hypothesis-backed correction, not live endpoint acceptance. Verify the exact route against reliable source documentation and a safe live response; check query syntax, table/column names, response envelope, timeout/cancellation and failure classification. If unavailable, stop advertising it as a working adapter.
- More generally, only adapters whose implemented contract is really callable should be advertised as available. The capability matrix is product guidance; runtime availability and error semantics must match.

## Audit capture and privacy

The PR changes committed Replit development defaults to disable raw prompt capture, personal contact-value capture and writes to visible tracked files, with a proposed private trace destination beneath ignored `.local/audits/`. Keep this secure default. For an explicitly authorized controlled development run, use a unique ignored run-specific path; never commit the raw trace. A tracked chronological report should include sanitized timestamps, IDs, event/action/status classifications and counts, while excluding credentials, full source text, raw personal values and hidden provider reasoning. Distinguish observer credit exhaustion from backend termination.

## Completion criteria

Do not tell the user Apex is ready to run again until:
- PR #715's exact head passes all required checks and is merged, and the post-merge source checks are verified;
- the deployed Replit source/build SHA is confirmed to match the intended merged `main`;
- Attempt 2's actual runtime job and active lock are read-only reconciled;
- the PDF extraction unit and integration paths are green under Node 22 and any enabled registry is honestly represented;
- preflight, Redis/database/schema/health and canonical run locks are verified immediately before the next single UI-default launch;
- that next run reaches a terminal result and durable evidence/admission/card state is checked.

**Do not ask the user to restate their mission, architecture, latest run IDs or the PDF concern. Continue from this handoff and current executable repository state.**
