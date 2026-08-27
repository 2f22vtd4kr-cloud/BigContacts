# Volume 79 — PR3 Detail: Outcome Honesty

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Queue:** Vol 70 item 3

## Goal

Any `agentic-web-org` / `*-org` phone without personal email → `organization_contact` only.

## Files

- contact-validation / computeContactOutcome  
- bureau-contact-persist post-patch outcome force (partially present — verify all paths)

## Test table

| phoneSource | email | outcome |
|-------------|-------|---------|
| agentic-web-org | null | organization_contact |
| agentic-web-org | person@ | may be direct_candidate if surname bind |
| agentic-web | phone only | direct_candidate if bind ok |
| EDGAR-Phone | null | organization_contact |

## Done when

Czirr/Philip-class re-cook does not show direct_* for org-only dig phones.
