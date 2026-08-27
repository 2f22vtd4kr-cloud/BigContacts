# Volume 117 — parseAction Contract

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**File:** agentic-web-research.ts

## Accepted actions (logical)

web_search, visit, browser_fetch, footprint_email, footprint_username, domain_lookup, harvest_domain, registry_search, reverse_whois, done

## JSON shape

One object per turn. Unknown action → repair prompt once with full tool list.

## Repair

One llmStep repair; second failure → observation asking for valid action — still no force hop.
