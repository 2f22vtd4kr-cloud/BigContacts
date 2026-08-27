# Volume 295 — Healthz Integrity for Operators

## Before any research claim

`GET /api/healthz` must show search active and dig LLM slots > 0. If `bureauIntegrity` is `critical`, do not run COMPARE for quality claims.

## Typical critical causes

- Missing Serper/Tavily/Exa
- Missing all dig LLMs
- Last agentic step failed all providers

## Soft warn vs hard block

UI may soft-warn on Launch while still allowing dig (operator override). Scoreboard **must not** display milestone pass under critical integrity.
