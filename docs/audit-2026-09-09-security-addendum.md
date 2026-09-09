# Security audit addendum — 2026-09-09

This addendum records the latest forensic closures while `docs/context.md` remains the architecture source of truth.

## Closed in PR #113

### SSRF DNS rebinding / TOCTOU
`artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts` no longer performs a DNS preflight followed by native `fetch` resolution. The safety layer resolves the hostname, rejects any unsafe A/AAAA result, and pins the selected public address into the Node HTTP(S) socket. Automatic redirects remain disabled.

This closes the specific validation-to-connect DNS re-resolution window identified during the audit. OWASP's SSRF guidance warns that validating a domain and then allowing the HTTP client to resolve it again creates a DNS-pinning/rebinding bypass.

### Public API authentication
`artifacts/api-server/src/src/lib/api-auth.ts` now provides a fail-closed bearer boundary for `/api/*`. `/api/healthz` and CORS preflight are explicit public exceptions. All other API requests require `Authorization: Bearer <APEX_API_AUTH_TOKEN>`, with a minimum 32-character configured secret and constant-time comparison.

The application mounts this middleware before the canonical route tree, making it an actual request boundary.

## Important deployment consequence

The API now requires `APEX_API_AUTH_TOKEN`. The secret value must be configured in the deployment environment and never committed. The frontend/API client must send the bearer token through an operator-approved authenticated path; the server must not embed the secret into public frontend assets.

## Verification status

PR #113 was merged as `5581a0134501cc254508cf16824ce00c741c1f38`. At merge time GitHub reported a pending Netlify deploy-preview status and no passing test suite was observed, so this is source-level hardening, not runtime proof.

## Remaining audit rule

Do not declare Apex production-ready yet. Continue the leaf-by-leaf audit through target identity binding, ReAct/tool boundaries, persistence callers, legacy reachability, CI security, telemetry truthfulness, and finally real runtime proof.
