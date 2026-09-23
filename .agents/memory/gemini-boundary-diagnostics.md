---
name: Gemini boundary diagnostics
description: What bounded Apex telemetry established about intermittent Gemini Right-hand and Boss latency.
---

Gemini Right-hand latency must be interpreted per model attempt, not as a credential or endpoint health check. A request can reach the per-request deadline on one Gemini 3 model while the bounded fallback returns HTTP 200, and the same primary model can succeed on a later run. Request and prompt byte counts help rule out oversized payloads; HTTP status and abort-deadline fields distinguish provider latency from application rejection.

**Why:** Live Apex runs showed a small Right-hand request timing out on `gemini-3.8-flash` while `gemini-3.7-flash` succeeded, then a later `gemini-3.8-flash` request succeeded. The separate Boss boundary timed out twice without an HTTP response on a larger real prompt, so it must not be conflated with Right-hand behavior.

**How to apply:** Preserve bounded fail-closed model fallback until telemetry demonstrates an application defect. Investigate Boss generation as its own boundary; do not change timeout values solely because one model attempt timed out.