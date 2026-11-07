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

```http
POST /api/ingest/faa
Content-Type: application/json

{"maxRecords":200000}
```

Poll the returned job in the same way. This downloads the official FAA Releasable Aircraft Database ZIP. The importer creates aircraft assets separately from registrants, and uses `REGISTERED_TO` rather than claiming beneficial ownership.

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
