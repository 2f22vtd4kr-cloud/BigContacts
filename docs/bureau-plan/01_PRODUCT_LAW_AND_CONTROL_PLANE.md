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
| **Boss** | **Gemini** | Case direction, strategic brief, prioritization, final case-level judgment |
| **Right-hand** | **DeepSeek via NVIDIA Integrate** | Case-file critique, evidence-gap analysis, advisory recommendation; non-blocking where appropriate |
| **Discovery / Dig investigator** | **Groq → Mistral** | Actual web/OSINT research, tool selection, queries, pivots, evidence collection, stopping |
| **Tools** | Search/fetch/registry/OSINT backends | Execute the investigator's selected action |
| **Deterministic shell** | TypeScript | Jobs, budgets, permissions, provenance, identity gates, promotion, persistence, telemetry |

**Critical boundary:** Gemini and NVIDIA do **not** conduct Apex web research. The Dig investigator lane is the only LLM lane that selects and executes web/OSINT research actions, with Groq → Mistral as its provider failover.

Provider failover is transport infrastructure, not hierarchy. A Mistral fallback receives the same objective/state and independently chooses its next action; it never receives a scripted hop.

### 1.2 Cold start / orientation

Every LLM call is memoryless. `apex-bureau-orientation.ts` must provide the relevant product identity, objective, role, available tools, evidence/provenance rules and current state. Orientation informs the model; it does not dictate a search sequence.

### 1.3 Integrity

`bureauIntegrity=critical` means research quality is not healthy. Provider readiness must distinguish configured from actually responding. A configured Boss or right-hand key does not satisfy the Dig capability requirement.

---

## 2. Canonical control flow

```
Operator Launch
  → case/job state
  → Boss strategic direction (Gemini; no browsing)
  → discovery investigator (Groq → Mistral)
       → model chooses tool/action
       → tool executes
       → typed observation returns
       → model reasons/pivots/stops
  → model-emitted candidate findings
  → deterministic identity + provenance admission gate
  → admitted person
  → free-ReAct Dig investigator (Groq → Mistral)
  → evidence/contact promotion + rehydration
  → Right-hand advisory/final case review where configured
```

The arrows describe ownership boundaries, not a mandatory research path. The investigator may search, visit, pivot, use registry/OSINT capabilities, or stop in any model-selected order.

---

## 3. Discovery admission boundary

Raw page text and tool observations are not candidates. The explicit boundary is:

```
RAW OBSERVATION
   ↓
MODEL HYPOTHESIS
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

## 4. Dig / free ReAct

The Dig loop is model-selected. Healthy turns use **Groq → Mistral** only. No Gemini/NVIDIA fallback is permitted in this capability lane. If the investigator pool is unavailable, the runtime fails closed or reports degraded integrity; it does not substitute a scripted search.

`done` is a model decision, subject to lifecycle/budget/provenance guards. Empty evidence is an honest outcome.

---

## 5. Canonical launch

Full bureau execution uses `POST /api/ingest/atlas-run` with the repository's canonical launch defaults. `ENABLE_AUTO_PIPELINE=false` by default.

Replit production path: one API workflow on port 8080; desk at `/`; API under `/api/`.

---

## 6. Do-not-regress checklist

- [ ] Boss remains Gemini.
- [ ] Right-hand remains DeepSeek via NVIDIA Integrate.
- [ ] Gemini/NVIDIA never become Dig browsers.
- [ ] Dig/discovery investigator remains Groq → Mistral.
- [ ] Model selects research actions; no force-hop controller.
- [ ] Discovery admission uses model-emitted findings, not proxy/auto-extract identity.
- [ ] HTTPS provenance and scope are preserved through promotion.
- [ ] Provider failure is observable and cannot become scripted research.
- [ ] Auto-pipeline remains off by default.

---

## 7. Handoff to Volume 02

Volume 02 defines the investigator free-ReAct loop and the model-selectable tool surface.
