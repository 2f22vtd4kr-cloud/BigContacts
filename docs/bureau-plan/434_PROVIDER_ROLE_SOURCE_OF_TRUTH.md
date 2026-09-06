# Volume 434 — Provider Role Source of Truth

**Status:** binding architecture correction

## Canonical model

Apex Atlas has **two AI layers**:

### 1. Boss + Right-hand — Bureau oversight

- **Boss = Gemini.**
- **Right-hand = DeepSeek via NVIDIA NIM.**
- Boss and Right-hand consult on the case and choose which Investigator LLM should perform the current research assignment.
- They may recommend useful non-LLM research capabilities.
- They see the investigation as it happens: every investigation act produces a report that is added to the specific target's living research document and made available to Boss + Right-hand.
- They analyse progress, evidence quality, gaps and contamination risk and can redirect, challenge or stop the work.

DeepSeek via NVIDIA NIM is **only** the Right-hand. It never performs the investigation and never appears as an Investigator fallback.

### 2. Investigator LLM pool + non-LLM tools — Actual investigation

The Investigator LLM pool contains **all LLMs explicitly designated/configured as investigators**. Those models are the investigators themselves.

There is **no extra Investigator decision layer** between Boss/Right-hand and this pool.

The selected Investigator LLM conducts the actual research. It can independently choose any permitted non-LLM capability, including search, browser/fetch, registries and OSINT tools. Boss/Right-hand suggestions are guidance, not a forced sequence.

Current investigator implementations include Groq and Mistral. Those names describe investigator models, not a `Groq → Mistral` architecture and not an additional routing stage.

## Research capability surface

The Investigator LLM may independently use:

- **Serper, Tavily, Exa** search;
- HTTP/page visits and browser fetching;
- **Scrapfly, ZenRows** and other approved fetch/browser capabilities;
- RDAP / WhoisJSON and registries;
- public email/username footprinting;
- theHarvester, Maigret, Sherlock and other approved OSINT executors.

These are tools. They are not LLMs, do not belong in the Investigator LLM pool, and do not decide what the Bureau researches.

## Living target investigation document

Every research run has a target-specific living investigation document. After **every investigation act**, it must receive a structured report containing, as applicable:

- selected Investigator LLM;
- action and tool/provider used;
- observation/result;
- exact provenance and retrieval status;
- findings and evidence;
- uncertainty/conflicts;
- open questions and next leads.

That updated document is then available to Boss + Right-hand for the next oversight decision. A final-only summary is not sufficient.

## Research freedom

The Investigator LLM owns the research trajectory. It may:

- choose its own query;
- choose among search providers;
- visit or browser-fetch pages;
- invoke specialist OSINT tools;
- follow unexpected leads;
- corroborate or abandon hypotheses;
- decide when the evidence is sufficient;
- propose which findings deserve promotion.

Boss + Right-hand do not replace this with a fixed checklist. They oversee the work and prevent unsupported data from silently becoming trusted case data.

## Promotion boundary

The Investigator LLM makes the research judgment and proposes promotion/rejection of researched findings. Deterministic code enforces only the non-negotiable provenance, identity, scope, schema, lifecycle and persistence rules.

Boss + Right-hand continuously review the accumulating research record. Their purpose is oversight: no unsupported, misattributed or contaminated result should slip through simply because an Investigator emitted it.

## Explicit prohibitions

The following are architecture violations:

- describing `Groq → Mistral` as the Bureau's Investigator architecture;
- introducing a separate "Investigator LLM decision" layer between Boss/Right-hand and investigators;
- using DeepSeek/NVIDIA as Right-hand only;
- using Gemini as Boss only;
- treating Tavily, Exa, Serper, Scrapfly or ZenRows as LLMs;
- hiding investigation acts from the target's living research document;
- giving Boss/Right-hand only the final result instead of the ongoing reports.

The canonical shorthand is:

```text
BOSS (Gemini) + RIGHT-HAND (DeepSeek/NVIDIA)
                 ↓
      choose Investigator LLM
                 ↓
   INVESTIGATOR LLM + TOOLS
                 ↓
        report every act
                 ↓
       living target document
                 ↺ Boss + Right-hand oversight
```
