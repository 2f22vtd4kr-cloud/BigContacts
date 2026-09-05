# Apex Atlas live comparison bug report

**Observer:** independent Grok Agent (not the Atlas pipeline)  
**Live desk:** `https://b583b395-5bda-412f-989d-9204fa1f9a0d-00-1jxi1gqvbf9ue.riker.replit.dev`  
**Job:** `0586c50c-5ac8-4880-abdc-4ac7117ad40d` (atlas-run, status **done**)  
**Window:** 2026-08-19T21:27:50Z → 21:34:08Z (~6 min)  
**Healthz at observe time:** ok · Redis ok · providers groq=1 gemini=1 tavily=1 exa=2 mistral=1 nvidiaNim=1 companiesHouse=1 · autoPipeline=false  

**Rule:** any case where independent public research recovers more *attributable* identity/role/related-person/contact surface than Apex for the same target is logged as a **comparison-test failure** (bug). Invented contacts do not count for either side.

---

## Run summary (Apex)

| Metric | Apex reported |
|--------|----------------|
| Entities in ledger | **3 rows** — all the same person (`Andrew F Johnson` ids 1, 2, 3) |
| Unique people | **1** |
| Contacts (email/phone/personal social) | **0** |
| Hot leads | 3 (score artifacts on duplicates) |
| Discovery message | admitted **1/3**; registry batches 1–6 mostly 0 new; broad sources 0 cooked |
| Primary outcome | `timeout_review` / `needs_follow_up` / `evidence_only` |
| Phase J | 0 direct verified · 0 personal vectors · 0 org contacts · domain resolver noise |

Message excerpt:

> Atlas complete in 6min. 3 entities | 3 hot leads | **0 contacts found**. … Src 1: EDGAR/CH/BRREG/BODACC — batch 1: 1 → cooked | … Discovery loop: 0 target journeys completed across 9 sources (admitted 1/3…)

---

## CT-001 — Andrew F Johnson (Hastings Manufacturing Co)

### Apex card (as stored)

| Field | Apex |
|-------|------|
| Name | Andrew F Johnson |
| Type | HNWI |
| Source | SEC EDGAR — SC 13D (fileDate **2001-02-12**) |
| Issuer | HASTINGS MANUFACTURING CO |
| Location | Hastings, MI |
| Email / phone / LinkedIn | **null** |
| Contact method text | “approach via transfer agent, IR, or shared investor network” (generic) |
| Net worth | $2M floor (low confidence) |
| Role / title | **not stored** |
| Related people as entities | **none** |
| Duplicates | **3 identical ledger rows** (id 1, 2, 3) |

Also observed in Phase J / candidate vectors (pollution):

- `directory-cta-corrected`, `Directory Search`, HTML srcset fragments typed as `domain`
- Person names (`Chris Cook`, `Robert M. Bellgraph`) typed as `domain` with `mark: organization`

### Independent Grok Agent research (public surface only)

Same goal: identify the person behind the SC 13D / public-company trail and recover **attributable** role, related principals, and contactable org surface.

