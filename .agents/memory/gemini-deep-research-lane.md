---
name: Gemini Deep Research lane
description: Durable boundary for the asynchronous Gemini Deep Research integration and its dedicated quota pool
---

## Rule

Gemini Deep Research is an explicit, target-scoped review lane, separate from high-volume Gemini Flash-Lite work. It uses only the dedicated key slots 11–13, runs asynchronously, and must never directly promote identity, ownership, access, contacts, or outreach state.

**Why:** Deep Research jobs are expensive and multi-minute, while Apex Atlas must remain evidence-led and fail closed. Keeping the lane opt-in prevents continuous scheduling from silently spending quota or turning an AI report into authoritative evidence.

**How to apply:** Start it only through the dedicated research job route, persist the report and citations for human review, expose its key pool separately in status health, and verify the configured Google agent identifier before switching to a newer preview version.