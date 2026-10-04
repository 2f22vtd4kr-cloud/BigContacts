# Apex Live Run Audit — 2026-10-04 — Control Recovery Follow-up

## Scope

Follow-up engineering audit for the live Apex Atlas discovery run reported on 2026-10-04. The objective was to fix issues encountered while preserving the model-owned Apex architecture and fail-closed safety boundaries.

No secret values are recorded here.

## Starting state

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Branch: `main`
- Starting verified commit: `8d8ae636398923cd4b8032477fba11170859539d`
- Prior live run: `02bd809f-9bc0-45ce-84f5-99418d7460d7`
- Prior durable discovery case: case `1`
- No new external Apex research run was launched during this fix cycle.

## Findings from the live run

1. Investigator discovery completed model-selected searches and produced no admitted evidence.
2. The run failed closed at Right-hand oversight after upstream Groq HTTP 429 responses.
3. A later local `ProviderQuotaError(code=budget_exhausted)` was the Apex provider-call guard, not evidence of Groq billing exhaustion.
4. The run observed both upstream Groq 429s and the local guard exhaustion; these are distinct failure classes.
5. The canonical recovery route contained a fail-open path: it could continue to Groq Boss and Investigator after Right-hand returned unavailable or invalid output.
6. Right-hand output was parsed in the recovery route but was not validated with the canonical Right-hand control validator before Boss execution.

## Code fixes

### 1. Recovery is fail-closed before Boss

File: `artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts`

- Recovery now imports and uses `validateAtlasRightHandControl`.
- A Right-hand response is considered completed only when the provider call completed, JSON parsed successfully, and the canonical Right-hand control contract validates.
- If Right-hand is unavailable or invalid, the route throws `ATLAS_CONTROL_UNAVAILABLE` before calling Groq Boss.
- The durable case is parked at `canonical-control-unavailable` so it remains eligible for later recovery.
- Boss and Investigator are never entered from an unreviewed recovery state.

### 2. Recovery boundary is enforced by static checks

File: `scripts/check-canonical-control-recovery-boundary.mjs`

Added assertions that:
- Right-hand output is validated before Boss.
- the Right-hand guard appears before `runGroqBossDiscovery`.
- `ATLAS_CONTROL_UNAVAILABLE` is produced for unavailable/invalid oversight.
- the durable recovery action remains `canonical-control-unavailable`.

The check is now part of `pnpm run check:bureau`.

### 3. Right-hand hard-429 key rotation regression

File: `artifacts/api-server/src/src/test/groq-right-hand.test.ts`

Added a regression proving that a hard Groq 429 on the first configured Right-hand key advances to the next configured key and can succeed with the same canonical model. No production rate-limit was increased.

## Groq 429 assessment

The Right-hand code already had:
- canonical GPT-OSS 120B;
- bounded GPT-OSS 20B fallback;
- bounded 429 retry;
- hard-429 detection;
- configured-key rotation;
- provider diagnostics without raw secret-bearing bodies.

The new regression confirms the configured-key rotation path.

Therefore the observed 429 is not currently identified as a missing key-rotation code defect. It is an external capacity/rate-limit condition unless the provider diagnostic shows a request-specific 400/403/model-permission problem.

A new key should not be pasted into source or chat. It should be installed through the existing secret configuration. A key in the same Groq project shares that project's request quota; organization-level token limits and organization-wide spend limits can still apply across keys. A key from a different project may have different project request limits, but organization ceilings still apply.

## Verification

Final verified commit: `7e17a19cf42648d6e115fa96e72ec16f85cd79b0`

Final diff from the starting commit contains only:
- canonical recovery route;
- Right-hand regression tests;
- Bureau check registration;
- canonical recovery boundary script;
- this audit document.

Verification on the final commit:
- Apex/Bureau static suite: PASS
- canonical recovery boundary: PASS
- workspace typecheck: PASS
- API build: PASS
- strict provenance/provider-cache tests: PASS
- Groq Boss control-plane tests: PASS
- Groq Right-hand control-plane tests: PASS
- five consecutive full-codebase audits: PASS
- ephemeral/local live-smoke API test in the audit workflow: PASS
- build-no-source-mutation check: PASS

One intermediate CI attempt failed on a TypeScript inference error in the new recovery state declaration. It was corrected immediately; the final verification passed.

## Live-run policy after this audit

Do not start another external Apex research run from this change set automatically.

The next external run should use the canonical UI-equivalent launch contract only after Groq Right-hand provider capacity is known to be available.

The saved case remains the recovery subject; do not create a second discovery case merely to bypass the failed control transition.

## Safety conclusion

The recovered control path now preserves:

Right-hand unavailable/invalid
→ stop before Boss
→ durable review state
→ recoverable control boundary

It does not bypass Right-hand oversight, admission, evidence provenance, or deterministic terminal gates.
