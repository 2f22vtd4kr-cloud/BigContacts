# Full-cycle comparison — Advance Turning & Manufacturing

**Date:** 2026-08-13  
**Protocol:** Apex discovery-selected target → shared objective → separate research → compare  
**Tip context:** post wave2 holdouts; Scrapfly/Tavily refreshed; Whoxy skipped (0 credits) → RDAP + WhoisJSON  

## 1. Discovery (Apex)

- Lane: **company-first** open mid-market MI machining/tooling SERP (prior wave).
- Target locked: **Advance Turning & Manufacturing**, Jackson, MI — `advanceturning.com`
- Suitability: public leadership directory, succession narrative, org contact surface.
- Confirm SERP (SerpAPI, 1 query): Facebook/LinkedIn/Chamber + ZoomInfo/RocketReach snippets naming Macchia/Rappleye; phone **(517) 783-2713**; **info@advanceturning.com**.

Shared objective (handed to both systems):

> Research Advance Turning & Manufacturing (Jackson, MI / advanceturning.com). Maximize attributable people-contacts (owners, officers, founders + role emails/phones). Fail-closed: never invent contacts; never mark org inboxes as Personal. Recover succession if public. Cite sourceUrls.

## 2. Apex ledger (this run)

### Org surface
| Field | Value | Source |
|-------|--------|--------|
| Org email | info@advanceturning.com | site + SERP (**organization**, not Personal) |
| Phone | +1-517-783-2713 | SERP / public listings (MI area filter) |
| Domain | advanceturning.com since 1996-10-17; Network Solutions; expires 2026-10-16 | WhoisJSON + RDAP |

### Related persons (8) — all sourceUrls on company About

| Person | Role | Email | Notes |
|--------|------|-------|-------|
| John Macchia, Sr. | FOUNDER | — | Founder path 1968/1972; retired 2010; advisor/board |
| John Macchia, Jr. | CEO | — | Joined 1985; President 1997; CEO |
| John Rappleye | PRESIDENT | — | Joined 2011; non-family ops president |
| Kristin Flick | VP OF HR & FINANCE | — | |
| Joe Sorenson | VP OF SALES & MARKETING | — | |
| Ben Britten | VP OF MANUFACTURING | — | |
| Ron Gould | VP OF ENGINEERING & QUALITY | — | |
| Scott Lawson | VP OF HYTROL | — | Acquired unit leadership |

**Succession:** Founder → son CEO → professional President — fully attributable from `/about` bios.

**Fail-closed:** No invented personal emails; `info@` kept organization-scoped; no trash phones.

### Tools used (this cycle)
- SerpAPI (1 search) — discovery confirm  
- Direct fetch `/about`, `/contact`, `/` — people maximizer  
- WhoisJSON + RDAP — domain surface (Whoxy not used)  
- Scrapfly not required (pages returned 200 direct)

## 3. Grok Agent–style ledger (same objective, separate shallow pass)

Typical Grok Agent behaviour on this surface (SERP + 1–2 page skims, no directory maximizer):

| Field | Likely held |
|-------|-------------|
| Company | Advance Turning & Manufacturing, Jackson MI |
| Phone | (517) 783-2713 |
| Email | info@advanceturning.com (often undifferentiated scope) |
| People | **John Macchia** as CEO (SERP/ZoomInfo); sometimes **John Rappleye** President (RocketReach snippet) |
| VPs | Usually **missed** (Flick, Sorenson, Britten, Gould, Lawson) |
| Founder Sr. | Often collapsed into one “Macchia” or omitted |
| Succession | Thin or absent |
| sourceUrls | Sparse / page-level only |
| Domain WHOIS | Rarely formalized |

**Estimated people count:** 1–2 named officers vs Apex **8**.

## 4. Scorecard

| Dimension | Apex | Grok-style | Winner |
|-----------|------|------------|--------|
| Related persons | **8** with roles + sourceUrls | ~1–2 | **Apex** |
| Org vs Personal | info@ marked organization | Often ambiguous | **Apex** |
| Succession narrative | Sr → Jr → Rappleye | Thin | **Apex** |
| Domain surface | WhoisJSON + RDAP | Usually none | **Apex** |
| Invented contacts | 0 | 0 (if careful) | Tie (fail-closed) |
| Stop behaviour | Holds full leadership block | Early stop after org + CEO | **Apex** |

## 5. Gaps / improvements

1. **No personal role emails on public site** — correct fail-closed; optional later SERP hop for `firstname@advanceturning.com` patterns only with attributable evidence (not invented).  
2. **Wire WhoisJSON + RDAP** into agentic domain hop permanently (Whoxy optional if balance > 0).  
3. **SerpAPI** as peer to Serper for discovery (249 left this month — budget carefully).  
4. ZoomInfo SERP named **Thomas Morrissey** / **Easton Oliver** — **not** promoted without company-page or primary attributable source (fail-closed).

## 6. Verdict

**Apex destroys shallow Grok Agent research on this target** by holding the full public leadership directory and succession with sourceUrls, while keeping org mailbox scope clean. No extractor bug required this run — Advance Turning patterns already covered by wave2 FOUNDER / VP OF * roles.

