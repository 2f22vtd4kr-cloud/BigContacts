# Volume 31 — Boss and Right-Hand Protocol

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Boss — Gemini

### Owns
- overall case direction and research objective;
- prioritization and strategic replanning;
- ongoing bureau orchestration;
- final case-level review/judgment where configured.

### Does not own
- execution of the Investigator's web/OSINT tool loop;
- invented contacts or deterministic research sequences.

The Boss receives case state and evidence and directs the bureau at the strategic level.

## Right-hand — DeepSeek via NVIDIA NIM

### Owns
- case-file critique;
- evidence-gap analysis;
- analysis of ongoing bureau work and results;
- advisory recommendations back to the Boss;
- optional non-blocking narration/analysis.

### Does not own
- web browsing;
- OSINT execution;
- the Investigator LLM decision loop;
- control of the Investigator's tool sequence;
- substitution for a failed Investigator LLM.

**DeepSeek is the Right-hand model. It is not an Investigator LLM.**

## Investigator LLM pool

The Investigator LLM pool is the **additional model-decision step** inside the research loop. On every ReAct turn, the Investigator LLM receives the target, objective, current evidence/trajectory and the complete live research capability surface. It chooses exactly one next action or `done`.

The current Investigator adapters are Groq and Mistral. They are implementation adapters, not the definition of the role. Additional Investigator LLM adapters may be added without changing the control flow.

The Investigator model has access to capabilities such as **Serper / Tavily / Exa search, HTTP visit, Scrapfly / ZenRows browser escalation, registries, RDAP/WhoisJSON, theHarvester, Holehe, Maigret and Sherlock**. These are tools/capabilities, not LLMs.

## Logical architecture

```
Launch
  → Boss (Gemini): case direction / orchestration
  → Right-hand (DeepSeek via NVIDIA NIM): critique / evidence gaps / ongoing-work analysis / advice
  → Investigator LLM decision
       → model chooses ONE research capability
       → Serper / Tavily / Exa search
       → HTTP visit / browser
       → Scrapfly / ZenRows escalation
       → registry / domain / OSINT capability
       → observation returns
       → Investigator LLM reasons/pivots/stops
       ↺
  → deterministic evidence / identity / provenance gate
  → card / promotion
  → Right-hand and Boss review as configured
```

The diagram describes role ownership, not a mandatory research path. The Right-hand may advise the Boss while the bureau is operating, but it does not enter the Investigator's tool loop.

## Provider law

- **Boss:** Gemini only for the Boss role.
- **Right-hand:** DeepSeek via NVIDIA NIM only for the Right-hand role.
- **Investigator:** configured Investigator LLM adapters only; current adapters are Groq and Mistral.
- **Research providers:** Serper/Tavily/Exa and Scrapfly/ZenRows are selected/used as research capabilities by the Investigator loop.
- No role may silently borrow another role's model when its own provider fails.
