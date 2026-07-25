# ApexFinder Pro — Improvement Roadmap

> **Tracking contract:** This file is the canonical source of truth for all planned and in-progress work.  
> After every re-import, read this file first and update status markers before starting work.  
> Use `[x]` for complete, `[-]` for in-progress, `[ ]` for not started, `[~]` for deferred/blocked.  
> Append to the **Completion Log** at the bottom after each phase or significant item lands.

---

## Audit Baseline (2026-07-25)

From the pipeline audit (`attached_assets/Pasted-Pipeline-Audit-*.txt`):

| Metric | Reported | Actual |
|---|---|---|
| "Reachable" entities | 992 (3.08%) | ~992 have *some* contact signal — majority is organisational |
| True personal contacts (SMTP + GitHub + clean ContactPage) | — | ~100–140 |
| True personal-contact yield | 3% | ~0.4–0.5% |
| Generic/corporate inboxes in email pool | — | ~30–35% of all emails |
| Registrar-contact noise (web.com, namebright, AWS) | — | ~32 entries |
| Entities with NULL contact_outcome | — | 99.88% of 32,201 |
| organisation_contact outcome assigned | — | 0 entities |

**Root cause:** The pipeline has no contact-type discrimination — it cannot distinguish "personal email" from "company customer-service address." The architecture is sound; the fixes are targeted and achievable.

---

## Phase K — Contact Quality Hardening *(immediate, highest ROI)*

> Goal: Clean the existing contact pool. No new sources. Fixes the four audit priorities plus phone hygiene.

### K1 — RDAP Registrar Domain Blocklist
**File:** `artifacts/api-server/src/lib/in-house-enricher.ts` → `rdapLookup()`  
**Problem:** RDAP returns the registrar's own contact (web.com ×12, namebright ×2, AWS support ×18) because `rdapLookup()` only filters "abuse"/"privacy"/"proxy" in the email string — it does not check whether the email's domain belongs to a registrar/hosting provider rather than the entity being researched.  
**Fix:** Before accepting any RDAP email, extract its domain and reject it if it matches a registrar/hosting blocklist. Also compare against the entity's own `knownDomain` — if the RDAP contact domain differs from the entity domain AND appears in the registrar list, discard.

```
REGISTRAR_DOMAINS = {
  web.com, namebright.com, godaddy.com, networksolutions.com,
  enom.com, hugedomains.com, domainsbyproxy.com, namesilo.com,
  register.com, domain.com, bluehost.com, hostgator.com,
  cloudflare.com, squarespace.com, wix.com,
  // AWS / hosting infra (source of support.aws.com hits):
  amazonaws.com, awsdns.com, amazon.com,
}
```

- [ ] Add `REGISTRAR_DOMAINS` set to `rdapLookup()` in `in-house-enricher.ts`
- [ ] Reject RDAP email if its domain is in `REGISTRAR_DOMAINS`
- [ ] Reject RDAP phone if the RDAP org name matches a known registrar
- [ ] Add unit test: RDAP result with web.com email → null returned
- [ ] Add unit test: RDAP result with entity's own domain → accepted

---

### K2 — Generic Prefix Penalty at `setEmail()` Write Time
**File:** `artifacts/api-server/src/lib/in-house-enricher.ts` → `setEmail()` (line 1225)  
**Problem:** `setEmail()` only compares confidence levels. Generic corporate prefixes (info@, sales@, contact@, support@ etc.) pass through unchanged and score as `direct_contact_candidate` because `computeContactOutcome()` is not being called during enrichment writes.  
**Fix:** Inside `setEmail()`, detect generic local-parts and apply a −30 confidence penalty. If the penalised score falls below the source's minimum floor, reject the email entirely. Update `contact-validation.ts` with the full prefix list.

```
GENERIC_PREFIXES = {
  info, contact, sales, support, press, admin, hello, office,
  noreply, billing, ops, team, media, pr, legal, hr, webmaster,
  enquiries, enquiry, general, reception, invest, ir,
  "investor.relations", customerservice, help, jobs, careers,
}
```

- [ ] Add `GENERIC_PREFIXES` set to `contact-validation.ts`
- [ ] Export `isGenericEmailPrefix(local: string): boolean` from `contact-validation.ts`
- [ ] In `setEmail()`: if `isGenericEmailPrefix(local)`, apply `confidence -= 30`; if result < source floor, return without setting
- [ ] Ensure `organization_contact` tagging happens when generic prefix is detected at write time (set a flag on `result` for outcome computation)
- [ ] Unit test: `setEmail("sales@legit.com", 65, ...)` → rejected (65 − 30 = 35, below 50 floor)
- [ ] Unit test: `setEmail("john@legit.com", 65, ...)` → accepted

