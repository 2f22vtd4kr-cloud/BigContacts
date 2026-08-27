# Volume 31 — Boss and Right-Hand Protocol

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Boss (Gemini)

### When invoked
- Job start: research objective for batch or target
- Adaptive assign: next free tool+query OR stop
- Final card review: publish/review/reject from candidates
- Optional replan after stagnation

### Inputs
- Target identity, company anchors, evidence summary, depth budget, orientation block

### Outputs
- Natural language objective or JSON free step (thought, tool, query, stop)
- Final review: selected values that exist in candidates only

### Never
- Ordered tool DAG as the only output
- Invented phone/email strings
- Acting as dig capacity failover narrator

## Right-hand (NVIDIA)

### When invoked
- Adaptive free step if Boss fails
- Live narration on bureau events (rate-limited, non-blocking)
- Optional case advice endpoints

### Never
- Final-card system prompt during adaptive assign
- Blocking dig on narration failure

## Dig capacity chain

Groq → Mistral → Gemini → NVIDIA for **investigator turns** only. This chain is not Boss hierarchy.

## Sequence diagram (logical)

```
Launch
  Boss.objective?
  loop targets:
    loop dig iterations:
      Investigator.llmStep (capacity chain)
      Tool.execute
      RH.narrate? (async)
    Promote
    Boss.finalReview?
  Stop
```
