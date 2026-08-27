# Volume 101 — Free Dig Is Non-Negotiable

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Principle:** When the operator asks Apex to research a person, the **investigator model acts like a capable web researcher** — invent queries, open pages, change course from what it sees — the same way a strong chat agent does. **Not** a checklist of forced surfaces.

## What free dig means

1. Model receives objective + tools + findings so far  
2. Model chooses the next action (search, visit, registry, footprint, done, …)  
3. Tool runs; observation returns with real URLs/errors  
4. Model thinks again  

No `force_company_surface_search` before thought. No ordered “you MUST visit /about.” No GROK-PARITY menu as the dig brain.

## What is NOT “restricting dig”

These are **workflow** around the agent (Anthropic: outer structure, inner autonomy):

| Mechanism | Why it is not a dig script |
|-----------|----------------------------|
| maxIter / hardTimeout | Budget, not tool order |
| Soft “do not repeat identical query” observation | Feedback, model still chooses |
| Sanitizer on promote | Card safety after dig |
| Identity collision on promote | Card safety after dig |
| outcome organization_contact for *-org | Honesty after dig |
| yieldEventLoop | Keep status plane alive |

## What IS banned again forever on dig path

- force_* controllers that skip llmStep  
- Prefer-list domain scoring as dig objective  
- Adaptive “research ladder” identity→structure→routes as the dig brain  
- Refuse-done solely because related officers missing when contacts exist  

## Test of principle

If a human researcher would freely Google and open the company site, Apex dig must be allowed to do the same without a stage machine telling it the hop order.

## Apex must / must not

**Must:** llmStep every dig turn on healthy path.  
**Must not:** reintroduce playbooks to “stabilize” scoreboards — stabilize with **promote and honesty**, not scripts.
