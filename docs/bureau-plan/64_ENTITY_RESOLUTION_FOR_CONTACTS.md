# Volume 64 — Entity Resolution for Contact Cards

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Research anchors:** precision/recall tradeoffs in identity resolution; cascading deterministic matching; fail-closed when false merges are costly (outreach to wrong person).

## 1. Why this decides scoreboard wins

Apex does not only “find a phone.” It claims a phone belongs to **this** person.  
Entity resolution literature treats wrong merges as high-cost in sensitive domains. For outreach, **wrong-person contact is worse than empty card**. Apex must optimize like a **precision-first** system (F0.5-style mindset): prefer evidence_only / organization_contact over false direct_*.

## 2. Matching layers (cascade)

Cheap → expensive, same idea as production identity stacks:

| Layer | Apex mechanism | Cost |
|-------|----------------|------|
| Exact normalized name + employer/issuer | EDGAR admit, companyNameForSecondary | Low |
| Token surname required | identityNameTokens / surname gate | Low |
| Host collision list | assessIdentityCollision | Low |
| personName field ≠ target surname | collision risk | Low |
| Filing CIK / company number stable id | allows graph edge despite name ambiguity | Medium |
| Boss/RH judgment on borderline bag | final review only on **candidates** | High |
| Human operator | desk review | Highest |

**Do not** jump to LLM “they seem the same” without earlier layers.

## 3. Precision vs recall for Apex

| Error | Product cost | Policy |
|-------|--------------|--------|
| False personal promote (wrong human) | High — trust death, legal/ethics | Block; organization_contact or evidence_only |
| Miss true personal email | Medium — lost reach | Acceptable if evidence retained for retry |
| Org phone labeled direct | High — false superiority vs Grok | Force organization_contact |

## 4. Signals that increase confidence

- Same surname + employer domain in evidence URL  
- SC 13D/G reporting person block for that name  
- LinkedIn URL path matches name tokens  
- Multiple independent primary sources agree  

## 5. Signals that decrease confidence

- Only first name match  
- Wealth-advisor / directory / IR-agency host  
- Generic inbox on unrelated corporate family  
- Nav chrome “names”  
- Deceased markers  

## 6. Implementation checklist

- [ ] Shared `identity-collision` on promote and graph  
- [ ] Expand collision hosts from every scoreboard false positive  
- [ ] Never auto-merge entities solely on first name  
- [ ] Log reason codes when promote blocked (for Reactor honesty)  

## 7. Apex must / must not

**Must:** fail closed on identity.  
**Must not:** treat SERP top result as resolved identity without surname/employer bind.
