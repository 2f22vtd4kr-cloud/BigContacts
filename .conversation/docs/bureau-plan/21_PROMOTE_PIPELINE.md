# Volume 21 — Promote Pipeline Specification

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Pipeline stages

```
Tool/HTML extract
  → sanitize (trash phone/email/host)
  → contact_evidence row (value, type, source, sourceUrls, personName?)
  → identity collision assess
  → score / rank candidates
  → select best phone, email, linkedin under Table B priority (Vol 11)
  → write entities.* + phoneSource
  → computeContactOutcome (Vol 11 Table A)
  → rehydrate if projection lag
  → invalidate entity list cache
  → DigSpan promote event
```

## Sanitize rules (fail-closed)

- Reject 555 / obvious fictional NANP patterns used historically as soft-admit bugs
- Reject filename-like domains and registrar noise hosts
- Reject values without sourceUrls for card promote (evidence may still store with caveats)
- Decode CF email protection where deterministic

## Source labels

| Label | Meaning |
|-------|---------|
| EDGAR-Phone | Issuer or filing phone — org unless notice-person proven |
| EDGAR-Notice-Phone | Reporting-person notice block |
| agentic-web | Dig-associated, person-leaning |
| agentic-web-org | Dig-associated, org-scoped |
| CompaniesHouse-Phone | Registry main line — org |

## Overwrite policy

```
if existing.phoneSource in agentic-web*:
  deny EDGAR-Phone overwrite
if incoming is EDGAR-Notice-Phone and existing is EDGAR-Phone:
  allow replace
if incoming agentic-web and existing EDGAR-Phone:
  allow replace
```

## Outcome post-conditions

After write, if outcome is direct_* but source is *-org and no personal email → force organization_contact.

## Tests

1. Evidence with URL phone → entity.phone set
2. agentic then EDGAR pass → agentic remains
3. agentic-web-org phone only → organization_contact
4. collision host → org or evidence_only
