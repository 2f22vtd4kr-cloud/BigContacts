# Apex Atlas source-universe review — 2026-10-31 (W07)

Status: source-discovery assessment; not a claim that any new source is integrated, live-attested, or authorized for bulk ingestion.

## Evidence and capability truth

Keep these statuses distinct in source catalogue/UI/model context:

1. **Documented candidate** — public documentation suggests potential utility; endpoint, terms, and schema not yet checked in the deployed runtime.
2. **Implemented** — source adapter exists in this repository.
3. **Configured** — required keys/settings exist in the target environment (never expose values).
4. **Operationally available** — current runtime preflight and access checks pass.
5. **Exposed to model** — this turn's capability/action schema includes it.
6. **Empirically used** — a real investigation executed it and retained source provenance.

A row in a source matrix is not proof of stages 3–6. An unavailable source is not a negative finding.

## Virtual Globetrotting

Candidate: [Virtual Globetrotting](https://virtualglobetrotting.com/), a public, map-oriented collection of geolocated imagery and community/editorial observations. It may help discover *publicly documented assets* and generate leads for independent corroboration; it is not an authoritative ownership registry.

**Assessment status: candidate only; access and reuse terms not verified in this repository/runtime review.** Before integrating, verify the current Terms of Use, robots/access policy, any API/feed/search endpoints, image licensing and attribution requirements, and whether each record distinguishes contributor-submitted material from editorial or authoritative claims. Do not infer that public visibility grants permission for scraping, bulk storage, image republication, or model training. Do not bypass technical controls.

If permitted and added, represent an entry as a provisional source observation with:
- original page URL and retrieval/observation timestamps;
- contributor/editor attribution and the source's own claim wording where available;
- content/source class (community observation vs editorial/official record);
- image/coordinate usage rights and attribution separately from text-page access;
- explicit state such as `independently_unconfirmed`;
- a follow-up hypothesis for official records or independent sources.

Do not derive beneficial ownership, personal wealth, exact residence, or movement profiles from a geotag or user-submitted property description. Prefer public commercial/industrial assets and broad geographic context; do not build precise private-home locator features.

## Additional source candidates to evaluate

These are discovery leads, not enabled integrations. Confirm current endpoints, schemas, terms, attribution, quotas, and runtime reachability before exposing them to a model or ingesting records.

| Candidate | Likely utility | Evidence limitations / integration conditions |
|---|---|---|
| [FAA Releasable Aircraft](https://registry.faa.gov/database/ReleasableAircraft.zip) | Bulk aircraft/registrant records and stable N-number linkage | Official bulk data, but registrant is not necessarily beneficial owner; respect owner-data withholding, record freshness and field-use restrictions. Bulk ingestion is distinct from direct per-aircraft lookup. |
| [USCG CGMIX / PSIX](https://cgmix.uscg.mil/PSIX/PSIXHelp.aspx) | Vessel identity, inspection and documented vessel leads; XML services are described by the agency | Check field coverage, privacy constraints, update cadence and terms before bulk persistence. A vessel record is not proof of yacht value or natural-person ownership. |
| [NOAA documented-vessel database metadata](https://www.fisheries.noaa.gov/inport/item/20701) | Vessel characteristics and documentation/ownership research leads | Validate whether current public query access supports intended use, freshness and fields; corroborate any owner attribution. |
| [Australian Maritime Safety Authority — registered ships](https://www.amsa.gov.au/vessels-operators/ship-registration/list-registered-ships) | Public ship-list seed candidates (name, official number, size/build details as published) | The list alone is not beneficial-ownership proof; certified extracts may be paid. Check download terms and source date before ingestion. |
| [New Zealand Register of Ships access](https://www.maritimenz.govt.nz/commercial-operators/all-commercial-operators/ship-registration/searching-the-register-of-ships/) | Specific-vessel follow-up | Public inspection/extract access is not equivalent to a free bulk dataset; verify fees and allowed reuse. |
| [ICIJ Offshore Leaks database](https://offshoreleaks.icij.org/pages/database) | Historical offshore entity/officer relationship leads | Dataset licensing/attribution must be followed; records can be stale, leaked/historical, and names collide. Never imply wrongdoing or resolve identities by name alone. |
| [OpenSanctions bulk/API documentation](https://www.opensanctions.org/docs/bulk/) | Sanctions, PEP and KYB screening/corroboration | Commercial use may require a data licence; preserve dataset/version/date and distinguish matches from confirmed identity. |
| [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright) | Public place/business context and broad geospatial relationships | ODbL attribution/share-alike obligations apply; place presence does not establish ownership. Do not use it to target private residences. |
| [GLEIF LEI data](https://www.gleif.org/en/lei-data/gleif-lei-look-up-api) | Stable legal-entity identifiers and reported parent relationships | Parent data is reported relationship evidence, not universal beneficial ownership. Retain LEI and record timestamps. |
| [UK HM Land Registry Price Paid Data](https://www.gov.uk/government/collections/price-paid-data) | Property transaction context | Transaction data is not a current title register and generally does not identify buyers in a way that proves current ownership; retain source/version and do not infer wealth mechanically. |

## Confirmed repository-level issues to reconcile

### FAA direct lookup vs bulk seeding

On the inspected `main` source, `artifacts/api-server/src/src/lib/registry-client.ts` includes `faa` in `REGISTRY_IDS`, aliases common FAA names, and advertises the direct official Aircraft Inquiry adapter as callable by default. The source matrix entry describes bounded direct lookup (five records/request). Separately, the UI's `artifacts/apex-finder/src/pages/data-sources.tsx` uses `POST /api/ingest/faa` with `maxRecords: 30000` and the official bulk ZIP URL. These are two distinct capabilities: direct lookup and bulk seeding. The UI's broad claim that the dataset contains all turbine/multi-engine aircraft owners is too strong unless verified against the current dataset schema and exclusions.

The board reports a separate API `/registry-matrix` projection hard-coding FAA `runtimeMode: "bulk_only"`, which conflicts with the direct adapter. That route implementation was not located in this pass, so treat the projection mismatch as a **reported defect awaiting exact-file reproduction**, not as patched. Correct the projection only after locating its route/test owner and coordinating the shared-file hand-off. Do not change FAA to unavailable merely to make the labels consistent.

### Per-source UI controls vs composite ingestion

The three UI source cards SEC EDGAR, Companies House, and BRREG each currently submit `/api/ingest/western-hnwi` with `{ targetCount: 1000 }` and job type `western-hnwi`. The UI source definitions describe those as individual sources, but the endpoint is a composite Western registry pipeline (as reported in the coordination board). The UI notes for SEC also explicitly say it is part of the composite pipeline. This creates a misleading per-source selection affordance: clicking a labelled source does not guarantee source isolation. W07 will not modify the shared UI/ingestion implementation without an explicit W08/W13 hand-off. The correct product contract is either one clearly named composite seed operation with executed-source breakdown, or true source-scoped options that the backend enforces and reports.

## Model-facing catalogue requirements

For every capability exposed to Boss/Right-hand/Investigator, provide concise metadata for purpose, inputs, result schema, when useful, provenance quality, limitations, licence/privacy, quotas/cost, runtime availability and invocation action. Generate runtime availability from actual preflight/attestation/configuration rather than static matrix presence. Source-quality classes are descriptive, not hard-coded exclusion rules: the Investigator may select a permitted community observation when it is a useful lead, while evidence and identity claims still require appropriate corroboration.

## Validation still required

- Inspect current terms/API documentation directly and retain the checked date/version before enabling Virtual Globetrotting or any new source.
- Add contract tests that distinguish implemented/configured/operational/model-exposed/empirically-used states.
- Reproduce the FAA projection mismatch against the exact route and ordinary API response; fix with the route owner and regression test.
- Correct the source-catalogue interaction contract for the three composite ingestion cards with W08/W13; do not silently change shared endpoint semantics.
- Verify all added source choices are visible only when actually callable, while preserving Investigator autonomy among the remaining legitimate alternatives.
