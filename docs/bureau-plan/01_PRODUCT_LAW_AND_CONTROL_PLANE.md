# Volume 01 — Product Law and Control Plane

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code anchors:** `apex-bureau-orientation.ts`, adaptive assign, final review, `lanes-honesty` / `bureauIntegrity`

---

## 1. Product law (operator + agent)

### 1.1 AI-driven bureau

Trained models perform research the way a strong general agent would: understand the target, invent queries, open primary pages, pivot, stop when evidence is enough. **Tools execute.** **Models decide.**

Code may:

- bound iterations and wall-clock time  
- validate and sanitize findings  
- refuse inventing contacts  
- recover thinly when **all** dig LLMs fail a step  

Code must not:

- replace the model with a fixed search checklist as the default brain  
- skip the model turn after a scripted hop  
- micro-train dig with ranked “prefer domain X” playbooks as research objectives  

### 1.2 Roles

| Role | Model | Responsibility |
|------|--------|----------------|
| **Boss** | **Gemini only** | Plan, assign direction, final card gate |
| **Right-hand** | **NVIDIA** (e.g. GLM) | Free step advice, Reactor live narration |
| **Dig investigators** | Groq → Mistral → Gemini → NVIDIA **failover** | Free ReAct tool loop |
| **Deterministic shell** | TypeScript | Jobs, pause/stop, promote, identity, sanitizers |

**Groq is not Boss.** Groq is dig capacity and last-resort adaptive fallback when Gemini and NVIDIA fail to produce a step—not a “director.”

### 1.3 Cold start / orientation

Every LLM call is memory-less. **`apex-bureau-orientation.ts`** (or equivalent) must inject on every Boss, right-hand, investigator, and dig call:

1. What Apex Atlas is  
2. Goal (real public contacts + source URLs)  
3. Role of this call  
4. Available tool surface  

Without orientation, models behave like generic chat, not bureau staff.

### 1.4 Final review vs adaptive assign

**Bug class already hit in production work:** adaptive right-hand briefly wired to **final-card** NVIDIA prompts. That mis-briefs the model.

**Law:**

- Adaptive / free step assign → free-JSON path (`runNvidiaNimFreeJson` or equivalent)  
- Final card publication → final-review path only  
- Never mix system prompts across those jobs  

### 1.5 Integrity gate

`bureauIntegrity`:

- **critical** if web search active count is 0 **or** dig LLM slots are 0 **or** last agentic step failed all providers  
- UI and operators must not treat research as healthy while critical  
- Launch may soft-warn; operators should fix keys before head-to-head evaluation  

Search providers include Serper (primary), Tavily, Exa—not only Tavily/Exa in honesty math.

---

## 2. Control flow (normative)

```
Operator Launch (canonical body)
  → job pin + optional Boss objective (goals, not tool DAG)
  → for each target (or discovery batch):
       Investigator free ReAct (model chooses tools)
       → persist evidence with URLs
       → promote under outcome + identity gates
       → optional right-hand narration (non-blocking)
       → yield event loop
  → status always readable
  → Stop clears lock; idle is idle
```

Discovery and dig may share a job but must not confuse **phase messaging** (see Volume 04 and 05).

---

## 3. Canonical launch

Only research command for a full bureau run:

`POST /api/ingest/atlas-run` with `CANONICAL_ATLAS_LAUNCH_BODY`  
(`atlas-launch-defaults.ts`, `docs/RUN_BUREAU.md`, `scripts/run-bureau.sh`, UI Launch).

`ENABLE_AUTO_PIPELINE=false` unless operator explicitly enables continuous mass cycles.

Stop: `DELETE /api/ingest/atlas-lock`.

---

## 4. Do-not-regress checklist (control plane)

- [ ] Boss remains Gemini-only for head judgment  
- [ ] Right-hand free assign ≠ final-card review  
- [ ] Orientation on every LLM path  
- [ ] No force_* dig controller  
- [ ] Integrity reflects Serper + dig LLM slots  
- [ ] Auto-pipeline stays off by default  

---

## 5. Handoff to Volume 02

Volume 02 specifies the **Investigator free ReAct loop** and the full **tool surface** the model may choose.
