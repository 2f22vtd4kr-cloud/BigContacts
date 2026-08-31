# Live Bureau batch trigger

Touch this file to intentionally launch the expensive 10-target provider-backed Bureau audit on `main`.

This narrow path exists for the connected engineering harness because the repository's normal workflow remains manually dispatchable. It is not a product runtime trigger.

Next intentional engineering trigger: rerun the 10-target discovery-first audit after forensic inspection of run `33402261430`. That run proved Qwen3.8 was reachable and generated real model-selected searches, but the 8K TPM ceiling still caused repeated 429s at a 5-second cadence, leaving 0 admitted candidates. The next checkout pins Qwen3.8 strictly, serializes the agentic lane, uses a 30-second minimum interval, and fail-closes preflight when Groq TPM headroom is insufficient. Success still requires actual target research, frozen evidence, trajectory/provenance audit, and an independent blind OpenAI comparison afterward.