---

### K3 — Cross-Entity Email Uniqueness Scan
**File:** New route in `artifacts/api-server/src/routes/ingest-enrichment.ts`  
**Problem:** An email appearing on 3+ distinct entities is almost certainly a shared corporate inbox (e.g. `deluxpubliccharter.llc@cae.com` on 5 rows). There is no post-enrichment sweep for this.  
**Fix:** Add `POST /api/ingest/flag-shared-emails` that queries for emails appearing on ≥3 distinct entities, bulk-updates their `contactOutcome` to `organization_contact`, and logs a summary. Run this after every enrichment pass.

- [ ] Add SQL query: `SELECT email, COUNT(DISTINCT id) FROM entities WHERE email IS NOT NULL GROUP BY email HAVING COUNT(DISTINCT id) >= 3`
- [ ] Bulk-update matched entities: `contactOutcome = organization_contact`
- [ ] Return summary: `{ flagged: N, emails: [...top offenders...] }`
- [ ] Wire into the cold-start / post-enrichment maintenance hook in `startup.ts`
- [ ] Add unit/integration test

---

### K4 — Auto-Trigger Backfill After Ingestion
**File:** `artifacts/api-server/src/lib/startup.ts`, `artifacts/api-server/src/routes/ingest-enrichment.ts`  
**Problem:** 99.88% of entities have `NULL contact_outcome`. The backfill endpoint exists (`POST /ingest/backfill-contact-outcomes`) but is never auto-called. Every dashboard metric (Reachable count, coverage %) reads `contactConfidence > 0`, which does not distinguish personal from organisational.  
**Fix:** Call the backfill automatically in two places: (a) in the post-ingestion maintenance hook after any ingest job completes, (b) at cold-start if the DB is non-empty and `contact_outcome IS NULL` for >10% of entities.

- [ ] In `startup.ts` post-ingestion watcher: after FAA/HMLR/Western-HNWI jobs finish, fire `POST /ingest/backfill-contact-outcomes` internally
- [ ] In `startup.ts` cold-start: check ratio of NULL `contact_outcome`; if >10%, auto-trigger backfill
- [ ] Add dashboard indicator: show last-backfill timestamp and NULL-outcome count as a health warning
- [ ] Verify backfill idempotency (already idempotent per existing code — confirm with test)

---

### K5 — Phone Number E.164 Normalisation
**File:** `artifacts/api-server/src/lib/in-house-enricher.ts` → `setPhone()`  
**Problem:** Audit found 101 entries with 12–19 digit phone strings (formatting noise) and 6 entries with 7–8 digits (too short). The `setPhone()` guard requires ≥7 digits, which admits 7-digit numbers no valid phone uses. International numbers are stored raw without E.164 normalisation.  
**Fix:** Normalise phone strings to E.164 at write time. Reject if digit count is outside valid range (8–15 per ITU-T E.164).

```
normalizePhone(raw):
  1. Strip non-digit chars except leading +
  2. Count digits — reject if < 8 or > 15
  3. If 10 digits and no country code, prefix +1 (US default)
  4. Store in +[countrycode][number] format
```

- [ ] Add `normalizePhone(raw: string): string | null` to `contact-validation.ts`
- [ ] Replace raw phone storage in `setPhone()` with `normalizePhone()` result
- [ ] Raise minimum digit count from 7 to 8 in the existing guard
- [ ] Add migration: `POST /api/ingest/normalize-phones` — normalizes all stored phone strings in the DB
- [ ] Unit tests: 7-digit → rejected; 10-digit US → `+1xxxxxxxxxx`; 12-digit with noise → cleaned

---

### K6 — Email Domain Parsing Bug (JS Filename as Domain)
**File:** `artifacts/api-server/src/lib/contact-validation.ts` → `isValidPublicEmail()`  
**Problem:** Audit found `10.5.13.module.js` appearing as an email domain — a JavaScript filename being parsed as an email address from scraped page content.  
**Fix:** Add a validation rule to `isValidPublicEmail()` that rejects any email domain ending in a known script extension (`.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`, `.py`, `.rb`, `.php`, `.sh`) or matching an IP-address pattern.

