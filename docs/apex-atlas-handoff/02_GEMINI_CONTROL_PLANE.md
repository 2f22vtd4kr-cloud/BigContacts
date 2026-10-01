# Apex Atlas — Gemini Control Plane Deep Handoff

## Current implementation

Current main includes the free-tier Gemini text model pool from PR #434.

File:
artifacts/api-server/src/src/lib/gemini-model-pool.ts

Stable text-control registry currently contains:
- gemini-3.8-flash -> low
- gemini-3.7-flash -> low
- gemini-3.6-flash -> minimal
- gemini-3.5-flash -> minimal
- gemini-3.5-flash-lite -> minimal
- gemini-3.1-flash-lite -> minimal

Role preference:
Right-hand:
3.5 Flash-Lite, 3.1 Flash-Lite, 3.6 Flash, 3.5 Flash, 3.7 Flash, 3.8 Flash.

Boss:
3.8 Flash, 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite.

The live /models catalog is the entitlement source. The registry is the Apex role/capability contract.

Excluded as ordinary text-control models:
Live, TTS, image, preview/experimental, robotics, embeddings, deep-research, and other specialized families.

## Why this exists

Earlier code effectively had a two-model ladder. Repeated 429s made that fragile. The model pool was introduced so legitimate stable text models exposed to the credential can participate in same-role recovery.

This does NOT mean model hopping defeats project quota.

Google documents Gemini rate limits as per project, not per API key. RPM, TPM, and RPD are distinct dimensions. RPD resets at midnight Pacific time. A model-specific fallback may help when model capacity differs, but cannot magically create new project capacity.

## Error semantics

Current provider logic must distinguish:
- rate_limit_exceeded: per-minute/second request or token limit;
- too_many_requests: short-period burst;
- quota_exceeded: daily quota;
- internal cooldown.

Transient 429s: bounded retry/backoff and, where appropriate, next eligible same-role model.

Daily quota: do not burn retries indefinitely; mark the model/scope and follow the intended fail-closed/rotation semantics.

Never classify every 429 as daily quota.

## Important fixed bug

Right-hand once had this subtle bug:
429 -> retry -> 200 -> break retry loop -> generic failure path -> successful response discarded.

The correct invariant is:
if response.ok, return parsed response immediately.

Keep a regression for 429->200.

## Timeout work

Previous Replit runtime showed an effective 55-second Right-hand timeout despite source defaults. The code was hardened so too-small environment overrides cannot collapse the overall control recovery budget below the intended default.

Conceptual defaults:
- Right-hand overall: 300s.
- Boss overall: 240s.

System status exposes secret-free latency configuration diagnostics.

## Latest live evidence

The latest run:
- Boss: gemini-3.6-flash
- Right-hand opening: gemini-3.5-flash-lite
- terminal Right-hand: gemini-3.1-flash-lite rate_limited
- control turn: 4
- action: stop
- status: unavailable
- Atlas: fail-closed

This proves catalog-driven model selection is active. It does not prove every eligible fallback was usable.

## Questions to answer next

1. What exact Right-hand candidate chain did the replacement credential expose?
2. Which candidates were cooling down and why?
3. Were cooldown scopes tied to credential/project correctly?
4. Was the terminal 429 a provider response or an internal cooldown?
5. Did transient 429s rotate after bounded retry?
6. Did any daily quota classification occur?
7. Was model-catalog caching stale?
8. Could an eligible model be suppressed without durable explanation?
9. Are multiple configured keys separate projects or merely keys in one project?
10. Does every selected model support the exact Interactions request/response contract?

## Official provider research to re-check

Current official pages:
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/api-errors
- https://ai.google.dev/gemini-api/docs/troubleshooting
- https://ai.google.dev/gemini-api/docs/thinking
- https://ai.google.dev/gemini-api/docs/api-key

These pages are time-sensitive. Re-read before altering model selection or retry behavior.

## Architectural rule

Gemini controls the bureau. Investigator performs OSINT. Do not move web research into Gemini just to make the control plane appear reliable.

## Current-main update: PR #439

Main now includes PR #439 (`7f4623f247e3779257de1edcc9f9a3eae751e20c`), which adds up to five configured Right-hand Gemini credentials, per-credential live catalog caching, and per-credential cooldown scopes. This is intended only for legitimate distinct project credentials. Multiple keys in one Google project do not multiply quota. A fresh runtime audit on this newer main is still required.
