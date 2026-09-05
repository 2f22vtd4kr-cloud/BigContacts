# Volume 81 — Workflow vs Agent: Apex Architecture Decision

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Sources:** Anthropic effective agents / workflow patterns; LangGraph workflows vs agents; policy-driven vs scripted orchestration discussions.

## 1. The decision rule (industry consensus)

| | **Workflow** | **Agent** |
|--|--------------|-----------|
| Control of next step | Code / fixed path | Model policy at runtime |
| Best for | Stable, enumerable steps | Open-ended paths, unknown hop count |
| Cost/latency | Lower, predictable | Higher, compounds per turn |
| Debug | Failures localize to a step | Needs traces/spans |

**Apex split (normative):**

| Subsystem | Mode | Why |
|-----------|------|-----|
| Dig / Investigator | **Agent (ReAct)** | Contact discovery path is not enumerable |
| Promote / sanitize / identity | **Workflow (code)** | Fail-closed rules must not “improvise” |
| Job lifecycle pause/stop | **Workflow** | Safety and ops |
| Boss objective | **Light agent** | Goals, not tool DAG |
| Right-hand narration | **Agent (bounded)** | Language only; cannot invent contacts |
| Registry discovery scheduling | **Workflow** with optional agent dig after | Deterministic admit; free dig after |

## 2. What went wrong historically

Treating **dig** as a workflow (force hops, fixed surfaces) made Apex a brittle script. Single-agent chat stayed policy-driven and won.

Treating **promote** as an agent (model invents phone) would be equally wrong — that must stay workflow/fail-closed.

## 3. Hybrid pattern (recommended)

Anthropic/LangChain practice: **workflow around agents** — outer job is a workflow (targets, timeouts, promote); **inner dig is an agent**.

```
workflow: for target in batch:
  workflow: timeout/cancel guards
  agent: free dig ReAct
  workflow: promote + identity + outcome
  agent optional: RH one-liner
```

## 4. Apex must / must not

**Must:** keep dig policy-driven; keep promote scripted-safe.  
**Must not:** script dig “for reliability”; agent-ize card field invention.
