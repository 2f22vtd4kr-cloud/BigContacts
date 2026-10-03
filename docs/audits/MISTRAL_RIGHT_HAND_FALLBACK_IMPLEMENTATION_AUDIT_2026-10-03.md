# Mistral Right-hand Fallback Implementation Audit — 2026-10-03

## Scope

This audit reconciles the current `main` source with the 2026-10-03 successor handoff and records implementation work performed without making another live Mistral request or launching Apex Atlas.

## Source lineage

The repository had already advanced beyond the handoff references before this audit:

- `90d71b4f60924a13ee67348466d367672e5dce69` → `73fa5773139cc9099aa784538cb0959ddfc2ca90`: 5 commits ahead.
- `0e1321e0bc8297abd42e742d724e507986ed6227` → `73fa5773139cc9099ddfc2ca90`: 30 commits ahead.
- `73fa5773139cc9099aa784538cb0959ddfc2ca90` had already landed the genuine Ministral fallback boundary.
- This audit's final documentation state is `36dc6b25839b547ce43ddbb7ff43162a66b7b8a1`.

## Current Right-hand implementation

Canonical adapter:

`artifacts/api-server/src/src/lib/mistral-right-hand-reasoning.ts`

Current model candidates:

1. `mistral-small-2603`
2. `ministral-14b-2512`
3. `ministral-8b-2512`
4. `ministral-3b-2512`

The historical `mistral-small-latest` alias is absent from the production candidate list.

Candidate selection is constrained by the live `/v1/models` catalog and the Right-hand role. Generic Investigator credentials are not used.

The adapter keeps a process-wide 1.1-second request gate, bounded 503 retry, bounded short-window 429 retry, and a special zero-limit 429 path that records the attempt and does not retry the same model.

That special path does **not** assert that a zero request-minute header proves permanent zero entitlement. It only avoids spending another request on the same candidate before advancing to the next bounded Right-hand candidate.

## Diagnostics implementation

`artifacts/api-server/src/src/lib/provider-error-diagnostics.ts` now retains, in redacted/clipped form:

- top-level provider error message;
- error type;
- error param;
- error code;
- message length/digest;
- status;
- quota signals where present.

The Right-hand attempt diagnostic also retains:

- HTTP status;
- requested model;
- role-scoped key name;
- non-secret key fingerprint;
- retry counts;
- Retry-After;
- x-ratelimit-* headers;
- structured provider-body summary.

Credential values are not retained.

This directly addresses the earlier `[object Object]` loss of provider detail.

## Regression coverage

`artifacts/api-server/src/src/test/mistral-right-hand.test.ts` now covers:

- canonical Small 4 model;
- genuine cross-family Ministral fallback list;
- role-scoped credential status without exposing credentials;
- documented top-level Mistral error fields;
- mocked Small 4 HTTP 429 with zero-looking request-minute headers;
- deterministic advance from Small 4 to Ministral 14B without a second Small-4 request.

No live provider call is performed by these tests.

## External capability evidence

Mistral's current model documentation lists Chat Completions and Structured Outputs for:

- `mistral-small-2603`;
- `ministral-14b-2512`;
- `ministral-8b-2512`;
- `ministral-3b-2512`.

Current Mistral documentation also states that API keys are Workspace-scoped and that usage/rate limits are governed through Workspace/Organization controls.

Recent Reddit reports independently describe first-request HTTP 429 behavior for Mistral Small/Medium on Free accounts while Ministral models work. These reports are community evidence only and do not establish the user's Workspace entitlement.

## Live-provider status

No new live Mistral request was made.

No Mistral Small retry was made.

No fallback smoke test was made against the external provider.

No Apex Atlas launch was made.

The previously captured Small-4 result remains the relevant live evidence: HTTP 429 with zero-looking request-minute headers. The effective provider-side cause remains unresolved.

## Verification status

Source inspection was performed against the current repository HEAD and the modified files were re-fetched after each write.

A current GitHub Actions result for the exact post-change `main` push is not independently observable through the available workflow connector. Therefore this audit deliberately does **not** claim that the current commit is CI-green.

The next verification step is local/CI execution of the Right-hand test suite, provider-diagnostics coverage, boundary checks, typecheck, and API build. A live provider test remains unnecessary until those gates pass and the user explicitly authorizes one.

## Operational conclusion

The Right-hand implementation has moved from a same-family alias fallback to a bounded, catalog-gated cross-family fallback. Diagnostics are materially more informative while remaining redacted.

The architecture remains fail-closed: Right-hand failure cannot silently become Investigator execution, and no research/evidence/card state is fabricated on provider failure.

