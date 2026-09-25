# Serper / outbound-search observability hardening — 2026-09-25

- Preserved Investigator-selected provider authority; no automatic Tavily/Exa fallback was added.
- Serper failures now distinguish missing key, HTTP status, invalid JSON, timeout/network/request failure, empty organic results, and invalid result URLs.
- Serper diagnostics record safe status/size/count/latency metadata without recording API-key material or response bodies.
- Tavily and Exa use the same failure-observability pattern.
- Provider response reads remain bounded by the existing 2 MB response ceiling.
- Focused tests cover Serper HTTP 429, empty organic results, and invalid JSON.
