# Volume 86 — Hybrid Orchestration Spec (Outer Workflow, Inner Agent)

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Builds on:** Vol 81, Anthropic sequential/evaluator patterns.

## Outer workflow (TypeScript)

1. Accept canonical launch body  
2. Pin job + lock  
3. Optional Boss objective (agent call, goals only)  
4. For each target (sequential default):  
   a. Cancel/pause checks  
   b. **Inner agent dig**  
   c. **Workflow promote**  
   d. Optional RH narrate  
   e. yieldEventLoop  
5. Terminal status; clear lock on stop  

## Inner agent dig

- Full ReAct as Vol 20/71  
- No force tool order  

## Evaluator-optimizer (optional later)

After dig, lightweight critic pass: “list gaps” — does **not** invent contacts; may trigger one re-dig budget if integrity ok.

## Parallelism

Parallel SERP inside one search action OK; parallel targets only with strict rate budgets (usually sequential).
