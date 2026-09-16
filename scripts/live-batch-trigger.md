# Live Bureau batch trigger

This marker intentionally launches the registered live proof plus the five consecutive complete-code audit gate on `main`.

The five audits are sequential and independent; each reruns architecture contracts, typecheck, build, every API test file in isolation, and source-mutation integrity against a fresh checkout.

Final gate restart after replacing the narrow five-lane harness.

Live proof retriggered after Gemini Boss transient-capacity resilience was added to the canonical control plane.
