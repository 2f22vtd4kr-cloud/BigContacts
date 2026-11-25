# SEC EDGAR direct fetch

Apex Atlas supports direct HTTP retrieval as a browser-fetch provider and as a fallback after the model-selected provider and other configured providers.

## Required SEC request identity

The SEC asks automated clients to identify themselves with a descriptive User-Agent that includes an organization/application name and a monitored email address. Configure this environment variable in the API runtime:

```text
SEC_USER_AGENT=Apex Atlas research ops@your-domain.example
```

Replace the example address with an address controlled and monitored by the operator. Do not use the placeholder literally. The runtime refuses to send a direct request to `sec.gov` or any `*.sec.gov` host when the value is missing or does not contain an email address. Other hosts use `APEX_BROWSER_FETCH_USER_AGENT` when configured, or the repository-identifying Apex Atlas default.

## Retrieval and diagnostics

- Direct requests use the repository's SSRF-safe pinned transport.
- Redirects are handled manually; every destination is revalidated before another request is sent.
- HTTP failures preserve the upstream status and a bounded (1,500-character), credential-redacted response-body excerpt.
- Transport failures preserve a safe diagnostic summary.
- The trajectory records requested provider, actual provider, attempted providers, provider fallbacks, and per-provider failures.
- A fetched page is claim-grade only when the effective source URL is verified and the Investigator's exact quotation is present in that same observation. A search snippet or failed response is not evidence.

The model remains responsible for choosing whether to fetch, which URL to fetch, and which available provider to request. Runtime code enforces URL safety, SEC request identity, response bounds, source verification, and exact-quote provenance; it does not decide whether a person, company, role, or claim is relevant.
