# Apex Atlas — ReAct Bureau Architecture

**Canonical role law:** Boss = **Gemini**. Right-hand = **DeepSeek via NVIDIA NIM**. Investigation = **the configured Investigator LLM pool + non-LLM research tools**.

Apex is a model-led research bureau. There are **two AI layers only**: the Boss/Right-hand oversight layer and the Investigator LLM layer. There is no extra Investigator decision model between them.

---

## 1. Boss + Right-hand: continuous bureau oversight

### Boss — Gemini

Owns case direction, strategic prioritization, assignment, selection of an Investigator LLM from the Investigator pool, ongoing orchestration and final case-level judgment.

### Right-hand — DeepSeek via NVIDIA NIM

Consults with the Boss, critiques the case, analyses evidence gaps and the ongoing bureau work/results, and advises which Investigator LLM or research capability should be used next.

DeepSeek via NVIDIA NIM is **not an Investigator** and is never an Investigator fallback. Gemini is also never an Investigator.

Boss/Right-hand suggestions are guidance. They do not turn the investigation into a fixed checklist.

---

## 2. Investigator LLM pool + non-LLM tools

The Investigator LLM pool contains **all LLMs designated for actual investigation**. Those models are the investigators themselves. Current implementations include Groq and Mistral; these names must never be described as a separate `Groq → Mistral` architecture or an additional decision stage.

The selected Investigator LLM receives the assignment and the accumulating target/run research record. It owns the research trajectory and may independently select any permitted non-LLM capability.

Available capabilities include:

- **Serper, Tavily, Exa** search;
- HTTP/page visits;
- browser/fetch capabilities including **Scrapfly and ZenRows**;
- RDAP / WhoisJSON and registries;
- public email/username footprinting;
- theHarvester, Maigret, Sherlock and other approved OSINT executors.

Tools are capabilities, not stages. The Investigator can use a tool even when Boss/Right-hand did not explicitly suggest it.

---

## 3. Two-layer ReAct loop

```text
BOSS (Gemini) + RIGHT-HAND (DeepSeek/NVIDIA)
        │
        │ consult + choose Investigator LLM + suggest tools
        ↓
INVESTIGATOR LLM POOL
        │
        │ selected Investigator reasons and acts
        ├── choose search/browser/registry/OSINT capability
        ├── receive observation
        ├── evaluate evidence
        └── choose next action or stop
        ↓
REPORT EVERY INVESTIGATION ACT
        │
        ├── action + selected model
        ├── actual tool/provider
        ├── observation + provenance
        ├── findings + uncertainty
        └── open questions / next leads
        ↓
TARGET-SPECIFIC LIVING INVESTIGATION DOCUMENT
        │
        └── Boss + Right-hand receive and analyse the new report
                 ↺ redirect / challenge / continue / stop
```

The report is not a final-only summary. It is appended after every act to the document belonging to that **specific target and specific research run**.

---

## 4. Continuous visibility requirement

After every investigation act, the runtime must expose to Boss + Right-hand:

1. which Investigator LLM acted;
2. what action it selected;
3. which tool/provider actually executed;
4. what observation/result came back;
5. exact source/provenance and retrieval status;
6. findings, conflicts and uncertainty;
7. open questions and possible next leads.

The accumulated record is the shared working context for the next oversight decision.

---

## 5. Promotion

The Investigator LLM owns the research judgment and proposes which researched findings deserve promotion or rejection.

Boss + Right-hand provide continuous oversight so unsupported, misattributed or contaminated data does not silently become trusted case data.

Deterministic code enforces provenance, identity, scope, schema, lifecycle, budgets and persistence. It does not invent research or replace the Investigator's judgment with a scripted search path.

---

## 6. Discovery identity boundary

```text
RAW TOOL OBSERVATION
        ↓
INVESTIGATOR LLM RESEARCH / HYPOTHESIS
        ↓
MODEL-EMITTED FINDING
        ↓
IDENTITY + PROVENANCE SAFETY GATE
        ↓
ADMITTED RESULT
```

Deterministic extraction may preserve literal observations, but it cannot manufacture a person identity from a heading, snippet, address, department, product, organization or other person-shaped string.

---

## 7. Hard invariants

1. There are only two AI layers: **Boss+Right-hand** and **Investigator LLM pool**.
2. There is no separate "Investigator LLM decision" layer.
3. Groq/Mistral/etc. are investigators when designated in the Investigator pool — not a control layer.
4. DeepSeek via NVIDIA NIM is Right-hand only.
5. Gemini is Boss only.
6. Search/browser/registry/OSINT providers are non-LLM tools.
7. Investigator models may independently choose permitted tools.
8. Boss + Right-hand see every investigation act through the living target/run document.
9. No forced search order or fixed hop recipe.
10. Promotion is proposed by the Investigator and constrained by deterministic provenance/identity/scope gates plus continuous Boss/Right-hand oversight.