- [ ] Add script-extension TLD blocklist to `isValidPublicEmail()`
- [ ] Add IP-address domain pattern rejection (e.g. `10.x.x.x`)
- [ ] Unit test: `foo@10.5.13.module.js` → invalid; `foo@legit.com` → valid

---

## Phase L — Contact Outcome Correctness

> Goal: Make `computeContactOutcome()` correctly classify organisational vs personal contacts so the dashboard Reachable metric reflects reality.

### L1 — `computeContactOutcome()` Must Detect Organisational Contacts
**File:** `artifacts/api-server/src/lib/contact-confidence.ts` → `computeContactOutcome()`  
**Problem:** The function currently classifies any entity with an email or phone as `direct_contact_candidate`. It has no logic to assign `organization_contact`. EDGAR phone numbers (fund switchboards), generic inboxes, and RDAP registrar contacts all land as `direct_contact_candidate`.  
**Fix:** Add a new parameter `emailSource?: string` and `phoneSource?: string`. If the source is EDGAR-Phone or the email local-part is generic, return `organization_contact` instead of `direct_contact_candidate`.

- [ ] Add `emailSource?: string; phoneSource?: string; isGenericPrefix?: boolean` to `computeContactOutcome()` input type
- [ ] Rule: if `phoneSource === "EDGAR-Phone"` → `organization_contact`
- [ ] Rule: if `isGenericPrefix === true` → `organization_contact`
- [ ] Rule: if both email and phone exist but email is generic → `organization_contact` (phone is still captured but context is org)
- [ ] Update all callers in `ingest-enrichment.ts` and `phase-j.ts` to pass source metadata
- [ ] Re-run backfill after this change
- [ ] Unit tests for each new classification path

---

### L2 — Dashboard "Reachable" Metric Split
**File:** `artifacts/api-server/src/routes/dashboard.ts`, `artifacts/apex-finder/src/` (dashboard page)  
**Problem:** The dashboard shows a single "Reachable" count (`contactConfidence > 0`) that conflates personal and organisational contacts, making it misleading (992 shown, ~100–140 truly personal).  
**Fix:** Split the metric into three distinct counts: **Personal** (`direct_contact_candidate` or `direct_contact_verified`, non-generic email/phone), **Organisational** (`organization_contact`), **Social-only** (`social_only`). Show all three on the dashboard header strip.

- [ ] Add SQL query to `dashboard.ts`: count by `contact_outcome`
- [ ] Return `reachablePersonal`, `reachableOrg`, `reachableSocial` from `/api/dashboard/stats`
- [ ] Update dashboard header strip to show all three with distinct colours
- [ ] Keep existing `reachable` total for backwards compatibility
- [ ] Update the Access score display to reflect personal-only reachability

---

### L3 — Contact Evidence Audit Panel
**File:** `artifacts/apex-finder/src/` (new tab/panel on Data Sources page)  
**Problem:** No UI surface to inspect the contact quality breakdown — which email domains are most common, which sources contribute noise, what the prefix distribution looks like.  
**Fix:** Add a "Contact Audit" tab to the Data Sources page (`/data-sources`). Show: top 20 email domains by frequency, source attribution breakdown, generic-prefix count, SMTP-verified count, organization_contact vs direct_contact_candidate split.

- [ ] Add `GET /api/pipeline/contact-audit` endpoint returning domain frequency, source breakdown, outcome counts
- [ ] Add Contact Audit tab to Data Sources page
- [ ] Surface the "true personal yield" metric prominently

---

## Phase M — Yield Improvement

> Goal: Increase the true personal-contact yield from ~0.4–0.5% toward a measurable target. No new third-party APIs required — improvements to existing sources and enrichment logic.

### M1 — Promote SMTP-Verified Contacts to `direct_contact_verified`
**File:** `artifacts/api-server/src/lib/enrichment/structured-verification.ts`, `artifacts/api-server/src/routes/ingest-enrichment.ts`  
**Problem:** 60 emails passed SMTP handshake verification but are stored as `direct_contact_candidate`, not `direct_contact_verified`. The `validatedDirectContact` flag exists in the schema but is not being set after SMTP verification succeeds.  
**Fix:** After a successful SMTP handshake, set `validatedDirectContact = true` on the entity and recompute `contactOutcome` → `direct_contact_verified`.

- [ ] Confirm SMTP success path in `structured-verification.ts`
- [ ] Set `validatedDirectContact = true` on successful SMTP response
- [ ] Recompute and persist `contactOutcome = direct_contact_verified`
- [ ] Surface `direct_contact_verified` as its own badge/colour in Entity Ledger and profile pages
- [ ] Count of verified contacts in dashboard

