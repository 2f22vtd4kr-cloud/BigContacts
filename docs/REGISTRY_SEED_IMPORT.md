# Explicit public-registry seed import

**Canonical repository:** BigContacts / Apex Atlas.  
**Seed snapshot:** `brreg-sector-screen-2026-11-07`.

## What is bundled

- 5,572 active Norwegian AS companies screened from the BRREG NACE-sector export.
- 336 named `Daglig leder` managing-director role records linked to 330 of those organizations.
- One user-supplied Virtual Globetrotting visual property lead, stored as an unresolved asset with no owner or valuation.

The company screen uses legal form, active-register status, bankruptcy/liquidation status, selected NACE sectors, and modest operating scale. It retains official organization-level email/phone and website fields when present, but deliberately excludes street addresses and postcodes. Person rows contain role evidence only and no personal email or phone.

## Run the explicit imports

All `/api/ingest/*` routes are protected by operator authentication. Use an authenticated Apex session or send `Authorization: Bearer <configured APEX_API_AUTH_TOKEN>`; never paste the token into tracked files or logs. Confirm the deployed SHA, database/Redis health, and idle Atlas job lock before starting an import.

After this code and its bundled data are deployed to the Replit workspace, trigger the BRREG snapshot import once:

```http
POST /api/ingest/brreg-snapshot
Content-Type: application/json

{"includePeople":true,"includeVisualLead":true}
```

The endpoint returns a `jobId` and `pollUrl`. Poll `GET /api/ingest/job/:jobId` until terminal state and inspect the final `result` counts. The job is idempotent by BRREG source record key and can be safely rerun after a partial failure; already imported records and MANAGES links are skipped.

For aircraft, use the existing official FAA importer separately:

**Why this uses the ZIP rather than an FAA API:** the FAA's public registry pages document interactive inquiries (N-number, name, serial number, and related searches) and a separate database download; they do not document a public bulk REST endpoint. For bulk seeding, Apex uses the official [Releasable Aircraft Database ZIP](https://registry.faa.gov/database/ReleasableAircraft.zip) and streams its comma-delimited MASTER file through bounded transactional batches. The [FAA Aircraft Registration Inquiry](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/interactive_aircraft_inquiry) remains the interactive lookup path. The public inquiry is refreshed each federal workday; imported records retain the official source attribution and observed registry fields.


```http
POST /api/ingest/faa
Content-Type: application/json

{"maxRecords":200000}
```

Poll the returned job in the same way. This downloads the official FAA Releasable Aircraft Database ZIP. The importer creates aircraft assets separately from registrants, and uses `REGISTERED_TO` rather than claiming beneficial ownership.

The `maxRecords` value is a **per-run insertion cap**. If a run inserts exactly 200,000 aircraft assets, wait for terminal state and repeat the same import; stable FAA source keys cause existing assets to be skipped while remaining records are considered. Repeat until a run inserts fewer than the cap, then reconcile aircraft-asset, registrant-entity, skipped and error counts from the durable job result. A completed job alone does not prove the whole snapshot was imported.

## Close-to-principal and professional intermediary seeds

The same explicit endpoint also imports `data/registry-seeds/proximal_intermediaries_2026-11-08.csv` unless `includeIntermediaries:false` is supplied. The snapshot currently contains 43 source-backed records: 38 public professional people and 5 organization/service cards (30 Gatekeeper/intermediary people and 8 PersonCandidate professional targets) across Oslo Family Office, OFO Services AS, OFO AG, Canica and the DNB Private Banking service route.

- Executive/personal assistants, secretaries, office managers, family-office partners and advisers, legal/transactions/technology/family-security specialists are retained as `Gatekeeper` entities. Canica's publicly listed CEO/CFO/COO/director/investment leadership are separate review-only `PersonCandidate` entities, not presumed HNWIs. They are not filtered out because they are not HNWIs.
- Person-specific professional work email/phone is stored only when the official team page publishes it. These remain `direct_contact_candidate`, not verified private contacts. Where no person-specific contact is published, the person remains `evidence_only`; generic office routes are never copied to the person.
- Organization/service routes remain on their organization/service cards with `organization_contact`. DNB Private Banking is represented as a service-line route, not a separate legal entity.
- Officially listed people are linked to the relevant organization with `MEMBER_OF`. This records a published professional affiliation, not a relationship to a named client/principal, beneficial ownership, or authority to act for any third party.
- OFO Services AS and OFO AG are retained as organization bridges because the team page names them, but legal registry identity and group relationship remain unresolved until the Bureau verifies them.
- Every intermediary record is review-only, not hot, and has no wealth estimate, residence, inferred client list, or named-principal link.

Run the import with the explicit operator route:

```http
POST /api/ingest/brreg-snapshot
Content-Type: application/json

{"includePeople":true,"includeVisualLead":true,"includeIntermediaries":true}
```

The import is idempotent by stable `sourceRecordId` values and `MEMBER_OF` relationships. Rerunning should skip already imported records and links while considering any remaining ones. A successful job proves seed insertion only; Apex must run target-scoped Bureau research before any promotion.

