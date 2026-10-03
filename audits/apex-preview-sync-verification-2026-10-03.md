# Existing Apex Atlas Preview — Sync and Runtime Verification — 2026-10-03

## Scope

- Verify and prepare the existing BigContacts / Apex Atlas Preview against canonical commit `35aeaa65259e5fa7f07ac49b3a942a0cdf228db9`.
- Do not launch Atlas research during this audit.
- Preserve current repository work; never replace the app or reset the workspace without inspecting and preserving changes.
- Record only secret names/presence, never secret values.
- Runtime SHA must be reported only if the running Preview exposes verifiable evidence for it.

## Sequential record

### 000 — Audit opened and repository instructions reviewed

- **UTC timestamp:** `2026-10-03T03:10:56Z`
- **Action:** Opened this verification audit before any fetch, workspace synchronization, workflow restart, environment inspection, or provider readiness call.
- **Read:** `docs/context.md`; the latest available master successor handoff `docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md`; the current provider-role source document and the requested Bureau/ReAct routing/control-flow documents; the latest available live audit `audits/apex-atlas-live-run-sequential-audit-2026-10-03.md`.
- **Index gaps:** `audits/CURRENT.md` and root `APEX_RUN_AUDIT.md` are absent. The latest available live audit was reviewed directly; no missing index or root audit was created.
- **Architecture constraint:** Groq GPT-OSS is Boss; Mistral Small is independent Right-hand oversight; generic Groq/Mistral credentials remain Investigator-only. No role fallback or Gemini transport may be introduced.
- **Next action:** Inspect the actual checkout, the current provider adapters/readiness route, and repository verification commands before synchronization.

### 001 — Existing workspace identity and checkout state

- **UTC timestamp:** `2026-10-03T03:10:56Z`
- **Action:** Read-only inspection of the existing repository root, branch, Git state, and app artifact directories.
- **Observed:** Workspace/repository root is `/home/runner/workspace`; branch `main`; workspace SHA `9057924f0ec07093a4f2a7b42e66a8b3d603bc12`.
- **Target commit:** `35aeaa65259e5fa7f07ac49b3a942a0cdf228db9` is not present in the local Git object database.
- **Remote:** No `origin` remote is configured.
- **Working tree:** Only the user-provided attachment is untracked; no tracked file modifications were reported.
- **Existing app markers:** `artifacts/api-server/` and `artifacts/apex-finder/` both exist. This is the existing BigContacts / Apex Atlas workspace, not a replacement app.
- **Runtime:** Both configured workflows were reported not started. No restart or runtime claim has been made.
- **Interpretation:** The workspace is behind/unverified relative to the requested canonical commit. No synchronization has been attempted yet.

### 002 — Current implementation, verification commands, and secret presence inspected

- **UTC timestamp:** `2026-10-03T03:11:56Z`
- **Action:** Read the current Mistral Right-hand and Groq Boss adapters, system readiness routes, package scripts, and boot script. Queried development-secret presence only through the workspace secret-status interface; no values were accessed or printed.
- **Current Mistral source:** Uses `MISTRAL_RIGHT_HAND_API_KEY` and numbered `_2`–`_5` slots; primary model `mistral-small-2603`; bounded fallback `mistral-small-latest`. HTTP-failure diagnostics are serialized as JSON with role-key name, model, HTTP status, provider code, failure class, retry counts, Retry-After fields, and summarized/redacted body. The readiness function tries later configured Right-hand keys after a failed catalog call.
- **Current Groq source:** Uses `GROQ_BOSS_API_KEY` and numbered `_1`–`_10` slots; catalog readiness is a separate explicit diagnostic. Generic Groq/Mistral credentials are not used by those role-specific adapters.
- **Readiness route:** Current source contains `POST /api/system/diagnostics/mistral-readiness`; ordinary `GET /api/system/status` does not perform that provider request.
- **Development secret-name presence:** Present: `GROQ_BOSS_API_KEY`, `MISTRAL_RIGHT_HAND_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`. Numbered Boss and Right-hand slots are absent. Values were not inspected.
- **Repository commands identified:** Root `pnpm run typecheck`; API `pnpm --filter @workspace/api-server run build` (which invokes provider and architecture guards); Vitest regressions for Mistral Right-hand, Groq Boss, and Atlas control; root provider-role and canonical discovery/control-plane checks.
- **Boot-script observation:** The current checkout's boot-script auth comment contains literal `\\n` text. No edit was made; verify this against the requested canonical commit before deciding whether it is an implementation defect.
- **Interpretation:** The source in the unverified local checkout appears to contain structured Mistral diagnostics, but this does not prove the requested commit is checked out or that a running Preview loaded it. No provider readiness call, workflow restart, or research launch has occurred.
- **Next action:** Obtain the requested commit from the canonical repository without overwriting the workspace, then compare and synchronize only after inspecting the exact diff and preserving the untracked attachment.

