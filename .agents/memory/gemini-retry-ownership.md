---
name: Gemini retry ownership
description: Boundary between the shared provider quota gate and Gemini model retry/fallback behavior.
---

Gemini 429/503 handling belongs to the bounded Gemini retry/fallback wrapper. The shared external quota gate must not place Gemini on cooldown for those transient responses before that wrapper can retry the same model or advance to a compatible fallback model; Gemini cooldowns are scoped by model when the gate needs to track non-transient quota responses.

**Why:** The live discovery path exposed that the first Gemini capacity response caused the outer gate to reject the retry as `gemini cooldown`, preventing the Right-hand/Boss model chains from reaching their fallback models even though isolated fallback tests passed.

**How to apply:** When changing provider gating, retry wrappers, or Gemini model chains, test them in production installation order (external gate first, Gemini transient retry second), not only with a mocked native fetch.