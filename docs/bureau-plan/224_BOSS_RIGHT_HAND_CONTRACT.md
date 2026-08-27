# Volume 224 — Boss and Right-Hand Contract

## Boss (Head Investigator)

**Typical model:** Gemini-class (text reasoning).  
**Input:** Case file, progress map, right-hand note, depth tier.  
**Output:** Structured decision — action id, investigatorPrompt (goals not scripts), evidenceRequirements, rightHandDisposition.

**May:**
- Choose next research *focus* for case-bureau path
- Write investigator goals (“recover public contact surface for X at Y”)
- Accept or override right-hand with a reason

**Must not:**
- Ship numbered search checklists in investigatorPrompt
- Invent contacts
- Call web_search/visit directly
- Block the entire Atlas job if Boss LLM fails when **target dig** path can still run

## Right-hand

**Typical model:** NVIDIA NIM / complementary reasoner.  
**Input:** Case file only (not live SERP).  
**Output:** Recommended action id + rationale + gaps.

**May:** Suggest complementary angles the last investigator missed.  
**Must not:** Browse the web; invent evidence; bind Boss to a forced tool order.

## Accept / override

Boss always emits `rightHandDisposition`. Override requires a concrete reason (progress map / lead chaining), not taste.

## When Case Bureau is idle

Single-target Atlas often goes **straight to Target Contact Agent**. Boss/RH are not required for that path. Architecture must not imply “no Boss = no research.”

