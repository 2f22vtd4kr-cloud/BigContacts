# Registry discovery expansion — candidate catalogue

**Prepared:** 2026-11-25  
**Canonical repository:** [2f22vtd4kr-cloud/BigContacts](https://github.com/2f22vtd4kr-cloud/BigContacts)  
**Purpose:** source catalogue and implementation specification for expanding the Investigator's shuffled registry/web-discovery choice set.

> **Activation truth:** this document is a researched candidate catalogue, not a claim that these sources already have Apex adapters. The current runtime accepts only IDs in `registry-client.ts`, dispatches only implemented adapters, and advertises only sources that pass `isRegistryProviderAvailable()`. Every candidate below remains `runtimeAdapterImplemented: false` until a concrete adapter, response normalizer, provenance mapping, tests and live smoke check exist. Do not add an ID to the action enum or random pool merely because it appears in this catalogue.

## 1. Existing runtime inventory

The current registry action IDs are:

`sec-edgar`, `companies-house`, `brreg`, `ares-czechia`, `bodacc-france`, `gleif`, `cvr-denmark`, `zefix-switzerland`, `offeneregister-germany`, `bolagsverket-sweden`, `ytj-finland`, `atoka-italy`, `borme-spain`, `kvk-netherlands`, `kbo-belgium`, `opencorporates`, `faa`.

Some are already intentionally hidden or capability-gated: Companies House and OpenCorporates require credentials; OffeneRegister requires an explicit post-smoke-test opt-in; Bolagsverket and KVK currently have no supported direct adapter. HMLR Price Paid Data is bulk-only, not a direct-search adapter. The UI coverage matrix and callable action enum are not the same thing.

The current runtime shuffles the *available* registry IDs for model presentation. Availability filtering must remain authoritative; a failed/disabled adapter must never be represented as a successful zero-result search.

## 2. Apex-compatible source record shape

Add one `RegistryCoverage` record to `REGISTRY_COVERAGE_MATRIX` for each source. The shape below matches `registry-matrix.ts`:

```ts
{
  id: "new-source-id",
  sourceClass: "official_registry",
  runtimeAdapterImplemented: false,
  label: "Human-readable source name",
  jurisdiction: "CC or named coverage",
  entityIdentifier: "Stable identifier and issuing namespace",
  personOfficerFields: "Exactly what the source exposes; otherwise none/unknown",
  ownershipAvailability: "Exact scope, thresholds and limitations",
  accessMethod: "Official API / public portal / authenticated service / bulk dataset",
  rateLimit: "Published quota or not yet confirmed",
  licensing: "Source reuse terms; review required if unknown",
  freshness: "Published update cadence or not yet confirmed",
  productionReviewStatus: "review_required",
  notes: "Limitations, source authority, and attribution caveats"
}
```

Keep the following separate:
- `RegistryCoverage`: source awareness and capability metadata for Discover.
- `RegistryId` / action schema: IDs the runtime can actually execute.
- `RANDOM_DISCOVERY_REGISTRIES`: eligible IDs for shuffled registry discovery.
- `isRegistryProviderAvailable()`: runtime attestation/configuration gate.

A candidate enters the callable enum and shuffled pool only after the adapter is implemented and tested. Do not make the UI imply an adapter is callable merely because a source is catalogued.

## 3. Company, shareholder, officer and filing sources

These are high-value additions to investigate first. “Shareholder data” below means source-published shareholder/member information where the relevant entity type and filing actually expose it; it is not a guarantee that every company has a complete cap table.

| Proposed ID | Source / jurisdiction | Useful fields and role | Access and implementation caveat |
| --- | --- | --- | --- |
| `nz-companies-office` | NZ Companies Office / NZBN, New Zealand | Company identity, directors, shareholder searches where published | Official API products are separate: the Companies Entity Role Search API explicitly searches the Companies Register by director or shareholder name. Subscription approval and an API subscription key are required; OAuth2 bearer tokens are optional additional security. Confirm approved entitlement and terms before coding. |
| `estonia-e-business` | RIK e-Business Register, Estonia | Company identity, management, shareholders for eligible private-company types, filings | Public open-data downloads are machine-readable (JSON/XML; selected CSV). The 16 real-time XML/API services require an RIK contract; API-service use is free under the contract, with a published 50,000 responses/day per partner, one concurrent query, and 20 requests/minute/IP for document downloads. Confirm dataset fields and contract before activation. |
| `poland-krs` | National Court Register (KRS), Poland | Company identity, legal form, representation, filed documents and partner/shareholder references in relevant forms | Official register and documents. Ownership details vary by legal form and filing; do not promise a universal shareholder endpoint. |
| `poland-crbr` | Central Register of Beneficial Owners (CRBR), Poland | Declared beneficial-owner/control information | Separate from KRS. Access policy is legally sensitive and has changed across the EU. Verify current Polish access, authentication and legitimate-interest requirements immediately before integration. |
| `czech-justice-register` | Czech Ministry of Justice public register / justice.cz, Czechia | s.r.o. founding documents, partners/shareholders where filed, statutory bodies | Official register and collection of deeds; shareholder information is document/entity-type dependent. Parse documents as evidence, not a guaranteed structured shareholder API. |
| `slovakia-obchodny-register` | Obchodný register, Slovakia | Company identity, statutory bodies, filed documents and partner data where published | Official company register. Confirm current search/API terms, anti-automation controls and exact downloadable fields. |
| `slovakia-rpvs` | Register of Public Sector Partners (RPVS), Slovakia | Beneficial-owner verification for entities required to register as public-sector partners | Narrow scope; not a universal beneficial-owner register. Preserve the statutory context and verification document. |
| `belgium-staatsblad` | Moniteur belge / Belgisch Staatsblad, Belgium | Incorporations, appointments, resignations, articles and corporate acts | Official gazette publications; event/document evidence rather than a consolidated shareholder master. |
| `belgium-nbb-cbso` | National Bank of Belgium Central Balance Sheet Office, Belgium | Annual accounts, financial statements, legal-entity references | Public consultation is free; PDF/XBRL/CSV availability depends on filing format and date. Professional web services require subscription/approval; some paid products cease 2027-01-01. |
| `luxembourg-resa` | RESA / Luxembourg Business Registers, Luxembourg | Official company notices and filed acts | Official electronic gazette for legal notices. Not equivalent to open public beneficial-owner access; use RCS/RESA filing records and verify current access rules separately. |
| `france-annuaire-entreprises` | Annuaire des Entreprises / API Recherche d’Entreprises, France | Company identity, SIREN/SIRET, activity, address, dirigeants/élus | Official open API; max 7 requests/second per IP and 30 requests/second per ASN (not a guaranteed sustained rate); send a descriptive User-Agent and respect 429/Retry-After. It searches company names, addresses, leaders/elected officials and SIREN/SIRET but is not the full underlying Sirene/RNE dataset. Non-diffusible entities are excluded. |
| `switzerland-shab` | SHAB / FOSC / FUSC, Switzerland | Official commercial notices: appointments, capital, legal changes, insolvency notices | Official gazette and event source; Zefix remains the existing company master search. Treat notices as dated source events. |
| `ireland-cro` | Companies Registration Office / CORE, Ireland | Company identity, officers, filed documents, annual returns | Official CRO search and filing portal. Confirm automated access, fees and document reuse before adapter implementation. |
| `australia-abn-lookup` | Australian Business Register / ABN Lookup, Australia | ABN, legal/trading names, entity status, GST and public business details | Official lookup and web services; confirm service registration/key and current reuse terms. |
| `australia-asic` | ASIC registers, Australia | Company registration, officeholders and selected company extracts | Official register, but many detailed extracts/searches are fee-based. Do not describe it as a free bulk source. |
| `canada-corporations` | Corporations Canada, federal | Federal corporation identity, status, directors and filings where public | Official federal database; provincial/territorial companies are outside its full coverage. |
| `canada-ontario-business` | Ontario Business Registry, Canada | Ontario corporation identity, filings and public profile information | Official provincial register; account, product and fee/access rules vary. |
| `open-ownership-register` | Open Ownership Register / BODS dataset, cross-country | Structured beneficial-ownership statements from participating publishers | Cross-country dataset/aggregator, not a primary register and not complete global coverage. Retain publisher, source jurisdiction, statement date and original-source link; use as discovery/corroboration only. |

### Firmadatabasen.no — Norway enrichment candidate

Proposed ID: `firmadatabasen-no`. Operator: Raunic AS (commercial service), not the Norwegian state.

The current API documentation specifies server-side GET endpoints, API-key authentication, and a company-by-nine-digit-organisation-number lookup returning basic data, address/contact fields, up to five annual accounts and five calculated ratios. Sandbox is free, capped at 1 request/second and 100 calls/month; response headers expose quota state and 429 responses include Retry-After. Data is refreshed nightly. The docs list Aksjonærregisteret among upstream sources, but the documented company API response does not expose shareholder lists or ownership trees; upstream source provenance is not equivalent to a returned API field. Never expose the API key in browser code.

**Important correction to the supplied description:** the API documentation reviewed for this catalogue does not establish that the API returns shareholder lists or ownership trees. Those features may exist in the consumer product or derive from other datasets, but they are not verified by the current API schema reviewed here. Do not promise them in Apex until an authenticated sample response proves the fields. BRREG remains the official authority; compare any Firmadatabasen field with the official BRREG/Skatteetaten record. Its terms also assert database rights over the compiled/processed database and restrict copying or reuse of substantial parts. Review terms before bulk collection.

Official/primary entry points:
- https://firmadatabasen.no/api/docs
- https://firmadatabasen.no/vilkar
- https://data.brreg.no/enhetsregisteret/api/

## 4. Public financial, donation, nonprofit and insider-disclosure sources

These sources can surface public, attributable financial relationships or named roles. They are not direct proof of personal net worth, liquid wealth, control of an issuer, or a personal relationship to another person.

| Proposed ID | Source / jurisdiction | Useful fields and role | Caveat |
| --- | --- | --- | --- |
| `sec-form-d` | SEC Form D, United States | Issuer, offering, related persons, executive officers/directors/promoters as filed | EDGAR is already integrated. This is likely an expansion of the existing SEC adapter's form coverage, not a separate registry. Form D is a notice filing; offering amount/participants do not prove funds raised, investor allocations or individual wealth. |
| `fec-contributions` | Federal Election Commission, United States | Public campaign-finance contributions, committees and disclosed contributor data | Official API/data. Political contribution is sensitive-context data: do not build political profiles, infer ideology, or use donation records as a wealth score. Only use narrowly where lawfully relevant to an explicit case objective; otherwise exclude from default discovery. |
| `irs-form-990` | IRS Form 990 filings / ProPublica Nonprofit Explorer, United States | Nonprofit officers, directors, trustees, compensation and filings | IRS filings are the authority. ProPublica is a secondary searchable mirror and API, not the official register. Officer/trustee role is not personal wealth evidence. |
| `uk-electoral-commission-donations` | Electoral Commission, United Kingdom | Reported donations, regulated donees and donor names where published | Official donation search. Donation is a disclosed event, not proof of net worth or political belief; apply purpose limitation and avoid political profiling. |
| `uk-charity-commission` | Charity Commission register/API, England and Wales | Charity trustees, officers, accounts and governing details | Official API requires an API key and applies rate limits. Trusteeship is role evidence, not proof of wealth or access to clients. |
| `sweden-fi-pdmr` | Finansinspektionen PDMR transactions register, Sweden | Transactions by persons discharging managerial responsibilities and closely associated persons | Public register, continuous updates and CSV export. FI states reports are published on receipt and are not reviewed before publication; incompleteness/error is possible. |
| `oslo-bors-newsweb` | NewsWeb / Oslo Børs issuer announcements, Norway | Issuer disclosures including primary-insider notifications and market notices | Official market disclosure channel; classify announcement type and issuer before attributing a person/transaction. |
| `uk-pdmr-nsm` | FCA National Storage Mechanism / UK issuer RIS disclosures, United Kingdom | PDMR dealings and regulated issuer announcements | Public disclosures are distributed through issuer/RIS and storage channels; format may be document-based and requires event-level extraction. |
| `canada-sedi` | SEDI / Canadian insider reporting, Canada | Insider ownership and transaction reports | Official securities disclosure infrastructure; confirm current public search/API path, SEDAR+ linkage, terms and access before implementation. |
| `asx-appendix-3y` | ASX market announcements, Australia | Change of director's interest notices (Appendix 3Y) | Official issuer announcements; document parsing, amendments and issuer context matter. A 3Y notice is not a full beneficial-ownership register. |

## 5. Aircraft registers

Aircraft registration is an asset/registrant lead only. A registrant may be a company, trustee, operator, lessor or agent. Registration is not proof of beneficial ownership, market value, personal wealth, or personal contactability.

| Proposed ID | Source / jurisdiction | Useful fields | Caveat |
| --- | --- | --- | --- |
| `uk-caa-g-info` | UK CAA G-INFO | Registration, aircraft/serial/type, current registered owner name, ownership status | Official search and monthly download product. Download is a CAA product with conditions/fees; avoid personal postal addresses and respect data terms. |
| `canada-transport-aircraft` | Transport Canada Civil Aircraft Register | Registration, aircraft identity and registered owner data as published | Official register. Verify fields, search/download access and restrictions; do not store private address fields in person cards. |
| `australia-casa-aircraft` | CASA Australian aircraft register | Registration, aircraft details and registered operator/owner fields as published | Official register; confirm current interface/data terms and distinguish operator from owner. |

## 6. Tax-list sources — deliberately not in the automated registry pool

These are not approved for Apex's shuffled automated discovery pool:

- **Norway — Skatteetaten tax lists:** login required; searches/views are logged and the subject can see who viewed their tax information. The official service requires login, logs named-person views and lets the subject inspect who searched them. It currently allows viewing up to 500 people per calendar month. It exposes net income, net wealth and tax for the assessment year, but values can be revised. These controls reinforce exclusion from automated discovery. This is highly sensitive personal financial data and should not be scraped, bulk-collected or used for automated person discovery.
- **Finland — individual tax data:** annual public disclosure is handled through official request/press procedures around tax-day; it is not a general open API at vero.fi. No automated bulk integration.
- **Sweden — tax data:** access routes through the Tax Agency and commercial credit-information providers; this is not a general open bulk register. No automated bulk integration.

A future exceptional legal/compliance review would be required before any case-specific use. Do not add these IDs to `RegistryId`, the shuffled registry pool or scheduled health checks that query named individuals.

## 7. Beneficial-ownership access: do not hard-code a country whitelist

The Court of Justice's 22 November 2022 judgment in joined cases C-37/20 and C-601/20 invalidated unconditional general-public access to EU beneficial-ownership information under the then-applicable AML directive. Directive (EU) 2024/1640 now provides for access for persons who demonstrate a legitimate interest, with identity verification and implementation details; its provisions are being phased in, including the 10 November 2026 implementation milestone. National access, transitional arrangements, register-specific authentication, and legitimate-interest processes therefore need current country-by-country checks.

Consequences for Apex:
- Do not copy a static “open/closed” country list into runtime policy.
- Do not infer that a national UBO register is publicly searchable because a search engine indexes an old page.
- Do not bypass identity checks, legitimate-interest assessment, login, fees, or access controls.
- Keep company-register shareholders, PSC/beneficial-owner declarations, filed articles, and a third-party ownership dataset as different source/evidence classes.
- The UK PSC register is a distinct domestic regime and remains publicly searchable subject to protections/withholding; do not generalize that access rule to EU registers.
- For Poland CRBR, Estonia, Slovakia, France, Denmark, Bulgaria, Czechia, Slovenia and Latvia, treat access as **verify at implementation time**, not as an unconditional current guarantee. For Luxembourg, Austria, Germany, Netherlands, Ireland, Belgium and Malta, likewise verify the live register-specific path rather than assuming either full closure or a universal ban.

## 8. Shuffled discovery and the realism mechanism

The intended model-facing choice is a randomized mix of **runtime-available registries and ordinary randomized web search**, not a deterministic source itinerary.

1. **Eligibility before shuffle:** only runtime-attested sources enter the pool. Use the case's actual jurisdiction, entity type and evidence gap to explain source capabilities and limitations. This is source metadata, not a hard-coded research sequence.
2. **Mix:** expose a neutral shuffled list of eligible registry IDs alongside the existing web-search capability. Randomization removes stable positional preference; it does not require a registry call or force a minimum number of registry calls.
3. **Model decision:** the Investigator chooses whether a registry, web search, page inspection, revisit, falsification action or stop has the best expected information value for the current case. The model retains control of the trajectory.
4. **Realism:** registry queries must use plausible target-specific identifiers/names and the source's actual indexed fields. Do not issue arbitrary random names, unrelated jurisdictions, generic test strings, or repeated queries just to exercise the pool. Randomize choice/order, not the truth or relevance of the query.
5. **No false negatives:** unavailable adapter, authentication failure, timeout, throttling, malformed response or blocked request is a typed source failure—not a no-hit. A successful empty response is a no-hit only for that exact query and source scope.
6. **Evidence boundary:** every registry result is a lead until the exact record page/document is fetched and its claims are attributable. A shareholder, director, trustee, PDMR or aircraft registrant record is not by itself a verified HNWI or personal contact.
7. **Source-family diversity:** independent publisher roots and underlying primary sources matter. An aggregator reproducing an official filing is not independent corroboration.
8. **Audit trail:** record the selected registry ID, query, eligibility reason, shuffled position, request URL, response status, provider, observed URL, source record ID, fetch outcome, result count, timestamps and normalizer version. Never log credentials or sensitive personal payloads.

## 9. Scheduled source-health registry

A scheduled monitor should check source *availability and schema*, not decide whether the source is substantively useful and not choose the Investigator's next action.

Recommended health record:

```ts
type RegistryHealth = {
  registryId: string;
  checkedAt: string;
  status: "healthy" | "degraded" | "auth_required" | "rate_limited" | "schema_changed" | "unreachable" | "disabled";
  httpStatus?: number;
  latencyMs?: number;
  testQueryKind: "non_personal_fixture" | "public_company_identifier" | "metadata_only";
  responseSchemaFingerprint?: string;
  returnedRecordCount?: number;
  errorClass?: string;
  nextCheckAt?: string;
};
```

Implementation rules:
- Prefer metadata/health endpoints. Where a test query is required, use a stable public company/organization identifier or non-personal fixture, never a private individual's name or tax/wealth query.
- Check status, response envelope, required identifiers and a small schema fingerprint; do not persist unnecessary personal fields from the test response.
- Use source-specific cadence and backoff; respect quotas, API keys, terms and published maintenance windows.
- Record `checkedAt`, not a permanent boolean “alive”.
- A health failure changes runtime availability; it must not create a no-result finding or silently fall back to a differently labelled source.
- The Investigator may still choose web search or another eligible source. The monitor does not prescribe the next research move.

## 10. Recommended implementation order

1. **France Annuaire API** — open, official search API with useful officer/leader search; implement and test its actual response envelope and exclusions.
2. **UK CAA G-INFO** — clear official aircraft register; start with interactive query semantics and terms before any paid monthly bulk file.
3. **Sweden FI PDMR** — official public register with CSV export; define transaction/person attribution and completeness caveats.
4. **New Zealand Companies Office/NZBN** — valuable shareholder/director data, but API products and OAuth/subscription requirements must be mapped.
5. **Belgium NBB CBSO + Staatsblad** — complementary financial accounts and corporate acts; distinguish free public consultation from subscription web services.
6. **Estonia e-Business Register** — valuable structured coverage, subject to RIK contract and exact data rights.
7. **US SEC Form D extension** — likely the lowest-friction improvement to the existing SEC EDGAR adapter; add the form type only with parser/tests and correct semantics.
8. **Canada / Australia / Ireland / Poland / Czechia / Slovakia / Luxembourg / Switzerland** — implement only after source-specific endpoint, terms, access, field mapping and test fixture are verified.

Do not activate the entire list in one change. Each adapter is a separate tested capability; the catalogue can be broad while the callable runtime remains truthful.

## 11. Source research notes and primary links

- Firmadatabasen API docs: https://firmadatabasen.no/api/docs
- Firmadatabasen terms: https://firmadatabasen.no/vilkar
- NZ Companies Office APIs: https://www.companiesoffice.govt.nz/data-services/ways-to-get-our-data/using-our-data-through-apis/
- NZ Companies API: https://portal.api.business.govt.nz/api/companies-register
- Estonia RIK API: https://www.rik.ee/en/e-business-register/company-registration-api
- France Annuaire API docs: https://recherche-entreprises.api.gouv.fr/docs/
- France API service record and limits: https://www.data.gouv.fr/dataservices/api-recherche-dentreprises
- Belgium NBB CBSO: https://www.nbb.be/en/central-balance-sheet-office/about-central-balance-sheet-office
- Belgium NBB web-service access: https://www.nbb.be/en/central-balance-sheet-office/consultation-data/webservices
- SEC Form D FAQ: https://www.sec.gov/about/divisions-offices/division-corporation-finance/frequently-asked-questions-answers-form-d
- Sweden FI PDMR register: https://www.fi.se/en/our-registers/fis-marknadsregister/insynshandel/pdmr-transactions/
- Sweden FI open data: https://www.fi.se/en/about-fi/about-fi.se/open-data/
- UK CAA G-INFO search: https://www.caa.co.uk/aircraft-register/g-info/search-g-info/
- UK CAA G-INFO download: https://www.caa.co.uk/aircraft-register/g-info/g-info-download/
- Norway Skatteetaten tax-list access and logging: https://www.skatteetaten.no/en/forms/search-the-tax-lists
- CJEU joined cases C-37/20 and C-601/20: https://infocuria.curia.europa.eu/tabs/affair?lang=EN&publishedId=C-37%2F20
- Directive (EU) 2024/1640: https://eur-lex.europa.eu/eli/dir/2024/1640/oj
- UK PSC guidance: https://www.gov.uk/guidance/people-with-significant-control-pscs
- UK Charity Commission API: https://register-of-charities.charitycommission.gov.uk/en/documentation-on-the-api

**Research status:** the official sources above were checked on 2026-11-25 where current search results and documentation were available. Several country candidates still need live endpoint, terms and response-schema verification before an adapter can be called production-ready. The catalogue deliberately labels those gaps rather than inventing quotas, API access or shareholder fields.
