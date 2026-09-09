# Security audit addendum — 2026-09-09

This addendum records the latest forensic closures while `docs/context.md` remains the architecture source of truth.

## Closed in PR #113

### SSRF DNS rebinding / TOCTOU
`artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts` no longer performs a DNS preflight followed by native `fetch` resolution. The safety layer resolves the hostname, rejects any unsafe A/AAAA result, and pins the selected public address into the Node HTTP(S) socket. Automatic redirects remain disabled.

This closes the validation-to-connect DNS re-resolution window identified during the audit.

### Public API authentication
`artifacts/api-server/src/src/lib/api-auth.ts` provides a fail-closed bearer boundary for `/api/*`. `/api/healthz` and CORS preflight are explicit public exceptions. All other API requests require `Authorization: Bearer <APEX_API_AUTH_TOKEN>`, with a minimum 32-character configured secret and constant-time comparison.

## Closed in PR #114

GitHub Actions' isolated local proof services continue to work through an explicit compatibility boundary: only `CI=true` with `NODE_ENV !== production` may bypass the bearer check. Production has no bypass and still requires `APEX_API_AUTH_TOKEN`. Tests force their environment so CI variables cannot mask fail-closed behavior.

## Closed in PR #115

The mounted canonical `/enrich/*` extended-OSINT routes were added to the deterministic Apex mutation boundary. Singular `entityId` is now checked alongside `entityIds`, preventing a caller from pairing an Apex entity ID with a non-Apex declared type and bypassing the row-level check.

## Closed in PR #116

The public `POST /api/ingest/atlas-run` launch entrypoint is now a dedicated canonical handler mounted before the legacy Atlas router. Public launches dispatch only to `runCanonicalAtlasPipeline` or `runCanonicalSingleTargetInvestigation`. The legacy Atlas router remains for status/lock compatibility but no longer owns the public launch request.

A build/test static guard enforces this reachability boundary.

## Important deployment consequence

The API requires `APEX_API_AUTH_TOKEN` outside the isolated non-production CI compatibility boundary. The secret must be configured in the deployment environment and never committed. The frontend/API client must send the bearer token through an operator-approved authenticated path; the server must not embed the secret into public frontend assets.

## Verification status

PR #113 merged as `5581a0134501cc254508cf16824ce00c741c1f38`.
PR #114 merged as `d5c6c424cdfb5d0c556395fae0f832de887676c2`.
PR #115 merged as `8c1fe42d8faeee1491cff814761c22aaac2857da`.
PR #116 merged as `694b860aac47286af6b556c57a223502ea1f2510`.

No passing CI suite or successful Replit runtime proof was observed for these merges. They are source-level hardening and reachability repairs, not runtime proof.

## Remaining audit rule

Do not declare Apex production-ready yet. Continue the leaf-by-leaf audit through target identity binding, ReAct/tool boundaries, persistence callers, remaining legacy reachability, CI security, telemetry truthfulness, and finally real runtime proof.
