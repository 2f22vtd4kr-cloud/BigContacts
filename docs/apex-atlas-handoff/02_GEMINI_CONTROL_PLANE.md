# Apex Atlas — Gemini Control Plane Engineering Volume

## Role law

Gemini Boss and Gemini Right-hand are control/oversight. Groq/Mistral are the Investigator.

The separation must survive provider failure.

## Major historical fixes

The recent engineering sequence included:
- canonical control recovery;
- Right-hand bounded fallback;
- Boss bounded fallback;
- retry/accounting cleanup;
- model-specific thinking contracts;
- Right-hand structured-output 400 compatibility retry;
- Mistral model-catalog request caching;
- daily-quota classification;
- bounded 429 recovery;
- retry-loop correction;
- timeout configuration hardening;
- shared Gemini stable text-model pool;
- credential/project-scoped cooldowns;
- correction of a real 429 -> 200 recovery bug.

Historical merge commits include:
89398c16a036488a82cd9bcc8a896f3e9b6a55be
51e651321371778952f40d526c858c786a8d534c
4cf04304663ef9dce9019ab955d7cb2c13fc2aad
007cfc592509112c9e0010d40bbef17a2d5a1890
f697fd1140a1159992221f3e4ff1b8f4fc03fabf
cf32e7ac77688639420c3a7441096eb02be6b9d4
e8b28f0eb188faa6eacda10d8a3be5d063d76ef3
5d06898706412f43dc3c36d6d56432309a5dc2ff
89a717f6798c4ab3c3a44d22640ca6809fd60e8b
dec0f767d5f1ad660a5f069f5eb6523d30f5c25c
f1fd98457899ec0cbe5689c50463a8cfd54e0282
44efa532cb87349b81905d757743606d12ca6645
86ea581df942d984418e396ca603ef1cc952f0c0
7d4add9c3e3d51444bbc1dd606688b3fccaee7ae
5c18475b9f1663790abba986d0ff0c9ed8febc7a

These are historical context. Re-verify ancestry and current main before touching them.

## Gemini model pool

The two-model hard-coded ladder was expanded into a shared stable text-model pool with model-specific thinking contracts and per-model/project-scoped cooldowns.

Current Google documentation lists stable Gemini text models including 3.8 Flash, 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.5 Flash-Lite and 3.1 Flash-Lite. Google separately lists Live/audio/TTS/image/specialized models. Therefore Live models are not interchangeable text-control fallbacks. Verify the current source/catalog before changing the pool. Official model catalog: https://ai.google.dev/gemini-api/docs/models

## 429 semantics

Google documents:
- rate_limit_exceeded: per-minute/per-second request or token limit; wait/retry with exponential backoff;
- too_many_requests: short-window request pressure; wait/retry;
- quota_exceeded: daily quota; wait for reset or request quota increase.

Google also documents RPM, TPM and RPD as distinct dimensions; limits are per project, not per API key; RPD resets at midnight Pacific time; model-specific limits can differ.

Official references:
https://ai.google.dev/gemini-api/docs/api-errors
https://ai.google.dev/gemini-api/docs/rate-limits
https://ai.google.dev/gemini-api/docs/troubleshooting

## Free-tier constraint

The user wants a free solution during this work. Do not silently introduce paid Gemini billing.

Google's current billing documentation states that the Google Cloud Free Trial does not apply to Gemini API usage beginning March 2026:
https://ai.google.dev/gemini-api/docs/billing/

Multiple projects/credentials can only be considered if consistent with Google's current terms. They are not a guaranteed bypass because Gemini limits are applied per project.

## Thinking contracts

Historical code established:
- Gemini 3.1 Flash-Lite -> minimal
- Gemini 3.8 Flash -> low

The broader pool extends this concept. Verify exact current mappings in source/tests.

## Timeout hardening

A Replit runtime previously showed an effective Right-hand timeout of 55 seconds despite a much larger source default. Code was hardened so stale low overall-timeout overrides cannot collapse the intended recovery budget. Boss received analogous protection, and system status exposes secret-free latency diagnostics.

Verify current main.

## Real 429 -> 200 bug

A Right-hand retry loop once discarded a successful retry: after a retry returned HTTP 200, the code broke out of the 429 loop and fell through generic failure handling.

The fix explicitly accepts successful responses before retry-loop exit.

Verify this remains in current main and has regression coverage.

## Daily quota

The classifier recognizes explicit daily-quota messages such as "Free Tier limit of 500 requests per day has been exceeded" as quota exhaustion rather than endlessly retrying a transient 429 path.

The intended behavior is fail closed for the exhausted model/credential scope without futile same-scope retries.

## Latest real failure

Latest authorized job:
391bbe22-0414-4ed4-965d-5714181af242

Terminal:
2026-10-01T04:08:00.295Z

Boss used gemini-3.6-flash.
Right-hand opening used gemini-3.5-flash-lite.
The terminal control error identified gemini-3.1-flash-lite as rate_limited.

Discovery never reached target research.

## Next Gemini investigation

Answer from source/logs:
1. Which models were eligible at control turn 4?
2. Which were cooling down and why?
3. Were cooldowns credential/project/model scoped correctly?
4. Was the 429 transient or daily quota?
5. Was retry budget consumed correctly?
6. Did model rotation occur correctly?
7. Did Retry-After/backoff affect the decision?
8. Was the Boss replacement credential a distinct project scope from Right-hand?
9. Are all selected stable text models actually supported for the current API contract?
10. Did telemetry omit control events?

Do not solve these by bypassing Gemini or moving control decisions into deterministic code.
