# Volume 181 — EDGAR Full-Text Search (EFTS) Operator Notes

## Why EFTS matters for Apex

SEC Full-Text Search indexes filing body text and attachments since ~2001 — not only headers. Person names, notice language, telephone strings, and exhibit text are queryable. Company Search alone misses body hits. Dig observations that only scrape a company landing page without full-text or filing visits under-collect.

## Capabilities (public SEC behavior)

- Keyword, ticker, company name, CIK, reporter last name — combinable
- Boolean operators (ALL CAPS), exact phrases in quotes, wildcards
- Filters by date, form category, location in advanced UI
- Natural language search is **not** supported — orientation must not tell the model to “ask EDGAR in plain English”

## High-yield form families for outreach routes

| Family | Typical public contact yield |
|--------|------------------------------|
| 10-K / 10-Q | Registrant address + telephone |
| DEF 14A | Officers/directors; sometimes contact framing |
| SC 13D / 13G (+/A) | Beneficial owners; notice/copy-to patterns; counsel |
| Form 3 / 4 / 5 | Insider identity; addresses in some eras |
| 8-K | Event-driven; occasional contact exhibits |

## Dig implications (free, not scripted)

When issuer or CIK is known, orientation should make **sec.gov** results high-value to **visit**. The model chooses queries; observations should preserve filing titles and accession links so visit can land on primary_doc or exhibits.

## Structured vs HTML filings

Modern Schedule 13D can be structured XML via online forms; older/combined filings may be HTML/txt. Visit extraction must tolerate both. Exhibits (EX-99, agreements, POA) often hold phones that the cover page lacks.

## Apex mapping

- Existing EDGAR boost / notice-phone paths remain; expand observation quality when visits hit filings
- Never promote CIK or accession numbers as phones
- Label registrant tel as organization; notice-class as notice source

## Acceptance

Fixture with known SC13 notice line: after standard dig, evidence or card contains that line or a same-filing alternate with sec.gov sourceUrl.

