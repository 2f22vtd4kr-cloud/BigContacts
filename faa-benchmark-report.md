# FAA benchmark report — 2026-08-02

## Scope

This controlled benchmark measures research quality on less-famous, business-linked individuals rather than celebrity visibility. Targets were selected from real FAA individual turbine/multi-engine aircraft-owner records. Warren Buffett, trusts, companies, obvious wrappers, and malformed names were excluded.

- Source import: 5,000 FAA records, 0 errors
- Cohort size: 16
- No synthetic entities or contacts were added
- Auto-ingestion remained disabled

## Runs

| Run | Result |
|---|---|
| Pre-attribution fix | 16/16 enriched, 13 social-only, 1 direct-contact candidate, 2 no usable contact outcomes |
| Five-target regression | 5/5 enriched, 0 errors; organization-only and same-name social values were not promoted |
| **Authoritative post-fix rerun** | **16/16 enriched, 0 errors, 10 social-only, 0 direct-contact candidates, 6 no usable contact outcomes** |

The post-fix result is authoritative because it applies the final fail-closed attribution and legacy-handle protections.

## Post-fix evidence and promotion

- 431 durable `contact_evidence` rows across the 16 targets
- Evidence scopes: 199 organization, 118 person-candidate, 98 target-person
- 6 HNWI social fields promoted from current-run attributed evidence
- No personal email or phone was promoted into the cohort
- Organization accounts, same-name/public-figure candidates, AI-only citations, and provider agreement without exact fetched claim URLs remained review-only
- Maigret/Sherlock were not allowed to use legacy entity handles as scan fallbacks

## Quality interpretation

This is a correctness and provenance milestone, not a 9/10 access-quality result. The authoritative direct-contact yield is 0/16. The remaining work is to improve lawful, evidence-backed access discovery without weakening identity, attribution, corroboration, freshness, or manual-review gates.