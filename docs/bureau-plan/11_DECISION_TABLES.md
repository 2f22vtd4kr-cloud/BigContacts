# Volume 11 — Decision Tables (Outcome, Promote, Collision)

Pure rules for implementers and tests. Prefer code tables matching this doc.

## Table A — contactOutcome from sources

| Phone/email source pattern | Personal email present | Collision risk | Outcome |
|---------------------------|------------------------|----------------|---------|
| EDGAR-Phone / CH main | any | any | organization_contact |
| agentic-web-org | no | low | organization_contact |
| agentic-web-org | yes (person-like local-part + surname bind) | low | direct_contact_candidate |
| agentic-web | yes + URL | low | direct_contact_candidate |
| agentic-web | phone only + URL + surname bind | low | direct_contact_candidate |
| any | any | high collision | organization_contact or evidence_only |
| social only | no | low | social_only |
| none | no | — | none or evidence_only |

## Table B — promote priority (highest wins card)

1. URL-backed person-associated dig (agentic-web) with surname bind
2. Notice-line filing phone for reporting person
3. Org-associated dig (agentic-web-org) labeled organization_contact
4. Issuer EDGAR-Phone / CH main as organization_contact
5. Empty

**Never:** step 4 overwrites step 1 or 2.

## Table C — identity collision triggers

| Signal | Effect |
|--------|--------|
| Multi-token target; surname missing from evidence blob | Block personal promote |
| personName surname ≠ target surname | Risk → org scope |
| Host on collision list | Risk → org scope |
| Graph edge same first, different surname, no stable id | Reject edge |
| Deceased high confidence | evidence_only; skip live outreach dig |

## Table D — done gate

| searches | visits | findings (incl auto) | Allow done? |
|----------|--------|----------------------|-------------|
| 0 | 0 | 0 | No |
| ≥1 | 0 | 0 | Yes (model may stop after search-only) |
| 0 | ≥1 | ≥1 | Yes |
| ≥1 | ≥1 | ≥0 | Yes |

## Table E — integrity

| webSearchActive | agenticLlmSlots | last agentic all-fail | bureauIntegrity |
|-----------------|-----------------|----------------------|-----------------|
| 0 | any | any | critical |
| any | 0 | any | critical |
| >0 | >0 | true | degraded or critical per policy |
| >0 | >0 | false | ok |

