# Volume 01 — Product Law and Control Plane

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code anchors:** `apex-bureau-orientation.ts`, Atlas orchestration, discovery admission, `bureauIntegrity`

---

## 1. Product law

Apex Atlas is a model-led OSINT research bureau. Models decide research; tools execute. Deterministic software protects lifecycle, safety, provenance, identity integrity, budgets, persistence and promotion honesty.

Code may:

- bound iterations and wall-clock time;
- validate and sanitize findings;
- reject malformed/non-person identities;
- require HTTPS provenance for promoted evidence;
- preserve organization/contact scope;
- fail closed when providers or evidence are insufficient.

Code must not:

- replace the model with a fixed research checklist;
- inject force hops or mandatory tool sequences;
- choose candidates by fame, wealth or a ranked source list;
- turn snippets, labels, addresses, departments or organizations into people;
- use Boss/right-hand models as hidden web-research fallbacks.

### 1.1 Canonical roles

| Role | Model/provider | Responsibility |
|------|----------------|----------------|
| **Boss** | **Gemini** | Case direction, strategic orchestration, prioritization, ongoing bureau direction, final case-level judgment |
| **Right-hand** | **DeepSeek via NVIDIA NIM** | Case-file critique, evidence-gap analysis, ongoing bureau-work/result analysis, advisory recommendation to Boss |
| **Investigator LLM pool** | **Current adapters: Groq + Mistral** | The additional model-decision step that selects each research action, reads observations, pivots, evaluates evidence and decides when to stop |
| **Research tools** | **Serper / Tavily / Exa / Scrapfly / ZenRows / registries / OSINT** | Execute the Investigator's selected capability |
| **Deterministic shell** | TypeScript | Jobs, budgets, permissions, provenance, identity gates, promotion, persistence, telemetry |

**Critical boundary:** The Investigator LLM is the only LLM role that selects actions inside the web/OSINT research loop. DeepSeek via NVIDIA NIM remains the Right-hand and does not participate in investigation. Gemini remains Boss and does not participate in investigation.

The current Groq/Mistral list is an implementation pool, not a `Groq → Mistral` research architecture. Adapter fallback changes model transport/capacity only; it never dictates research strategy.

### 1.2 Cold start / orientation

Every LLM call is memoryless. `apex-bureau-orientation.ts` must provide the relevant product identity, objective, role, available tools, evidence/provenance rules and current state. Orientation informs the Investigator; it does not dictate a search sequence.

### 1.3 Integrity

`bureauIntegrity=critical` means research quality is not healthy. Provider readiness must distinguish configured from actually responding. A configured Boss or Right-hand key does not satisfy the Investigator capability requirement.

---

## 2. Canonical control flow

```
Operator Launch
  → case/job state
  → Boss strategic direction / orchestration (Gemini)
  → Right-hand advisory analysis (DeepSeek via NVIDIA NIM)
  → Investigator LLM decision
       → one model-selected research capability
       → tool / browser / OSINT executes
       → typed observation returns
       → Investigator LLM reasons/pivots/stops
       ↺
  → model-emitted candidate findings
  → deterministic identity + provenance admission gate
  → admitted person
  → free-ReAct Investigator LLM
  → evidence/contact promotion + rehydration
  → Right-hand advisory/final case review where configured
  → Boss case-level judgment where configured
```

The arrows describe ownership boundaries, not a mandatory research path. The Investigator may choose **Serper, Tavily, Exa, Scrapfly, ZenRows, HTTP visit, registries, domain lookup or OSINT tools** in any model-selected order.

### 2.1 Important semantic distinction

Search and browser vendors are **tools**, not LLM roles:

- Serper / Tavily / Exa = research/search capabilities;
- Scrapfly / ZenRows = browser/fetch capabilities;
- DeepSeek via NVIDIA NIM = Right-hand model;
- Gemini = Boss model;
- Groq/Mistral = current Investigator LLM adapters.

### 2.2 Discovery admission boundary

Raw page text and tool observations are not candidates. The explicit boundary is:

```
RAW OBSERVATION
   ↓
INVESTIGATOR LLM HYPOTHESIS
   ↓
MODEL-EMITTED finding (action=done)
   ↓
identity + provenance safety gate
   ↓
PROMOTED PERSON
```

The canonical discovery path admits from `result.modelFindings`, not from deterministic proxy tables, snippets, generic extraction or legacy auto-extract bags. A deterministic identity gate may reject obvious garbage; it must not rank research opportunities.

A valid person finding requires a named human plus attributable evidence and source URLs sufficient to distinguish the person from generic text or an organization-only surface.

---

## 3. Dig / free ReAct

The Dig loop is model-selected. The Investigator LLM chooses the next action from the complete live research surface. It is not a fixed Groq→Mistral→tool chain. Current Investigator adapters are Groq and Mistral; if the Investigator pool is unavailable, the runtime fails closed or reports degraded integrity and does not substitute Gemini or DeepSeek/NVIDIA.

`done` is a model decision, subject to lifecycle/budget/provenance guards. Empty evidence is an honest outcome.

---

## 4. Canonical launch

Full bureau execution uses `POST /api/ingest/atlas-run` with the repository's canonical launch defaults. `ENABLE_AUTO_PIPELINE=false` by default.

Replit production path: one API workflow on port 8080; desk at `/`; API under `/api/`.

---

## 5. Do-not-regress checklist

- [ ] Boss remains Gemini.
- [ ] Right-hand remains DeepSeek via NVIDIA NIM.
- [ ] DeepSeek/NVIDIA never enters the Investigator LLM pool.
- [ ] Gemini never enters the Investigator LLM pool.
- [ ] Investigator LLM pool remains a model-decision layer, not a tool/vendor list.
- [ ] Serper/Tavily/Exa remain Investigator-selected search capabilities.
- [ ] Scrapfly/ZenRows remain Investigator-selected browser/fetch capabilities.
- [ ] Model selects research actions; no force-hop controller.
- [ ] Discovery admission uses model-emitted findings, not proxy/auto-extract identity.
- [ ] HTTPS provenance and scope are preserved through promotion.
- [ ] Provider failure is observable and cannot become scripted research.
- [ ] Auto-pipeline remains off by default.

---

## 6. Handoff to Volume 02

Volume 02 defines the Investigator free-ReAct loop and the model-selectable research capability surface.
