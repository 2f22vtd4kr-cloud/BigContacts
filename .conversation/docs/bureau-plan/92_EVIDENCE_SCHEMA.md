# Volume 92 — contact_evidence Schema Contract

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Required fields (logical)

| Field | Meaning |
|-------|---------|
| entityId | FK to entities |
| vectorType | email \| phone \| linkedin \| website \| social \| other |
| value | normalized contact string |
| source | agentic-web, agentic-web-org, EDGAR-Phone, EDGAR-Notice-Phone, … |
| sourceUrls | JSON/array of http(s) URLs |
| personName | optional extract attribution |
| role | optional |
| scope | organization \| candidate |
| note | free text |
| createdAt | timestamp |

## Promote eligibility

- sourceUrls nonempty for card promote (fail-closed)  
- value passes sanitizer  
- identity collision not risk for personal outcomes  

## Apex must

Persist dig findings here even when card promote blocked — enables rehydrate and audit.
