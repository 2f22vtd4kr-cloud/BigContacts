---
name: Agentic provider quota
description: Distinguishes provider presence, transient token capacity, hard request quota, and canonical recovery boundaries for the Groq-driven Atlas runtime.
---

Configured-provider presence is not live provider capacity. Current canonical roles are Groq Boss and Groq Right-hand for control/oversight, with a Boss-selected configured Groq Investigator capability owning research actions. Historical Gemini/Mistral/DeepSeek references do not authorize reintroducing those transports to the canonical path.

Groq can return a token-type HTTP 429 even while the remaining-request counter is nonzero; error type and reset headers may be more informative than a remaining-token snapshot. A token-window limit is not the same as an exhausted daily/request quota. The runtime may perform its existing bounded wait/retry within the same selected capability and job deadline.

**Why:** Live Run 03 included a token-rate-limit 429 with a short reset hint, followed by a bounded same-capability retry that again received a token 429 with nonzero remaining tokens, no reset hint, and request capacity still available. Later discovery episodes repeatedly ended with `upstream_token_window_wait_exceeded`. That evidence indicates provider capacity/rate limiting, not proof of hard request-quota exhaustion.

**Recovery boundary:** Do not silently switch the selected Investigator credential after a token-window failure. Only an explicit `upstream_quota_exhausted` classification may enter the existing Boss-directed reassignment path, which must select a different configured capability and durably record the transition. Repeated Investigator episodes that end in `LLM_UNAVAILABLE` with a durable `investigator_provider_error` should increment the bounded provider-unavailable breaker—including token-window wait failures after their bounded retry—so the case is parked for review rather than cycling through more Boss/Right-hand control turns. A later usable Investigator episode resets the consecutive-failure streak.

**How to apply:** Inspect the job's actual provider error records, reset headers, `bureauIntegrity`, and `agenticLlmLastOk`; distinguish hard request quota, transient token capacity, invalid structured output, tool failure, and insufficient evidence. Keep a provider outage truthfully unavailable, admit no unsupported candidates, and do not repeatedly launch fresh jobs into a known capacity problem. Do not claim recovery without a later operator-controlled run and reconciled durable results.
