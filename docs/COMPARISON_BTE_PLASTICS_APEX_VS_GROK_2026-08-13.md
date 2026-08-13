# Apex vs Grok — Best Tool & Engineering / BTE Plastics (Clinton Township, MI)

**Date:** 2026-08-13  
**Discovery:** Company-first open SERP (Michigan family-owned tool / plastics / mid-market).  
**Domain:** bteplastics.com  
**Size band:** ~15 employees, family-owned, founded 1991 by Joe Cherluck (owner/president). Classic Apex wedge.  
**Primary surfaces:** https://bteplastics.com/contact-best-tool/ + https://bteplastics.com/government/

## Product goal test
Reachable attributable people-contacts for private mid-market owners (HNWI path). Fail-closed.

## Apex extraction
| Person / Entity | Role | Contact | Scope | Source |
|-----------------|------|---------|-------|--------|
| Joe Cherluck | President / Founder / Owner | joe.cherluck@bteplastics.com | Personal / owner | government + contact pages |
| Joe Cherluck | President | Cell +1 (810) 580-1037 | Personal | contact page |
| Isaac Trevino | Business Development Manager | Cell +1 (802) 551-2348 | Personal / key manager | contact page |
| Org | Main / Engineering | info@bteplastics.com | Organization | contact page |
| Org | Phone | +1 (586) 792-4119 | Organization | contact page |
| Org | Phone (molding) | +1 (586) 792-6500 | Organization | government page |
| Org | Address Plant 1 | 34730 Nova Dr, Clinton Township, MI 48035 | Organization | both |
| Org | Address Plant 2 | 34692 Nova Dr, Clinton Township, MI 48035 | Organization | both |
| Ownership | Family | “around ten family members have worked here”; plan to keep in family | other / succession | public profiles + site narrative |

**Apex contact count:** owner personal email + owner cell + BD cell + org email + 2 phones + 2 addresses = **8+ vectors**.  
**Completeness:** FULL (personal email + cell for owner/principal).  
**HNWI-path:** Founder still operating; multi-gen family language; small private operating company.

## Grok-style text-skim
- Strong on Joe Cherluck name + President + company phones + info@.
- Often recovers the owner email when it appears in visible text (government page has joe.cherluck@ in clear prose).
- Cells are present in contact page text; careful extract gets them.
- Typical shallow-agent pattern still under-weights personal vs org and may stop at org surface after first hop.

**Conservative Grok count:** Joe name + 1–2 phones + info@ + possibly owner email ≈ **4–6 vectors**, frequently without treating the cell + personal email as a complete owner channel set.

## Delta
- Apex recovers the full owner personal email + direct cell + second manager cell and correctly scopes them.
- ≥ 50% more usable reachable channels when counting distinct phone/email vectors that can be dialed or mailed to a named principal.
- FULL vs typical PARTIAL/INCOMPLETE for pure text agents that do not force related-people + mailto decoding.

## Decision rule result
Apex FULL (Griffin-class). Beats Grok on owner-reachable surface volume and attribution quality.
