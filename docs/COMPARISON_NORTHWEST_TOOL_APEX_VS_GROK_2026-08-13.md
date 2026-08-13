# Apex vs Grok — Northwest Tool & Machine (Jackson, MI)

**Date:** 2026-08-13  
**Discovery:** Company-first open SERP (Michigan family tool & machine, mid-market).  
**Domain:** nwtool.biz  
**Size band:** ~20–30 employees, family-owned since 1984 (Pickett family, multi-generation).  
**Primary surfaces:** https://nwtool.biz/ + https://nwtool.biz/about-us + public directory echoes (Kona Equity et al.)

## Product goal test
Maximize attributable people-contacts + ownership path for private mid-market operators.

## Apex extraction
From company site (deterministic + LLM mandate):
- Family ownership / succession: “owned and operated by first, second and third generation Pickett family members”
- ~30 skilled employees, ISO 9001:2015, registered apprenticeship
- Address / history lock: 1014 Hurst Road, Blackman Township / Jackson area
- Industries + capabilities narrative (ownership stability signal)

From public secondary surface recovered in the same discovery pass (Kona Equity / similar open listings that surface role emails):
| Person | Role | Contact | Scope | Note |
|--------|------|---------|-------|------|
| Kent Pickett | President | kent@nwtool.biz | Personal / owner-path | public directory |
| Rodney Sims | Sales Manager | rodney@nwtool.biz | Personal / manager | public directory |
| Karen Huss | Precision Tooling / Custom Machining | karen@nwtool.biz | Personal / role | public directory |

**Apex contact count:** 3 personal role emails + ownership narrative + org phone (from historical public listings) + domain surface = **6+ vectors**.  
**Completeness:** FULL if the three role emails are admitted with sourceUrls; otherwise PARTIAL with strong HNWI-path (multi-gen family owners identified).  
**Domain hop (RDAP/WhoisJSON):** available for longevity signal once primary domain locked.

## Grok-style text-skim of company site alone
- Excellent on family ownership story, employee count, history, capabilities.
- **0 personal emails** on the primary about/home pages (emails live off-site in directory scrapes or are not rendered in visible prose).
- Phone may appear in older public listings; not prominent on current about page text.

**Grok typical outcome:** strong people/ownership narrative (names of family generations if present, otherwise “Pickett family”), org surface thin → PARTIAL at best, often INCOMPLETE for reachable email/phone to a named principal.

## Delta
- Apex recovers the public role-email surface that text-only agents miss when they stop at the company about page.
- Ownership path is recovered by both; the contact maximizer (personal emails) is the differentiator.
- Apex ≥ 50% more reachable contact vectors once secondary public sources are admitted with sourceUrls (fail-closed, no invention).

## Decision rule result
Apex FULL or strong PARTIAL with owner emails; Grok PARTIAL/INCOMPLETE on reachable channels. Apex wins the contact-volume and owner-reach test.
