# Volume 94 — Model Routing Table

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

| Role | Canonical model/provider | Responsibility |
|------|--------------------------|----------------|
| Boss / Head Investigator | **Gemini** | Case direction, assignment, selection of an Investigator LLM, strategic orchestration, ongoing bureau oversight, final case-level judgment |
| Right-hand | **DeepSeek via NVIDIA NIM** | Consults with Boss, critiques the case, analyses every investigation report, identifies evidence gaps/risk, recommends Investigator LLM/tool choices and course corrections |
| Investigator LLM pool | **All configured LLMs designated for investigation** | Actual target research: reasoning, queries, pivots, tool use, evidence evaluation, stopping, and promotion recommendations |
| Non-LLM research tools | **Capability pool** | Serper, Tavily, Exa, HTTP/page visit, Scrapfly, ZenRows, registries, RDAP/WhoisJSON, Holehe, Maigret/Sherlock, theHarvester, etc. |
| Promotion / integrity | Deterministic TypeScript | Enforces provenance, identity, scope, lifecycle, schema and persistence; never invents research |

## The only two AI layers

```text
BOSS (Gemini) + RIGHT-HAND (DeepSeek / NVIDIA NIM)
        │
        │ consult, choose Investigator LLM, suggest capabilities
        ↓
INVESTIGATOR LLM POOL + NON-LLM RESEARCH TOOLS
        │
        │ research freely; tools may be chosen independently
        ↓
report after every act → target-specific living investigation document
        │
        └── Boss + Right-hand review every report and guide the continuing work
```

There is **no additional Investigator decision model** between the Boss/Right-hand layer and the Investigator LLM pool.

## Hard role boundaries

- **Gemini = Boss only.** Never an Investigator fallback.
- **DeepSeek via NVIDIA NIM = Right-hand only.** Never an Investigator adapter or Investigator fallback.
- **Groq/Mistral/etc. = Investigator models only when configured/designated for the Investigator pool.** They are the investigators themselves, not a separate control layer.
- **Tavily/Exa/Serper/Scrapfly/ZenRows/etc. = tools.** They are not LLMs and never decide research.

## Selection and continuous oversight

Before an investigation assignment, Boss consults the Right-hand and chooses the Investigator LLM from the configured Investigator pool. The Boss/Right-hand may recommend non-LLM tools, but those recommendations are not a fixed playbook: the Investigator LLM may independently choose any permitted capability.

After **every investigation act**, the action, selected Investigator LLM, actual tool/provider, observation, provenance, findings, uncertainty and open questions are appended to the target-specific living investigation document and exposed to Boss + Right-hand. They can then retain, challenge, redirect or stop the work.

The Investigator LLM owns research judgment and proposes what should be promoted. Boss + Right-hand provide continuous oversight so unsupported or contaminated data does not silently become trusted case data. Deterministic gates enforce only the non-negotiable truth/provenance/scope boundaries.
