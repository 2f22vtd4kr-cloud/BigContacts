# Volume 196 — Companies House (UK) Public Surface

## Why CH matters

UK-linked HNWIs, directors, and PSCs appear in Companies House public data: officer search, company profiles, registered office addresses, appointment history, PSC notifications. The Public Data API is free with an API key (Basic auth, key as username). This is structured public data — high trust for identity and address anchors, sometimes thin on phones (office address ≠ mobile).

## API surfaces relevant to Apex

| Endpoint | Yield |
|----------|--------|
| `GET /search/officers?q=` | Officer hits: name, address snippet, appointment count |
| `GET /search/companies?q=` | Company number, status, office address |
| `GET /company/{n}` | Profile, registered office |
| `GET /company/{n}/officers` | Full officer list for issuer |
| `GET /company/{n}/persons-with-significant-control` | UBO/PSC names and control nature |
| Filing documents | PDFs that may contain contact blocks |

## Dig mapping

`registry_search` with registry CH (or equivalent) should return observation lines the model can use. Model may then `web_search` the company site for phones. **Do not** invent phones from CH when only address exists — promote address as evidence/other, office phone only if present in data or visited pages.

## Card treatment

- Registered office phone if ever present → organization
- Officer name match → identity support, not auto email invent
- Related officers → related strip candidates

## Collision

Common UK names need issuer/company number binding before personal promote.

## Acceptance

UK fixture: dig or secondary path produces either CH-backed evidence or company-site contact after CH identity anchor — not empty when CH search would hit.