### 003 — Canonical upstream confirmed read-only

- **UTC timestamp:** `2026-10-03T03:12:30Z`
- **Action:** Queried the documented BigContacts GitHub repository with `git ls-remote`; no fetch or checkout was performed in this step.
- **Observed:** Both remote `HEAD` and `refs/heads/main` resolve to `35aeaa65259e5fa7f07ac49b3a942a0cdf228db9`, exactly the requested target.
- **Interpretation:** The canonical commit is reachable from the repository URL. The local checkout still has no configured remote and does not yet contain the target object.
- **Next action:** Fetch only the exact target into a separate local tracking ref, then inspect ancestry and the complete file diff before changing the workspace branch or files.

### 004 — Exact target fetched to a separate local ref

- **UTC timestamp:** `2026-10-03T03:13Z`
- **Action:** Fetched only `35aeaa65259e5fa7f07ac49b3a942a0cdf228db9` from the verified canonical URL into `refs/remotes/canonical/main`.
- **Observed:** Fetch completed; `main` and the worktree were not changed by the fetch.
- **Next action:** Compare the two trees and test the target's relevant static guard before switching the active checkout.

### 005 — Tree comparison and preservation review

- **UTC timestamp:** `2026-10-03T03:14Z`
- **Action:** Compared current `HEAD` with the fetched target and checked status, branch refs, audit paths, provider source, package build commands, and target workflow/source deltas.
- **Observed:** Current `HEAD=9057924f0ec07093a4f2a7b42e66a8b3d603bc12`; target `35aeaa65259e5fa7f07ac49b3a942a0cdf228db9`; there is no common Git ancestor, so a fast-forward is impossible. The tracked trees differ in 16 paths (45 insertions, 204 deletions). The worktree has no tracked edits; the user attachment and this verification audit are untracked. Existing `gitsafe-backup/main` points to the current checkout.
- **Preservation:** The target does not contain the prior `audits/apex-atlas-live-run-sequential-audit-2026-10-03.md`; it will be copied out before synchronization and restored as an untracked audit afterward. The attachment and this audit are absent from the target tree and will remain in place.
- **Source delta:** The target Mistral Right-hand adapter adds a non-secret key fingerprint and captured `x-ratelimit-*` response headers to its structured failure diagnostics; its focused regression test checks these fields. The readiness route remains `POST /api/system/diagnostics/mistral-readiness`.
- **Boot script:** The target still contains literal `\\n` sequences in the development-auth comment line. It was not edited.
- **Next action:** Verify the target's event-role guard result; do not modify canonical source during synchronization.

### 006 — Target static-guard preflight

- **UTC timestamp:** `2026-10-03T03:15Z`
- **Action:** Extracted only the target guard and the exact target source files it reads into a temporary directory, ran `node scripts/check-research-case-event-schema.mjs`, then removed the temporary directory. The workspace was not modified.
- **Result:** **FAILED.** The target guard reports `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts: unknown actorRole groq_boss` and exits with `Research case event schema guard failed: all canonical literal event writers use declared vocabularies`.
- **Cause observed:** The target guard's allowed actor-role set and DB event-role schema omit `groq_boss`, while the target discovery source still writes `actorRole: "groq_boss"`.
- **Impact:** The API package build invokes this guard; a normal build/boot is expected to stop before serving. No bypass, stale `dist` launch, or source edit will be used to conceal this.
- **Decision:** Continue the explicitly requested synchronization to the exact target, but preserve the prior checkout on a named local recovery branch. Run the requested checks on the synchronized target; if the expected build blocker is confirmed, do not start the workflow or call the readiness route against another build.
- **No research launch:** No Atlas run, continuation, or provider-generation request has been issued.

### 007 — Local recovery points prepared

- **UTC timestamp:** `2026-10-03T03:16Z`
- **Action:** Created local branch `backup/pre-sync-main-9057924` at the pre-sync workspace commit and copied the tracked prior live-run audit to `/tmp` before moving `main`.
- **Recovery SHA:** `backup/pre-sync-main-9057924` points to `9057924f0ec07093a4f2a7b42e66a8b3d603bc12`.
- **Preserved audit SHA-256:** `3ecbf6c95fe17565af7e69771457b0b961ba0e806beca554f12d9a6c34fa89c5`.
- **Untracked files:** The attached instruction and this verification audit remain in the workspace; neither exists at the same path in the target tree.
- **Next action:** Move the active `main` worktree to `35aeaa65259e5fa7f07ac49b3a942a0cdf228db9`, then restore the prior live-run audit as an untracked audit file.

