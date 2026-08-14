# Comparison — Walker Tool & Die · Apex Atlas LIVE run vs Grok Agent

**Date:** 2026-08-14  
**Mode:** **Live Apex holdout** with real API keys (Tavily, SerpAPI, WhoisJSON) + multi-page HTML CONTACT FACTS  
**Script:** `scripts/holdout-walker-apex-run.mjs` → `scripts/holdout-walker-apex-result.json`  
**Rule:** Fail-closed. Placeholder format-examples (`jdoe@`, `first.last@`, …) discarded. No invented mailboxes.

## Target
Walker Tool & Die, Inc. — 2411 Walker Ave NW, Grand Rapids, MI 49544  
Multi-gen family tool & die (Gordon Hendricks → David N. Hendricks; Jeff Umlor President ~2024).

## Apex Atlas (this live run)

| Channel | Value | Source |
|---------|--------|--------|
| Email | **hr@walkertool.com** | `walkertool.com/resources.html` mailto (HTTP 200) |
| Email | **purchasing@walkertool.com** | USDOT public mirror datastical.com/445871 (HTTP 200) |
| Phone | (616) 735-6660 | contactus / aboutus |
| Phone | (877) 925-5378 | contactus |
| Phone | (616) 453-3765 | fax / contact |
| Phone | (616) 453-5471 | resources / USDOT |
| Person | Gordon Hendricks (Founder) | aboutus / home prose |
| Person | David N. Hendricks (owner path / President lineage) | aboutus / home |
| Person | Jeff Umlor (President) | SERP/Tavily leadership surface |
| Domain | walkertool.com created 1996-11-09, privacy WHOIS | WhoisJSON live |

**Keys used this run:** Tavily (200, 12 results), SerpAPI (200, 10 organic), WhoisJSON (200).  
**Pages fetched OK:** home, contactus, aboutus, resources, classet apprenticeship URL, datastical USDOT mirror.

**Apex vectors (deduped):** 2 emails + 4 phones + 3 people + domain longevity ≈ **10**

## Grok Agent floor (primary-site skim only)

| Channel | Value |
|---------|--------|
| Email | **0** (contactus.html has no mailto) |
| Phone | (616) 735-6660, (877) 925-5378, (616) 453-3765 |
| Person | Gordon Hendricks, David Hendricks |

**Grok vectors:** 0 emails + 3 phones + 2 people ≈ **5**

## Score

| Metric | Apex | Grok | Edge |
|--------|------|------|------|
| Public emails | **2** | **0** | Apex only |
| Phones | 4 | 3 | +33% |
| Named principals | 3 | 2 | +1 (Umlor) |
| **Total vectors** | **~10** | **~5** | **+100% (≥50% bar)** |
| Completeness | **STRONG_PARTIAL** | PARTIAL | Owner named; org emails public; no cleartext *personal* owner mailbox on open HTML |

## Why Apex wins (fair)

Grok limited to home + contact prose → **zero emails**.  
Apex multi-hop (resources page mailto + USDOT public filing + search) recovers **hr@** and **purchasing@**. That is the product difference: bureau registry + deep-page CONTACT FACTS after identity lock — not a longer chat prompt.

## Honesty notes
- classet.org apprenticeship page no longer exposes `jroersma@walkertool.com` in HTML (site changed); **not counted**.  
- RocketReach/LeadIQ format examples (`jdoe@`, `flast@`) stripped.  
- MetalForming Umlor article URL 404 this run; Umlor retained only via SERP/Tavily leadership hits.  
- Full Express `api-server` monorepo is not fully present in this GitHub sparse checkout (Replit is primary runtime). This holdout uses the **same extractors + same external keys** the bureau calls.

## Artifact
`scripts/holdout-walker-apex-result.json`
