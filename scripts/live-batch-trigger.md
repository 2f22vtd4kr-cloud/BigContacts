# Live Bureau batch trigger

Touch this file to intentionally launch the expensive 10-target provider-backed Bureau audit on `main`.

This narrow path exists for the connected engineering harness because the repository's normal workflow remains manually dispatchable. It is not a product runtime trigger.

Last intentional engineering trigger: 2026-08-31T13:00:00Z — rerun after compacting model-facing state, switching the audit investigator to Groq GPT-OSS 20B low-reasoning, and removing the artificial 20s inter-call delay.