## Research semantics

- Company records are `Corporation` entities. A registered email/phone is explicitly organization-scoped and may produce `organization_contact`; it must never be attributed to a named officer.
- Managing directors are `PersonCandidate` records with low confidence, unverified wealth, no personal contact and no hot status. The BRREG role alone is not evidence of ownership, HNWI status, client access or direct reachability.
- `MANAGES` is a role edge, not an ownership edge.
- Aircraft registrants remain provisional candidates; registration alone is not beneficial ownership or personal wealth.
- The Virtual Globetrotting reference is a visual lead, not an authoritative registry. No owner, occupant, parcel identity, valuation or HNWI claim is attached to it.
- Imported targets are available for normal canonical target-scoped Bureau research. The importer does not start research, create fake research sessions, or auto-promote records.
- There is intentionally no seed-on-boot behavior. Import is an explicit operator action, separate from a normal Apex run.

## Validation boundary

A successful import job and its inserted/skipped counts prove database seeding only. They do not prove identity resolution, wealth, beneficial ownership, personal contactability, research quality, or live release acceptance. Reconcile the durable job result and database counts before claiming the seed is present in a specific Replit database.


## Official FAA snapshot committed to BigContacts (2026-11-08)

The official FAA ZIP was successfully downloaded and parsed by GitHub Actions on 2026-11-08. The sanitized snapshot committed under `data/registry-seeds/` contains:

- 99,783 distinct public individual registrant groups (normalized published name + state + country; not identity-verified unique humans).
- 124,674 current/pending individual-registrant aircraft rows.
- 318,638 MASTER rows scanned.
- Archive SHA-256: `01cd75d88d3ac779e01262fd329c6f4e848d86acacf1df673ff279deffae1fdd`.

The files are `faa_individual_registrants.csv`, `faa_aircraft_registrations.csv`, `faa_sanitized_MASTER.txt`, and `faa_extraction_manifest.json`. The sanitized MASTER file contains only the 124,674 current/pending individual (FAA registrant type `1`) aircraft rows and retains only the public registrant name, registrant type, aircraft identifiers/model/type, dates and registration fields needed by the Apex importer; personal mailing-address and co-registrant columns are blank. Non-individual registrant rows are excluded from this individual-directory snapshot; corporate/partnership registrants require a separate extraction and source-backed company-research workstream.

The canonical FAA importer now prefers the official ZIP when available and falls back to `data/registry-seeds/faa_sanitized_MASTER.txt` if the runtime cannot resolve the FAA archive host. This makes the committed extraction usable in Replit without a second outbound download. The explicit operator endpoint remains `POST /api/ingest/faa` with `{"maxRecords":200000}`; poll its job until terminal state and reconcile inserted assets, registrant entities, skipped rows and errors. A successful extraction is not a completed database import.

### Complete individual registrant-directory semantics

The importer must not discard an otherwise eligible individual merely because the registered aircraft is an ordinary piston/single-engine aircraft. The ingestion pipeline separates the two outputs:

- Structurally valid FAA type-1 individual registrants with current or renewal-pending registration status become provisional, review-only directory candidates even when their aircraft is not a material asset lead. The importer explicitly filters out non-individual registrant types so a successful full-ZIP download and the committed individual-only sanitized fallback produce the same scope.
- Aircraft asset rows are created only for material/strong asset signals. Ordinary/observed aircraft remain absent from the asset table; this is an asset-screening choice, not a reason to omit the registrant candidate.
- `REGISTERED_TO` edges are created only when an aircraft asset row exists, and the edge text explicitly says registration is not beneficial ownership.
- FAA candidate deduplication uses normalized published name + registrant state + country. Same-name candidates in different states/countries must not be merged, and an FAA candidate must not be merged into an unrelated same-name non-FAA entity.
- The operator `maxRecords` cap counts newly processed eligible individual registration rows, not only newly inserted aircraft assets. Use `200000` to cover the current 124,674-row individual snapshot in one pass, then repeat until a reconciliation run processes no additional rows. `inserted` is the aircraft-asset count; `candidateEntitiesInserted` is the new provisional registrant-entity count.
- The terminal job result also records `processedRows` (new eligible aircraft-registration rows scanned) and `registrantGroupsProcessed` (distinct normalized name/state/country groups seen), alongside `candidateEntitiesInserted`, `inserted`, `skipped` and `errors`, so the operator can reconcile the full pass rather than infer completeness from the job status. Full bulk imports default to deterministic structural-only name validation and persist that mode explicitly; optional Groq name-shape validation is capped at 1,000 rows per job to avoid thousands of serial provider requests. Structural acceptance is not identity verification.

The current extraction contains 99,783 normalized individual registrant groups and 124,674 aircraft-registration rows. These are registry groupings, not identity-verified people. Asset counts are expected to be lower than registration-row counts because the asset-signal policy intentionally excludes ordinary aircraft.

The FAA source does not supply employer/company affiliations. Do not infer them from registrant names. Company descriptions must be separately researched from authoritative public sources and shown directly on linked person/company cards.
