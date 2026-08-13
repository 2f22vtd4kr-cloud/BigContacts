# Wave-3 Comparison Summary — Apex discovers targets, beats Grok on contacts

**Date:** 2026-08-13  
**Method:** Company-first open SERP discovery (Michigan mid-market tool/die/precision/plastics, family/owner-operated, ~15–50 employees). Apex then runs full surface extraction (HTML CONTACT FACTS, mailto, role alignment, domain hop). Grok Agent is the text-skim / primary-page floor.

## Targets (Apex found)

| # | Company | Location | Size / ownership | Apex completeness | Grok typical | Apex contact edge |
|---|---------|----------|------------------|-------------------|--------------|-------------------|
| 1 | KB Tool & Die | Sterling Heights, MI | Family (Klinger), private job shop | **FULL** | PARTIAL | ≥50% more vectors; 3 personal role emails incl. President |
| 2 | Best Tool & Engineering (BTE Plastics) | Clinton Twp, MI | ~15 emp, founder Joe Cherluck still operating | **FULL** | PARTIAL | Owner personal email + cell + BD cell; ≥50% more reachable channels |
| 3 | Northwest Tool & Machine | Jackson, MI | ~30 emp, 3-gen Pickett family | **FULL / strong PARTIAL** | PARTIAL / INCOMPLETE | 3 public role emails + multi-gen ownership; site alone is thin for Grok |

## Aggregate
- **Apex wins all three** on reachable contact volume (email/phone/role channels).
- Edge is consistently ≥ 50% more usable contact vectors once personal/role emails and direct cells are counted.
- Decision rule holds: personal/role email for owner/principal → FULL (Griffin-class). Owner named + only org surface → PARTIAL. Never invent; never promote info@/sales@ to Personal.
- Domain surface (RDAP-first + WhoisJSON) now permanently wired for longevity signal.

## Implication for backend
Griffin demo + Advance Turning people-parity + these three wave-3 wins (all with ≥50% contact edge) show the agentic loop + CONTACT FACTS backstop + completeness scorer are performing at product goal. Backend contact-extraction work is nearing completion for the company-first mid-market lane. Remaining polish: registry officer hop, gated enrichment waterfall after identity lock, and continued holdout hygiene.

## Artifacts
- docs/COMPARISON_KB_TOOL_DIE_APEX_VS_GROK_2026-08-13.md
- docs/COMPARISON_BTE_PLASTICS_APEX_VS_GROK_2026-08-13.md
- docs/COMPARISON_NORTHWEST_TOOL_APEX_VS_GROK_2026-08-13.md
- Prior: Griffin personal-contacts, Advance Turning (8 vs 8 people, Apex still wins on reachable email when present)

Floors: check-trash-phone PASS. Tip includes domain-surface + completeness score.