### 008 — Existing workspace synchronized to the requested commit

- **UTC timestamp:** `2026-10-03T03:16:28Z`
- **Action:** Moved the existing `main` worktree to the fetched canonical target using the prepared recovery branch; restored the prior live-run audit from its verified temporary copy.
- **Verified:** `HEAD=35aeaa65259e5fa7f07ac49b3a942a0cdf228db9`; branch is `main`; recovery branch remains at `9057924f0ec07093a4f2a7b42e66a8b3d603bc12`.
- **Preserved:** The previous live-run audit was restored byte-for-byte (matching SHA-256 `3ecbf6c95fe17565af7e69771457b0b961ba0e806beca554f12d9a6c34fa89c5`). The attachment and this verification audit remain present.
- **Working tree:** No tracked changes; only the attachment and the two audit files are untracked.
- **Next action:** Read the synchronized target's actual verification scripts, then run checks without modifying canonical source.

### 009 — Synchronized target verification

- **UTC timestamp:** `2026-10-03T03:20:12Z`
- **TypeScript:** `pnpm run typecheck` passed.
- **API build:** `pnpm --filter @workspace/api-server run build` failed at `scripts/check-research-case-event-schema.mjs`, after the earlier build guards passed. The exact failure is the `groq_boss` actor-role mismatch recorded in entry 006.
- **Focused Vitest:** The Mistral Right-hand, Groq Boss, and Atlas control regression files ran: 17 tests total, 14 passed, 3 failed. Failures: the Groq test expects `unavailable` where the no-Boss-key result is `pending`; the Mistral 429 test reuses its cached test-key catalog so its first mocked response is consumed as the chat response; the Atlas regression test rejects a remaining legacy “Gemini control decision” fallback string.
- **Focused guards:** Passed: Groq Boss model boundary, provider-role docs, single canonical discovery control plane, and canonical Atlas entrypoint. Failed: Mistral model-boundary guard (expects a literal key-name construction that the source builds from `MISTRAL_KEY_ENV`) and control-recovery guard (expects a Gemini-only recoverable state set while the route includes Mistral Right-hand failure).
- **Runtime:** No listener on port 8080 and no API boot/server process. No workflow was started after the build gate failed. Therefore no runtime SHA, health response, loaded-runtime identity, or readiness response is available.
- **Environment:** Development secret-name presence was verified in entry 002: role-scoped Boss/Right-hand keys and generic Investigator keys are present; no values were read or emitted.
- **Assessment:** The source has real consistency/diagnostic gaps as well as stale guards/test fixtures. No source changes have been made since synchronization. Fix only the event writer, readiness diagnostics, inaccurate guards/legacy label, and deterministic test fixture/expectations; retain the fail-closed provider design and do not create provider traffic yet.
- **Next action:** Apply the scoped fixes in the existing repository and rerun the affected checks before attempting the configured API workflow.

### 010 — Scoped implementation corrections and first rerun

- **UTC timestamp:** `2026-10-03T03:24:56Z`
- **Changes made:** Aligned the canonical discovery event writer with the declared `head_investigator` role; corrected stale Gemini control labels in the active control prompt; expanded the existing Mistral readiness result with per-key structured catalog diagnostics while retaining redacted provider-body summaries; corrected the Mistral key-namespace and canonical recovery guards to match the implemented role boundary; updated the no-Boss-key assertion to the explicit `pending` state; and isolated the Mistral 429 unit-test catalog cache with a unique test credential.
- **TypeScript:** Root `pnpm run typecheck` passed.
- **API build:** `pnpm --filter @workspace/api-server run build` passed all configured architecture/provider guards and generated the API bundle.
- **Focused Vitest rerun:** 17 of 18 tests passed. The only failure is a brittle generation-diagnostic assertion comparing the serialized order of `x-ratelimit-*` header object keys. The response contains all expected header names and values; the runtime `Headers` collection emits them in a different order than the test's fixed JSON substring.
- **Secret isolation:** Provider key variables were unset only in the Vitest child process; the application environment was not changed and no provider request was made.
- **Runtime:** The API workflow remains stopped; no readiness request or Atlas run has been issued.
- **Next action:** Change the unit assertion to compare the parsed header object rather than its JSON key order, rerun the focused regressions, and then complete the full verification before starting the configured API workflow.