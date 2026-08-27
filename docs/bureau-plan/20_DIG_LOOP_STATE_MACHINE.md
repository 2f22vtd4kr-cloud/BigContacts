# Volume 20 — Dig Loop State Machine

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code:** `artifacts/api-server/src/src/lib/agentic-web-research.ts`

## States

| State | Meaning | Transitions |
|-------|---------|-------------|
| INIT | Objective + target loaded; orientation applied | → REASON |
| REASON | llmStep across Groq→Mistral→Gemini→NVIDIA | → ACT on valid action; → RECOVER if all LLMs null; → END_BUDGET if maxIter |
| ACT | Execute tool | → OBSERVE |
| OBSERVE | Append observation; CONTACT FACTS on HTML; publish DigSpan | → REASON; → END_DONE if action was done and allowed |
| RECOVER | Thin det search+visit once | → OBSERVE or END_FAIL |
| END_DONE | Model finished; bag kept | terminal |
| END_TIMEOUT | hardTimeout; partial findings kept | terminal |
| END_CANCEL | shouldCancel; partial kept | terminal |
| END_BUDGET | maxIter; salvage; partial kept | terminal |
| END_FAIL | unrecoverable | terminal |

## Invariants

1. Every REASON uses free model choice — no force_* inject before llmStep on healthy path.
2. Every ACT publishes a span when jobId known.
3. OBSERVE never invents emails/phones not in tool output or HTML extract.
4. done allowed iff not pure no-op (searches=visits=findings=0).
5. yieldEventLoop between iterations after the first.

## Data carried across states

- `findings[]` bag (auto-extract merges in)
- `history[]` trajectory lines
- `visited` URL set
- `searchCount` / `visitCount`
- `startedAt` for hardTimeoutMs
- `onLiveStep` callback

## Depth profiles

| RESEARCH_DEPTH | Typical maxIter | Notes |
|----------------|-----------------|-------|
| fast | ~10 | bulk |
| standard | ~16 | default parity |
| deep | ~20 | head-to-head |

Absolute caps must not silently clip deep below configured value.

## Pseudocode

```
function runAgenticWebResearch(input):
  state = INIT
  load objective, tools schema, orientation
  for i in 0..maxIter-1:
    if cancel: return END_CANCEL
    if now - startedAt > hardTimeout: salvage; return END_TIMEOUT
    if i > 0: yieldEventLoop()
    action = llmStep(buildPrompt(history, findings))
    if action is null:
      action = deterministicRecoveryOnce()
      if action is null: return END_FAIL
    if action.action == done:
      if isPureNoop(): append soft reject observation; continue
      salvage; return END_DONE
    result = execute(action)
    publishSpan(action, result)
    history.append(observation)
    mergeAutoFacts(result)
  salvage; return END_BUDGET
```

## Failure modes mapped to states

| Symptom | State issue |
|---------|-------------|
| force hop steals turn | ACT without REASON |
| empty card after dig | END_DONE without promote outside loop |
| status timeout | missing yield in loop |
| parse_fail burn | REASON without retry |
