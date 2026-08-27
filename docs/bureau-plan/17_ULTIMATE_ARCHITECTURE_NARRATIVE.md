# Volume 17 — Ultimate Bureau Architecture Narrative

## 17.1 The product we are building

Apex Atlas is a **desk**, not a chatbot. Operators Launch a bureau job. Discovery may find candidates. Dig researches them. Cards accumulate attributable routes. Reactor shows work. Graph shows relationships under identity gates.

The economic and product claim is that **many tools + bureau roles + free model judgment** beat a single chat agent on public OSINT **when the harness does not strangle the models**.

## 17.2 What went wrong historically

Approximately 1700+ commits of work still left live comparisons where:

1. Models were constrained by scripts (force hops, skip llmStep, ordered menus).  
2. Models were free enough to dig but **cards did not reflect** findings.  
3. Ops/UI lied (LIVE when idle, DB 0/5 sticky, Launch no-op).  

Those are harness failures. They cost time and money and look like “Apex is worse than Grok” even when the intended design is the opposite.

## 17.3 Target state (ultimate)

```
Operator
  → Launch (canonical)
  → Boss (Gemini): objective in natural language
  → For each target:
        Investigator free ReAct across full tool surface
        Evidence bag with URLs
        Promote under outcome+identity laws
        Right-hand narrates non-blocking
  → Reactor shows DigSpans + live tools scheme
  → Status always answers
  → Stop → true idle
```

## 17.4 Superiority conditions

Apex is “on steroids” relative to a single LLM **only if**:

1. Free dig is real (trajectory proof)  
2. Tools actually run when chosen (keys + installs)  
3. Cards get the best honest route (promote proof)  
4. Integrity is ok during the run  
5. Independent audit does not systematically win on primary sources  

Missing any one condition → do not market superiority.

## 17.5 Relationship to 1700 commits

Commit count is **history**, not proof. Many commits fixed UI, Redis, launch races, liquid buttons, and partial promote paths. The remaining ultimate work is **keeping free dig pure** and **making card truth automatic**, then **running Volume 16 comparisons until Apex wins on the scoreboard**.

## 17.6 Execution authority

Implementation follows Volume 08 waves.  
Product law lives in `docs/context.md` + this suite.  
On conflict: **fail closed, free models, honest cards**.
