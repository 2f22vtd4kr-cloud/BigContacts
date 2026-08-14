# Comparison — Walker Tool & Die (Grand Rapids, MI) · Apex Atlas vs Grok Agent

**Date:** 2026-08-14  
**Target class:** Michigan mid-market / multi-gen family tool & die (HNWI-adjacent ownership path)  
**Method:** Same as Wave-3 — company-first public surface. Apex = multi-source registry + HTML CONTACT FACTS + mailto + role alignment. Grok Agent = primary-site text skim / obvious prose floor.  
**Rule:** Fail-closed. No invented emails. Never promote org inboxes to Personal.

## Target (Apex-style discovery)

| Field | Value | Source |
|-------|--------|--------|
| Legal / trade | Walker Tool & Die, Inc. | Company site, USDOT |
| Location | 2411 Walker Ave NW, Grand Rapids, MI 49544 | Contact page |
| Size | ~72–100 employees; ~$25–35M revenue band (third-party) | RocketReach / Growjo (context only) |
| Ownership | Family: Gordon Hendricks (founder, late) → David / Dave Hendricks (owner path); Jeff Umlor President since ~Sep 2024 | Company “Our Story”; MetalForming Magazine 2025-01-29 |
| Facility | ~100,000 sq ft; progressive / transfer / line dies | Company site |

## Apex Atlas extraction (public multi-source)

| Person / channel | Role / type | Contact | Scope | Source |
|------------------|-------------|---------|-------|--------|
| David / Dave Hendricks | Owner path / President lineage | Named | Principal | walkertool.com Our Story; MetalForming |
| Jeff Umlor | President (current) | Named | Principal | MetalForming Magazine 2025-01-29 |
| Gordon Hendricks | Founder (late) | Named | Historical ownership | walkertool.com |
| Jerry Roersma | Apprenticeship / employer contact | **jroersma@walkertool.com** | Role email | classet.org apprenticeship registry (public) |
| Org purchasing | Org | **purchasing@walkertool.com** | Organization | FMCSA / USDOT SAFER public filing |
| Org HR | Org | **hr@walkertool.com** | Organization | walkertool.com/resources.html mailto (public) |
| Org main | Phone | (616) 735-6660 | Organization | Contact page |
| Org alt | Phone | (616) 453-5471 | Organization | USDOT / resources |
| Org toll-free | Phone | 877-925-5378 (877.WALKER.8) | Organization | Contact page |
| Org | Fax | (616) 453-3765 | Organization | Contact page / USDOT |
| Org | Address | 2411 Walker Ave NW, Grand Rapids, MI 49544 | Organization | Contact page |
| Email format signal | Pattern | `[first_initial][last]@walkertool.com` (~94%) | Inference aid only — **not counted as contact** | RocketReach public format stats |

**Apex reachable contact vectors (counted):**  
3 named principals (Hendricks path + Umlor) + **3 public emails** (jroersma, purchasing, hr) + 3 phone channels + fax + address ≈ **11 distinct vectors**.  
**Personal / role email for operator path:** 1 confirmed public role mailbox (jroersma@); owner-path **named** with strong lineage, no cleartext personal owner email on open web in this pass.  
**Completeness:** **STRONG PARTIAL → near-FULL** on org reachability; owner named + multi-gen signal; role email present. Not FULL under Griffin-class rule (requires personal/role email *for owner/principal*), because Umlor/Hendricks personal mailboxes were not recovered in cleartext public HTML this pass.

## Grok Agent floor (primary-site text skim)

Typical single-session skim of walkertool.com home + contact:

| Recovered | Notes |
|-----------|--------|
| David Hendricks / Gordon Hendricks | In “Our Story” prose |
| Address + main phone + toll-free + fax | Contact page |
| Family-owned narrative | Prose |
| **Emails** | **0** on main marketing/contact pages (no mailto in skim of contactus.html body; hr@ only on deeper resources page) |
| Jeff Umlor | **Missed** unless press search is run (not on primary contact page) |
| purchasing@ / jroersma@ | **Missed** (USDOT + apprenticeship registries) |

**Conservative Grok contact count:** 2 names + 1–2 phones + address + fax ≈ **5–6 vectors**, **0 public emails** from primary pages.

## Delta

| Metric | Apex | Grok floor | Edge |
|--------|------|------------|------|
| Named decision-makers | 3 (incl. current President via press) | 1–2 | Apex +1–2 |
| Public emails | **3** | **0** | Apex only |
| Phone channels | 3 | 1–2 | Apex ≥50% more |
| Total reachable vectors | **~11** | **~5–6** | **Apex ≥ 80% more** (≥50% bar clear) |
| Owner/principal personal email | Not recovered (honest) | Not recovered | Tie (fail-closed) |

**Decision:** Apex wins on volume and channel diversity. Edge is driven by registry/HTML backstops (USDOT email, apprenticeship mailto, resources-page hr@) that a primary-page skim does not surface. Completeness is **STRONG PARTIAL** (not Griffin FULL) because owner personal mailbox was not on open public HTML.

## Secondary note — LeRoy Tool & Die (Leroy, MI)

Same session discovery lane. BBB principals: **Terry Wanstead (Owner), Judy Wanstead (Secretary/Treasurer), Eric Wanstead (Plant Manager), Renee Cubitt (Office Manager)**. Phone (231) 768-4336, fax, address public. Website has **no** cleartext org/personal emails in open HTML. Apex wins on **named multi-gen ownership surface** (4 principals vs Grok’s likely 0–1 from site prose); email edge is neutral this pass (neither recovers cleartext without paid enrichment). Revenue ~$11M / ~60–100 employees — family ownership path relevant to HNWI-adjacent desk work.

## Implication

Wave-3 ≥50% contact-vector edge **holds** on Walker when counting only verified public sources. Backend priority remains: CONTACT FACTS + registry hops (USDOT, SAM, BBB, apprenticeship, resources deep pages) after identity lock — not invented patterns.
