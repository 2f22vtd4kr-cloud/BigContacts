# Volume 36 — Pattern Library (Identity and Contact)

Reusable patterns from Apex testing — not exhaustive legal advice.

| Pattern ID | Signal | Meaning | Card rule |
|------------|--------|---------|----------|
| SC13D_REPORTING_PERSON | EDGAR SC 13D/G reporting person block | Notice address/phone may be person-associated | Prefer notice over issuer CIK phone |
| FORM4_MAILING | Form 3/4 mailing address | Often service company address | Evidence address; not always personal phone |
| ISSUER_SWITCHBOARD | Company HQ main line on filing header | organization_contact only | Never direct_* |
| GENERIC_INBOX | info@ investor@ contact@ | org unless proven personal local-part + surname bind | organization_contact default |
| IR_AGENCY | Third-party IR domains | Not personal | Prefer issuer IR only as org |
| WEALTH_ADVISOR_COLLISION | Same first name at RIA | High collision | Surname + host gate |
| DECEASED | Obituary / reliable death notice | No live outreach | evidence_only + note |
| COMMON_NAME | John Smith class | Need employer+geo+filing bind | Do not promote on name alone |
| NAV_CHROME | Skip Menu Search strings | Not people | Blocklist |
| SOCIAL_ONLY | LinkedIn URL without email/phone | social_only outcome | Valid intermediate |
