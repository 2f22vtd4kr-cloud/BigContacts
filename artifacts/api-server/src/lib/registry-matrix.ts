/**
 * Phase J2 registry coverage matrix.
 *
 * These labels describe the source and its current research-stage posture.
 * `productionReviewStatus` is intentionally informational; it is never used
 * as a runtime source gate.
 */

export type ProductionReviewStatus =
  | "review_required"
  | "reviewed_for_production"
  | "not_yet_assessed";

export interface RegistryCoverage {
  id: string;
  label: string;
  jurisdiction: string;
  entityIdentifier: string;
  personOfficerFields: string;
  ownershipAvailability: string;
  accessMethod: string;
  rateLimit: string;
  licensing: string;
  freshness: string;
  productionReviewStatus: ProductionReviewStatus;
  notes?: string;
}

export const REGISTRY_COVERAGE_MATRIX: readonly RegistryCoverage[] = [
  {
    id: "sec-edgar",
    label: "SEC EDGAR",
    jurisdiction: "US",
    entityIdentifier: "CIK, filing accession",
    personOfficerFields: "Named filers, directors, executives in filings",
    ownershipAvailability: "Large-holder filings and issuer disclosures",
    accessMethod: "SEC EFTS JSON API",
    rateLimit: "SEC fair-use limits; identify with User-Agent",
    licensing: "US public filings",
    freshness: "Live filings",
    productionReviewStatus: "reviewed_for_production",
  },
  {
    id: "companies-house",
    label: "Companies House",
    jurisdiction: "GB",
    entityIdentifier: "Company number",
    personOfficerFields: "Officers and PSC records",
    ownershipAvailability: "PSC records where filed",
    accessMethod: "Official REST API; key required",
    rateLimit: "Provider limits; 550ms spacing in enrichment",
    licensing: "UK public register terms",
    freshness: "Live register",
    productionReviewStatus: "review_required",
  },
  {
    id: "brreg",
    label: "BRREG Enhetsregisteret",
    jurisdiction: "NO",
    entityIdentifier: "Organisasjonsnummer",
    personOfficerFields: "Roles available through the company roles endpoint",
    ownershipAvailability: "Role data; not a universal beneficial-owner register",
    accessMethod: "Official REST API",
    rateLimit: "Public API; polite pacing required",
    licensing: "Norwegian open-data terms",
    freshness: "Live register",
    productionReviewStatus: "review_required",
    notes: "Entity search is normalized here; officer harvesting remains in the Western HNWI pipeline.",
  },
  {
    id: "ares-czechia",
    label: "ARES",
    jurisdiction: "CZ",
    entityIdentifier: "IČO",
    personOfficerFields: "Not included in the base entity search response",
    ownershipAvailability: "No beneficial-owner inference from base search",
    accessMethod: "Official ARES REST v3 search API",
    rateLimit: "Provider limits; avoid repeated identical or random queries",
    licensing: "Czech Ministry of Finance public service terms",
    freshness: "Live register; response includes update date",
    productionReviewStatus: "review_required",
    notes: "Company identity and address source; person/ownership expansion requires a separate attributable source.",
  },
  {
    id: "bodacc-france",
    label: "BODACC",
    jurisdiction: "FR",
    entityIdentifier: "RCS number, announcement id",
    personOfficerFields: "Names in commercial announcements when explicitly published",
    ownershipAvailability: "No universal beneficial-owner coverage",
    accessMethod: "DILA OpenDataSoft search API",
    rateLimit: "Provider quota; cache repeated searches",
    licensing: "Etalab Open Licence 2.0 / API terms",
    freshness: "Weekly dataset updates",
    productionReviewStatus: "review_required",
    notes: "Commercial-announcement evidence, not a company master register; records remain provenance-backed evidence.",
  },
  {
    id: "gleif",
    label: "GLEIF LEI Register",
    jurisdiction: "Global",
    entityIdentifier: "LEI",
    personOfficerFields: "Limited parent/relationship data",
    ownershipAvailability: "Parent relationships where reported",
    accessMethod: "Official JSON:API",
    rateLimit: "Approximately 60 requests/minute",
    licensing: "GLEIF data terms",
    freshness: "Live register",
    productionReviewStatus: "reviewed_for_production",
  },
  {
    id: "cvr-denmark",
    label: "CVR Denmark",
    jurisdiction: "DK",
    entityIdentifier: "CVR number (VAT)",
    personOfficerFields: "Not in base search; available via role endpoint",
    ownershipAvailability: "No direct beneficial-owner field in free tier",
    accessMethod: "cvrapi.dk free REST API — returns phone and email directly",
    rateLimit: "10 req/s; identify with User-Agent",
    licensing: "Danish public register; CVR API terms",
    freshness: "Live register",
    productionReviewStatus: "review_required",
    notes: "Uniquely valuable: free API returns venue phone and email fields alongside company identity.",
  },
  {
    id: "zefix-switzerland",
    label: "Zefix Switzerland",
    jurisdiction: "CH",
    entityIdentifier: "UID / CHID",
    personOfficerFields: "Not in base firm search",
    ownershipAvailability: "No beneficial-owner field in base search",
    accessMethod: "Zefix free REST API (zefix.ch/ZefixREST)",
    rateLimit: "Public API; reasonable pacing required",
    licensing: "Swiss commercial register public data",
    freshness: "Live register",
    productionReviewStatus: "review_required",
    notes: "Swiss Handelsregister; covers all cantons; no auth required.",
  },
  {
    id: "offeneregister-germany",
    label: "Handelsregister Germany (Open Register)",
    jurisdiction: "DE",
    entityIdentifier: "HRB/HRA number + court jurisdiction",
    personOfficerFields: "Not in base search; available in full filings",
    ownershipAvailability: "No direct beneficial-owner field",
    accessMethod: "offeneregister.de community mirror — Datasette SQL API, no auth",
    rateLimit: "Community resource; polite pacing required",
    licensing: "Handelsregister public data (§ 9 HGB) — open by law",
    freshness: "Periodic sync from Handelsregister; not real-time",
    productionReviewStatus: "review_required",
    notes: "Covers all German federal states. Uses offeneregister.de community dataset.",
  },
  {
    id: "bolagsverket-sweden",
    label: "Bolagsverket Sweden",
    jurisdiction: "SE",
    entityIdentifier: "Organisationsnummer",
    personOfficerFields: "Not in base search",
    ownershipAvailability: "No beneficial-owner field in public search",
    accessMethod: "Allabolag.se public search (wraps Bolagsverket data), no auth",
    rateLimit: "Polite pacing required",
    licensing: "Swedish public register data",
    freshness: "Live register via Allabolag aggregation",
    productionReviewStatus: "review_required",
    notes: "Swedish company registry covering all company types.",
  },
  {
    id: "opencorporates",
    label: "OpenCorporates",
    jurisdiction: "Global",
    entityIdentifier: "Jurisdiction + company number",
    personOfficerFields: "Varies by underlying registry",
    ownershipAvailability: "Varies by jurisdiction and source",
    accessMethod: "OpenCorporates API",
    rateLimit: "Free tier is limited",
    licensing: "OpenCorporates API terms",
    freshness: "Source-dependent",
    productionReviewStatus: "review_required",
  },
  {
    id: "faa",
    label: "FAA Aircraft Registry",
    jurisdiction: "US",
    entityIdentifier: "N-number",
    personOfficerFields: "Registrant name as published",
    ownershipAvailability: "Registrant only; not beneficial-owner proof",
    accessMethod: "Public bulk ZIP",
    rateLimit: "Bulk download; local cache",
    licensing: "FAA public data terms",
    freshness: "Periodic bulk release",
    productionReviewStatus: "review_required",
  },
  {
    id: "hmlr-ppd",
    label: "HMLR Price Paid Data",
    jurisdiction: "England & Wales",
    entityIdentifier: "Transaction UUID",
    personOfficerFields: "Buyer identity is not present in PPD",
    ownershipAvailability: "Property transaction evidence only",
    accessMethod: "Public bulk CSV",
    rateLimit: "Bulk download; local cache",
    licensing: "UK government open-data terms",
    freshness: "Monthly/annual bulk releases",
    productionReviewStatus: "review_required",
  },
];
