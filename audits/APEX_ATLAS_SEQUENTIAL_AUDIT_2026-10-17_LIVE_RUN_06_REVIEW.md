# Apex Atlas — Live Run 06 Audit Review

**Reviewed source commit:** [`95997040ad73de7075b9db84f95aec59e0ffd58f`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/95997040ad73de7075b9db84f95aec59e0ffd58f)  
**Canonical job:** `4903869d-4d4e-43e6-aca5-54f360234bd8`  
**Result:** terminal `failed / incomplete`; 20-Investigator-iteration ceiling reached.  
**Durable outcome:** zero entities, claim-grade evidence rows, contact-evidence rows, candidate admissions, or cards.

## What happened

- The audit checkpoint recorded 36 durable case events by the final observed state, 13 blocked tool observations, four full research actions accepted at an earlier checkpoint, one registry-tool error, and two Investigator token-window capacity failures that triggered one Boss-directed capability reassignment. The durable payloads mark `hardRequestQuotaExhausted=false`; these were not hard request-quota exhaustion.
- Queries were rejected before search execution because the alignment guard required literal overlap across subject, geography, and source-class wording. This blocked official source discovery (for example, a Secretary-of-State/business-entity search without a literal sector anchor) and localized queries such as Polish renewable-energy terms.
- The geographic parser treated `Baltic states (Estonia, Latvia, Lithuania)` as a literal multi-token requirement rather than an OR-region, rejecting an Estonia query despite Estonia being explicitly named in the active pivot.
- The Germany registry action used `/handelsregister.json` and incompatible plural-table/column names. The public OffeneRegister demo shows singular `company` and `officer` tables and exposes a SQL interface; the adapter did not match that interface.
- The successfully fetched page was a generic private-equity directory, not claim-grade evidence for a named owner/operator. Search results and fetched pages correctly remained leads; zero admissions/cards is not a projection defect.

## Fixes in this change set

1. Web discovery enforces the active substantive subject and geography but does not require every search-engine query to repeat an explicit source-class phrase. A narrowly scoped official-registry discovery exception permits finding an in-scope source without presenting it as evidence or changing the research subject.
2. Registry searches may use a concise subject query while a selected adapter supplies jurisdiction/source-class context; geography must still match the query or adapter. Wrong-jurisdiction and unrelated-subject queries remain blocked.
3. The guard recognizes Baltic-country OR semantics, common aliases for Czech Republic, Poland, the Baltics, and Germany, diacritic-normalized location terms, and common native-language wording for renewable energy and agriculture.
4. The Germany registry adapter now targets the `openregister.json` SQL endpoint with a parameterized `:p0` query, known singular-table/column names, bounded limits, and no synthesized detail URL.
5. Raw model-visible audits are restricted to the ignored `private-audits/` directory when stored inside the workspace. Both Replit environment manifests now point the next run there, and raw live-trace filenames are ignored by Git.
6. The raw contact-bearing Run 06 trace is removed from the current repository tree; this summary retains the diagnostic findings without copying prompt/page/contact payloads.

## What remains empirically unproven

These changes address confirmed source-level defects and are gated by CI/regression tests. They do not prove that providers will return useful results in a future live run. A fresh operator-run is still needed to establish productive discovery and evidence-backed candidate admission; this review does not claim that Run 06 found a valid candidate.

**History note:** the raw trace had already been committed publicly. Removing it from the current tree does not purge earlier Git history; treat that earlier copy as disclosed.