| Fact | Public source | Apex had it? |
|------|----------------|--------------|
| SC 13D / Johnson Family Group beneficial ownership of Hastings Mfg | SEC EDGAR (e.g. accession group with ANDREW F. JOHNSON; proxy tables) | Partial (issuer + form + date) |
| **President of Hastings since Nov 2001**; Co-CEO / President–Operations 1994–2001; career at Hastings since 1973 | DEF 14A / proxy bio (e.g. 2003 proxy: “Andrew F. Johnson has been Hastings' President since November 2001…”) | **NO** |
| **Director since 1977** | Same proxy bio | **NO** |
| Business address **325 North Hanover, Hastings, Michigan 49058** (c/o Hastings Mfg. Co.) | Proxy beneficial-owner table footnotes | **NO** (only city-level “Hastings, MI”) |
| Family / related principals: **Mark R. S. Johnson** (Co-CEO Marketing), **Stephen I. Johnson**, S&I Johnson Limited Partnership, SAMCO, Inc., other Johnson Family Group members | SC 13D/A group members + proxy ownership tables | **NO** structured related entities / gatekeepers |
| Share counts / % class (e.g. sole + shared power rows for Andrew F. Johnson) | Proxy ownership tables | **NO** |
| Age band from proxy (e.g. age 54 in 2003 → ~1949 cohort) | Proxy | **NO** |
| Company historical context (piston rings / Hastings MI industrial) | Encyclopedia / company history pages | Partial noise only |

**Personal email / mobile:** neither side recovered a verified personal inbox or phone (correct fail-closed behavior if none is public).  
**Org route:** independent research points to company HQ / IR / transfer-agent path with a **concrete street address**; Apex left only a generic sentence.

### CT-001 verdict

| Dimension | Winner | Notes |
|-----------|--------|--------|
| Identity lock to SEC SC 13D + issuer | Tie / Apex ok | Apex correctly tied name ↔ Hastings Mfg SC 13D |
| Role / officer-director facts | **Grok Agent** | Apex missed President / Co-CEO / director-since |
| Street-level org address | **Grok Agent** | 325 N Hanover present in proxy; Apex city only |
| Related people / family group surface | **Grok Agent** | Mark R. S. Johnson, Stephen I. Johnson, LP, SAMCO not admitted |
| Personal email/phone | Tie (none) | Fail-closed OK |
| Evidence cleanliness | **Grok Agent** | Apex stored HTML/directory garbage as “domain” vectors |
| Dedup | **Grok Agent** | Apex triple-stored the same person |

**COMPARISON TEST FAILURE (CT-001): Apex lost on evidence coverage and related-person surface for the only unique target in the run.**

---

## Systemic bugs observed this run

### BUG-LIVE-001 — Same person still first / only unique admit
Despite discovery mixer intent, this job’s only unique person is again **Andrew F Johnson** from EDGAR batch 1. Registry batches 2–6 admitted **0**.  
**Likely:** Replit tip may predate `4753d6e` (shuffle terms/page/harvesters/sources), **or** residual ledger + weak dedupe re-cooked the same identity.  
**Action:** confirm deployed SHA ≥ `4753d6e`; clear ledger before next comparison cycle.

### BUG-LIVE-002 — Duplicate entity rows (same person ×3)
Ledger returned **three** HNWI rows with identical name, source, metadata company, and null contacts.  
**Action:** harden admit-path dedupe on normalized name + source registry + issuer CIK/company; block second insert in same job.

### BUG-LIVE-003 — Enrichment timeout → thin card
`atlasLastError`: target enrichment exceeded **180s** in Phase J cook. Result: `timeout_review`, 0 contacts, missing role extraction from the same EDGAR/proxy URLs already in scope.  
**Action:** raise budget for single-target EDGAR/proxy parse **or** prioritize DEF 14A / latest proxy fetch before generic web crawl so role/address land inside the timeout.

### BUG-LIVE-004 — Contact/domain vector pollution
Phase J candidates include UI chrome and unrelated strings as `vectorType: "domain"` (`directory-cta-corrected`, srcset fragments, “Directory Search”). Person names mis-marked as organization domains.  
**Action:** gate candidate vectors through `looksLikeDomain` / `looksLikePersonName`; never persist marketing-CDN path fragments.

### BUG-LIVE-005 — Related officers not promoted
Proxy tables list **Mark R. S. Johnson**, other directors/officers, and family-group entities. Apex did not create related Corporation/Gatekeeper rows or a clean related-person list on the primary card.  
**Action:** when issuer is known, parse DEF 14A / proxy ownership + director tables into related entities (fail-closed, sourced).

### BUG-LIVE-006 — Wealth floor without role context
$2M minimum HNWI floor applied while officer/director evidence was available on SEC HTML the pipeline already touched. Not a contact loss, but weak ranking signal.  
**Action:** if SC 13D + operating company officer, prefer “operating company principal” narrative over bare floor.

### BUG-LIVE-007 — Discovery throughput
Admitted **1/3** target budget; broad sources reported 0 cooked; six registry batches after the first admitted nothing.  
**Action:** after `4753d6e`, re-run and expect CH/BRREG/web diversity; if still EDGAR-only, instrument which harvester yields and why others return 0.

---

## Comparison scoreboard (this job)

| Target | Apex unique value | Independent extra (public) | Result |
|--------|-------------------|----------------------------|--------|
| Andrew F Johnson (×3 rows) | SC 13D identity + Hastings issuer + city | President/Co-CEO/director bio, 325 N Hanover, family/related principals, clean proxy facts | **Apex LOST (CT-001)** |

**Contacts:** Apex 0 · Independent 0 personal (org address recovered independently only).

---

## Next observe cycle

1. Deploy/pull **≥ 4753d6e**; hard refresh Replit.  
2. **Clear ledger** (purge duplicates).  
3. Launch one bounded discovery-first run (`skipFaa: true`).  
4. For **each unique** name Apex admits, repeat independent research + append CT-00N.  
5. Treat any independent win on attributable role/related/contact as **bug**, not “acceptable variance.”

---

*File path: `docs/comparisons/BUG_REPORT_LIVE_RUN_2026-08-19.md`*  
*Commit with discovery diversity fix follow-up as needed.*

---

## Fixes applied (post CT-001)

Committed after this observation (see git history):

| Bug | Fix |
|-----|-----|
| CT-001 / role+address miss | **`edgar-identity-boost.ts`** — early DEF 14A / proxy parse before AI web OSINT; writes `linkedinHeadline`, street `knownResidences`, related-person evidence |
| BUG-LIVE-003 timeout | **`DEFAULT_TARGET_TIMEOUT_MS` 180s → 420s** so proxy + agentic can finish |
| BUG-LIVE-002 duplicates | **DB + within-batch normalized-name dedupe** in Western HNWI insert |
| BUG-LIVE-004 vector pollution | **`sanitizeValue`** rejects non-domain strings, HTML chrome, person names as domains |
| BUG-LIVE-001 first-name bias | Already in `4753d6e` (shuffle terms/pages/sources); redeploy required |

Redeploy Replit from tip, **clear ledger**, re-run bounded discovery-first, re-compare CT-001.
