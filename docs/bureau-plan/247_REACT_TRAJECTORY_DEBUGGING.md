# Volume 247 — ReAct Trajectory Debugging Methods

## What a trajectory is

Ordered record of a tool-using agent run. Classic ReAct step:

`Thought (optional) → Action (tool + args) → Observation (tool result)`

Repeat until final answer / `done`. Modern stacks often use **native function calling** instead of text-parsed `Action:` lines; the trajectory is still the sequence of model messages + tool results.

ReAct’s paper claim: interleaving reasoning with environment feedback improves **interpretability and diagnosability** — humans can see what came from tools vs model priors.

## What to log (minimum viable debug set)

| Field | Why |
|-------|-----|
| Step index | Order |
| Thought / reasoning (if any) | Intent |
| Tool name | Action |
| Tool args (redact secrets) | Reproducibility |
| Observation summary / size | What the model saw |
| Errors / status | Failures |
| Model id, tokens, latency | Cost/perf |
| Final findings / answer | Outcome |
| Stop reason | done / timeout / maxIter / parse fail |

Industry practice (LangSmith, Honeycomb Agent Timeline, AgentDebugX-style toolkits): bind all of this under a **conversation / job id**.

## Debugging methods

### 1. Manual trajectory read
Scan step-by-step for the **first false step**: bad query, empty observation treated as fact, repeated identical action, promote without URL, early `done`.

### 2. Structural metrics
- Tool call counts by name  
- Unique queries ratio  
- Visit rate after search  
- Parse-fail rate  
- Steps until first finding  

Empty card + zero `web_search` spans → L-NO-DIG, not “private target.”

### 3. Failure taxonomy on the trajectory
Examples: fabricated evidence (claim not in any observation), ignored observation, tool error not recovered, loop/stagnation, handoff to wrong owner.

### 4. Offline replay (fixed DAGs)
For graph workflows with stable nodes: pin upstream outputs, re-run one node, score with rubrics (PROTEA-style). **Less applicable** to pure open ReAct (dynamic tool choice); still useful for Boss→investigator fixed case steps.

### 5. Product Timeline UI
- **Honeycomb Agent Timeline:** lanes by `gen_ai.agent.name`, filter failures, inspect tool spans  
- **LangSmith:** Messages/trajectory view, drill to tool run details, subagent fanout  
- **Apex DigSpan:** desk-native equivalent — must show tool name, summary, status, jobId  

### 6. Detect → Attribute → Recover → Rerun
AgentDebugX-style loop: normalize events to a portable trajectory, attribute blame to agent+step, propose one fix, re-run.

## Apex DigSpan as ReAct debugger

| ReAct concept | DigSpan / live log |
|---------------|-------------------|
| Trajectory | Ordered spans for jobId |
| Action | spanType tool + name |
| Observation | resultSummary |
| LLM thought/action choice | spanType llm |
| Promote | spanType promote |
| Multi-agent | agentName lanes |

**Operator debug script:** open DigSpan → count web_search/visit → inspect last observation before `done` → check promote span → if evidence exists but card empty, L-PROMOTE not dig.

## Anti-patterns in debugging

- Judging only final card without trajectory  
- Re-running end-to-end when the bug is one bad observation format  
- Logging prompts with secrets  
- Collapsing all tools into one “enrichment” span  