---

### M2 — Multi-Pass Enrichment for `social_only` Entities
**File:** `artifacts/api-server/src/routes/ingest-enrichment.ts`, `artifacts/api-server/src/lib/startup.ts`  
**Problem:** Entities with only a LinkedIn URL (`social_only`) are marked `needsEnrichment = false` in some cases (J1 partially fixed this but cold-start recovery doesn't explicitly schedule a second pass).  
**Fix:** In the post-ingestion maintenance loop, identify `social_only` entities that haven't had a second enrichment pass (check `lastEnrichedAt` or enrichment-pass counter in metadata). Schedule them for a budget-capped background pass focused on domain guessing → email patterns → SMTP.

- [ ] Add `enrichmentPassCount` field to entity metadata (or use existing `lastEnrichedAt`)
- [ ] Post-maintenance: query `social_only` entities with `enrichmentPassCount < 2`
- [ ] Run targeted second pass: domain-guesser → email-pattern → SMTP only (skip knowledge graphs)
- [ ] Cap: max 100 entities per background pass to avoid OOM
- [ ] Log yield delta per pass in structured logs

---

### M3 — LLC → Person Resolution Coverage
**File:** `artifacts/api-server/src/lib/in-house-enricher.ts` → `resolveBeneficialOwner()`  
**Problem:** FAA aircraft are primarily registered to LLCs. The beneficial owner resolver exists (Phase I1) but only runs for Tier 3 entities. Many FAA LLC entities that could be pierced to a named individual are staying as LLC records with no personal contact path.  
**Fix:** Increase the coverage of LLC → person resolution by adding OpenCorporates fallback for LLCs that don't appear in EDGAR SC 13D/G, and by attempting resolution for Tier 2 entities (FAA individuals) whose names suggest an LLC wrapper.

- [ ] Audit current `resolveBeneficialOwner()` hit rate (add metric to enrichment logs)
- [ ] Add OpenCorporates lookup as fallback when EDGAR EFTS returns no result
- [ ] Extend to Tier 2 entities whose names end in LLC/Ltd/Corp
- [ ] Log resolved person names for review before enriching as person

---

### M4 — Contact Attribution Chain (Provenance Per Contact)
**File:** `artifacts/api-server/src/lib/contact-attribution.ts`  
**Problem:** Each entity has a single email/phone but no audit trail of which source provided it, at what confidence, and when. This prevents quality review and makes it impossible to batch-remove noise from a specific bad source.  
**Fix:** Persist the full contact evidence list per entity (source, value, confidence, timestamp) in a `contact_evidence` JSONB column or a new `contact_evidence` table. The winning contact is still promoted to the entity's `email`/`phone` columns for query efficiency.

- [ ] Design schema: `contact_evidence` table with `entity_id`, `type` (email/phone), `value`, `source`, `confidence`, `capturedAt`, `outcome`
- [ ] Write evidence rows in `setEmail()` / `setPhone()` instead of discarding non-winners
- [ ] Add `GET /api/entities/:id/contact-evidence` to expose the evidence chain
- [ ] Surface in profile page: "Contact Evidence" expandable section showing all sources
- [ ] Enable batch-purge by source: `DELETE FROM contact_evidence WHERE source = 'RDAP-Registrant'`

---

## Phase N — Infrastructure & Data Quality

> Goal: Platform health, dedup integrity, and resilience improvements that enable all other phases.

### N1 — Upstash Slot 1 Quota Replacement
**File:** `replit.md` (procedure documented), `artifacts/api-server/src/lib/redis.ts`  
**Problem:** `REDIS_URL_1` hit its 500k free-tier request cap. Slot scanner falls back to slots 2–4, but slot 1 keeps retrying non-fatally in the background, consuming log noise and marginal overhead.  
**Fix:** Add a fresh Upstash database as `REDIS_URL_5`. The slot scanner picks it up automatically.

- [ ] Create new Upstash Redis database at upstash.com
- [ ] Add its URL as `REDIS_URL_5` in Replit Secrets
- [ ] Restart API Server and confirm `Permanent Redis connected slot: 5` in logs
- [ ] Verify slot 1 retry noise subsides (it will keep retrying but slot 5 absorbs the work)

---

### N2 — Startup Auto-Backfill for Fresh Imports
**File:** `artifacts/api-server/src/lib/startup.ts`  
**Problem:** After every re-import, the DB repopulates from ingestion but `contact_outcome` stays NULL until someone manually calls `POST /ingest/backfill-contact-outcomes`. This means the dashboard is misleading for hours after each import.  
**Fix:** In `startup.ts`, after the post-ingestion watcher fires its first batch completion, automatically call the backfill endpoint internally. Also call K3's shared-email flagging sweep.

- [ ] Trigger `backfill-contact-outcomes` automatically after ingestion completes
- [ ] Trigger `flag-shared-emails` sweep automatically after backfill
- [ ] Log timing and row counts for both operations
- [ ] Document in `scripts/post-merge.sh` as step 4

---

### N3 — Pre-existing TypeScript Errors Cleanup
**File:** Various files throughout `artifacts/api-server/src/`  
**Problem:** Workspace typecheck has unrelated pre-existing errors noted across multiple session logs. These don't block builds (esbuild bypasses TS errors) but suppress real type-safety signals.  
**Fix:** Audit the pre-existing errors, fix or suppress with targeted `// @ts-expect-error` where genuinely intentional. Goal: clean `pnpm --filter @workspace/api-server run typecheck`.

- [ ] Run `pnpm --filter @workspace/api-server run typecheck 2>&1 | grep "error TS"` — count and categorize
- [ ] Fix structural errors (wrong types, missing properties)
- [ ] Suppress with `@ts-expect-error` only where the runtime behavior is correct but typings are wrong
- [ ] Target: zero typecheck errors in the API server

---

### N4 — Contact Deduplication Within Entities
**File:** `lib/db/src/schema/`, `artifacts/api-server/src/routes/ingest-enrichment.ts`  
**Problem:** "Delux Public Charter LLC" appears 5 times with identical email and phone. Ingestion dedup prevents re-ingesting the same registry record, but multiple enrichment passes or research sessions can write duplicate entity rows.  
**Fix:** Add a unique index on `(registry, registryId)` to prevent duplicate entity rows at the DB level. Add a cleanup endpoint to merge existing duplicates by registry+registryId.

- [ ] Audit: `SELECT registry, registry_id, COUNT(*) FROM entities GROUP BY registry, registry_id HAVING COUNT(*) > 1`
- [ ] Add unique index: `UNIQUE (registry, registry_id)` to the entities table (via Drizzle schema)
- [ ] Add `POST /api/ingest/dedup-entities` endpoint: merge duplicate rows (keep highest-confidence contact, merge metadata)
- [ ] Run dedup sweep on existing data after index is applied

---

## Completion Log

> Append one line per completed item or phase with date and brief note.

| Date | Item | Notes |
|---|---|---|
| 2026-07-25 | Roadmap created | Audit baseline established; Phases K–N defined |

---

## Quick Reference — Status Summary

| Phase | Title | Status | Priority |
|---|---|---|---|
| K1 | RDAP Registrar Blocklist | [ ] Not started | 🔴 Critical |
| K2 | Generic Prefix Penalty at setEmail | [ ] Not started | 🔴 Critical |
| K3 | Cross-Entity Email Uniqueness Scan | [ ] Not started | 🔴 Critical |
| K4 | Auto-Trigger Backfill After Ingestion | [ ] Not started | 🔴 Critical |
| K5 | Phone E.164 Normalisation | [ ] Not started | 🟠 High |
| K6 | Email Domain Parsing Bug (JS filename) | [ ] Not started | 🟠 High |
| L1 | computeContactOutcome Org Detection | [ ] Not started | 🔴 Critical |
| L2 | Dashboard Reachable Metric Split | [ ] Not started | 🟠 High |
| L3 | Contact Evidence Audit Panel | [ ] Not started | 🟡 Medium |
| M1 | Promote SMTP-Verified to direct_contact_verified | [ ] Not started | 🟠 High |
| M2 | Multi-Pass for social_only Entities | [ ] Not started | 🟠 High |
| M3 | LLC→Person Resolution Coverage | [ ] Not started | 🟡 Medium |
| M4 | Contact Attribution Chain (Provenance) | [ ] Not started | 🟡 Medium |
| N1 | Upstash Slot 1 Replacement | [ ] Not started | 🟠 High |
| N2 | Startup Auto-Backfill Fresh Imports | [ ] Not started | 🟠 High |
| N3 | Pre-existing TypeScript Errors | [ ] Not started | 🟡 Medium |
| N4 | Contact Dedup Within Entities | [ ] Not started | 🟡 Medium |
