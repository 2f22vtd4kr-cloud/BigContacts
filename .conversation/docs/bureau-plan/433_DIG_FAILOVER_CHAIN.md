# Volume 433 — Dig Failover Chain

**Status:** superseded by Volume 434 where this file conflicts.

The Dig investigator lane is **not** the Bureau leadership lane.

- **Boss / Head Investigator = Gemini.** Gemini owns case direction and does not browse or execute web/OSINT tools.
- **Right-hand Advisor = NVIDIA NIM.** NVIDIA owns advisory reasoning and does not browse or execute web/OSINT tools.
- **Dig / Investigator = research-capable investigator model(s).** This lane owns actual web research and model-selected tool use.

The currently enforced investigator failover chain is:

`Groq → Mistral`

This is a capacity/transport fallback for the **Dig capability only**. It is not a hierarchy and must not be described as Boss → right-hand → investigator.

A provider fallback preserves the same research objective and the same model-owned decision rights. It must never inject a fixed search sequence, forced hop, target ranking, or deterministic research playbook.

If neither Dig provider is available, the run fails closed with degraded/critical integrity rather than silently borrowing Gemini or NVIDIA for web research.
