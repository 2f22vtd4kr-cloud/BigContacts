# Volume 182 — Team / About / Contact Pages as Primary Web Surface

## Empirical pattern (2026)

Public company and mid-market sites still publish leadership and contact surfaces at high rates. Passive audits of large index constituents show a majority of reachable sites expose some team/leadership page structure (names, often photos, sometimes mailto). Lead-gen and OSINT practice continues to rank **company website team/contact/about** among the highest-authority free sources — ahead of paid graphs for **attributable** official routes.

## Page types to treat as high-value visits

1. `/contact`, `/contact-us`
2. `/about`, `/about-us`, `/who-we-are`
3. `/team`, `/leadership`, `/people`, `/management`
4. `/investors`, `/investor-relations`, `/ir`
5. `/newsroom`, `/press`, `/media`
6. Footer contact blocks on homepage (often duplicate main phone)

## Extraction priorities on visit

- `mailto:` and visible emails
- `tel:` and visible E.164 / national numbers
- Person-shaped cards: name + role + optional contact
- JSON-LD `Person` blocks when present
- IR agency names and their phones listed on IR pages

## Display

Named person on team page with email → candidate personal or role-attributed.  
Main phone only → organization on issuer-linked target.  
**Always keep** — never drop because not mobile.

## Dig orientation

When company domain is known, search/visit toward contact and leadership paths is natural model behavior if SERP and orientation mention them. Do not force a crawl map; do make these URLs obvious in SERP observations when present.

## Acceptance

If baseline opens company.com/contact and finds a phone, Apex after visit-capable dig should not miss that host entirely (L-code if missed).

