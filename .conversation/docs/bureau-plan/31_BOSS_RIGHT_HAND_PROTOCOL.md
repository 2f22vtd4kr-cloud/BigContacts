# Volume 31 — Boss and Right-Hand Protocol

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Boss — Gemini

### Owns
- overall case direction and research objective;
- prioritization and strategic replanning;
- final case-level review/judgment where configured.

### Does not own
- web browsing;
- OSINT tool execution;
- Dig provider fallback;
- invented contacts or deterministic research sequences.

The Boss receives case state and evidence. It may advise what matters next, but the actual web-research trajectory belongs to the investigator lane.

## Right-hand — NVIDIA NIM

### Owns
- case-file critique;
- evidence-gap analysis;
- advisory recommendations and optional non-blocking narration.

### Does not own
- web browsing;
- OSINT execution;
- control of the investigator's tool sequence;
- substitution for a failed Dig provider.

## Dig investigator — Groq → Mistral

This is the **only LLM provider failover chain for the web/OSINT research capability**. It is transport/capacity fallback, not hierarchy.

A provider fallback receives the same objective and current state and independently chooses the next action. It must never inject a search query, hop, source list or scripted recovery.

**Gemini and NVIDIA are explicitly excluded from this chain.** If Groq and Mistral are unavailable, the Dig capability fails/degrades honestly rather than borrowing Boss/right-hand models.

## Logical architecture

```
Launch
  → Boss (Gemini): case direction, no browsing
  → Investigator (Groq → Mistral): free ReAct
       → model chooses tool/action
       → tool executes
       → observation returns
       → model reasons/pivots/stops
  → deterministic evidence/identity/provenance gate
  → card/promotion
  → Right-hand (NVIDIA): critique/advice where configured
  → Boss: case-level judgment where configured
```

The diagram describes role ownership, not a mandatory research path.
