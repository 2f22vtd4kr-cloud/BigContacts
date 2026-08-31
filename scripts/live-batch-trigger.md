# Live Bureau batch trigger

Touch this file to intentionally launch the expensive 10-target provider-backed Bureau audit on `main`.

This narrow path exists for the connected engineering harness because the repository's normal workflow remains manually dispatchable. It is not a product runtime trigger.

Last intentional engineering trigger: 2026-08-31 — fresh 10-target audit after the Groq TPD incident. The live lane is now pinned to `qwen/qwen3.8-27b` with strict model selection and serialized provider pacing; the preflight records rate-limit headers before the Bureau starts. Success still requires actual target research, frozen evidence, trajectory/provenance audit, and an independent blind OpenAI comparison afterward.
