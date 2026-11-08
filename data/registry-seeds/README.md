# Registry seed snapshot — 2026-11-07

This folder contains a versioned, shallow BRREG snapshot prepared for the existing BigContacts / Apex ingestion model.

## BRREG source and selection

Source: Brønnøysundregistrene (Norway), Enhetsregisteret public API.

- Company source extract: 38,399 AS/ASA records in the earlier NACE-focused source pull.
- Snapshot admitted here: 5,572 active Norwegian AS entities.
- Company filter: legal form AS; registered in the business register; not marked bankrupt or under liquidation; NACE prefix in 55, 56, 68, 69, 70, 71, 41–43, 64–66, 77, 79, 81 or 82; and either 2–250 employees or no reported employees with NOK 5m–100m registered share capital.
- Company fields retained: legal identifier, name, legal form, city, employee band/count, NACE codes/descriptions, registered share capital, incorporation date, official registry URL, official website, and official organization email/phone where present.
- Street addresses and postcodes are intentionally excluded. Registered share capital is not company valuation or an individual's wealth.
- 336 current `Daglig leder` (managing director) role records link to 330 of the selected companies. They are official role evidence only; no ownership, wealth, client access, or personal contact is inferred. Each is stored as a review-only `PersonCandidate` with a `MANAGES` relationship to its organization.

## Apex semantics

- Companies are `Corporation` records; official email/phone are explicitly organization-scoped and only yield `organization_contact` when a registered route is present.
- Named managing directors are `PersonCandidate`, not HNWI or Gatekeeper. They have no personal email/phone and start as evidence-only, unverified, and not hot.
- Source record IDs and official URLs are retained in entity metadata so canonical target research can inherit the source context.
- Import is explicit via `POST /api/ingest/brreg-snapshot`; there is deliberately no seed-on-boot behavior.
- Import is idempotent by BRREG organization number and person+organization role key. It uses the existing entities/relationships model; it does not create a parallel prospect database.

## Close-to-principal professional intermediaries

- `proximal_intermediaries_2026-11-08.csv` — 43 source-backed organization/person cards, including 38 professional people (30 Gatekeeper/intermediary and 8 review-only PersonCandidate records) and 5 organization/service units.
- The cohort includes executive and personal assistants, secretaries, office managers, family-office partners/advisers, and associated legal, transactions, technology and family-security experts.
- This is a deliberately retained Gatekeeper/intermediary lane. Do not exclude an assistant, office manager, lawyer, adviser or secretary solely because they are not the HNWI principal.
- Person-specific business email/phone is retained only when it appears on the official team page, and remains an unverified professional contact candidate. Generic office routes remain organization-scoped.
- `MEMBER_OF` records a publicly evidenced professional affiliation only; it does not imply a client relationship or access to a named principal. No private address, personal wealth, client identity or beneficial ownership is inferred.
- OFO Services AS and OFO AG are name-based organization bridges from the official team page; verify legal identity and group relationships before any merge. DNB Private Banking is a service-line route, not a separate legal entity.

## Aviation

BigContacts already has the canonical official FAA importer at `POST /api/ingest/faa`, using the FAA's Releasable Aircraft Database ZIP. This snapshot does not copy the third-party OpenAirDocs FAA export into the canonical seed dataset. The FAA importer is updated to omit registrant mailing addresses and additional co-registrant names from entity and asset metadata. Aircraft and registrants remain separate; `REGISTERED_TO` is not a beneficial-ownership conclusion. FAA registration alone does not establish personal wealth or a realistic contact route.

## Visual asset pointer

`manual_asset_leads.csv` contains one user-supplied Virtual Globetrotting reference. Virtual Globetrotting is not an authoritative property registry. The importer creates only an unverified `RealEstate` asset lead with no owner, address, coordinates, or valuation. The visual appearance of a property is not proof of who owns or occupies it, nor proof of personal wealth.

## Files

- `brreg_company_seeds_2026-11-07.csv` — 5,572 filtered organization records.
- `brreg_managing_director_seeds_2026-11-07.csv` — 336 named managing-director role records.
- `manual_asset_leads.csv` — one unresolved visual asset lead.

Snapshot ID: `brreg-sector-screen-2026-11-07`.

The data is a seed for further Apex Bureau research, not a verified HNWI list or a ready-to-contact prospect list.
