# FAA corporate and partnership registrant pipeline

## Scope

The official FAA Releasable Aircraft Database includes registrant types beyond individuals. The reproducible extraction now retains two separate directory datasets:

- Individuals: FAA registrant type `1`.
- Legal-entity candidates: `2` Partnership, `3` Corporation, `7` LLC, and `8` Non-Citizen Corporation.

Co-Owned (`4`), Government (`5`), Non-Citizen Co-Owned (`9`), unknown types, blank-name records, and registrations outside the current/renewal-pending status allowlist remain excluded from candidate creation. They must not be forced into a single company or person identity.

## Generated files

- `faa_individual_registrants.csv` and `faa_aircraft_registrations.csv`: individual-only grouped candidates and aircraft rows.
- `faa_corporate_registrants.csv` and `faa_corporate_aircraft_registrations.csv`: legal-entity candidates and their aircraft rows.
- `faa_sanitized_MASTER.txt`: backward-compatible individual-only sanitized MASTER.
- `faa_sanitized_MASTER_CORPORATE.txt`: corporate-only sanitized MASTER.
- `faa_sanitized_MASTER_ALL.txt`: combined eligible individual + legal-entity input used by the canonical Apex importer.
- `faa_extraction_manifest.json`: row/group counts, source checksum, grouping rules and exclusions.

The extractor exports only public registrant names, state/country, aircraft identifiers/model/type, dates and registration fields needed by the importer. Mailing addresses, ZIP codes, phone numbers, email addresses, co-registrant names and withheld identities are not exported.

## Identity and relationship safeguards

- Individuals are grouped by normalized published name + FAA state + FAA country.
- Legal entities are grouped by normalized published name + FAA state + FAA country + FAA registrant type code. This prevents a same-name partnership, corporation and LLC from being silently merged.
- The FAA MASTER does not provide a stable public person or legal-entity identifier. Same-name collisions may remain; these are provisional source groupings, not verified identities.
- Every aircraft observation remains unvalued. FAA registration is a registry observation, not proof of beneficial ownership or operation.
- `REGISTERED_TO` means only that the FAA lists the registrant as the registration applicant. It is not an ownership/control claim.
- Corporate beneficial owners and controllers remain unresolved until independently corroborated from appropriate company registries or official corporate sources.

## Company realism

A company registrant is a company-level research candidate, not automatically a high-value target. Apex's cognitive research workflow may use Inc. 5000, fast-growth and unicorn rankings as company-level discovery signals. Ranking-only mentions remain leads, not qualified targets. Company growth/materiality is assessed separately from any individual owner's wealth; founder or shareholder wealth requires independent ownership/control and personal-wealth evidence.

The company description, legal status, disclosed scale, ownership/control and public professional route must be researched from relevant authoritative sources. Do not infer a company affiliation, beneficial owner, revenue, valuation, or personal wealth from the FAA registration record.

## Import procedure

After the combined fallback and importer are deployed, the operator uses the authenticated `POST /api/ingest/faa` endpoint. For the first corrected full replay, use:

```json
{"maxRecords":200000,"forceRefresh":true,"clearDedup":true}
```

The first `clearDedup:true` clears only the FAA `faa:v2:` dedup prefix. It does not erase dedup state for BRREG, land-registry or other ingestion lanes. Omit `clearDedup` on later incremental runs.

Poll the returned job until terminal state and reconcile `processedRows`, `registrantGroupsProcessed`, `candidateEntitiesInserted`, `inserted`, `skipped` and `errors`. The operator cap counts newly processed eligible aircraft-registration rows, not just inserted assets. If the current combined eligible snapshot exceeds the cap, run subsequent incremental passes without clearing dedup until a pass processes fewer than the cap. A terminal job status alone is not proof of complete ingestion.

Live Apex database ingestion is a separate runtime acceptance step; extraction and CI success do not claim that the production database has been populated.
