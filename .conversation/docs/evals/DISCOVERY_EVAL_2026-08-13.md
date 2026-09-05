# Discovery Mechanism Evaluation — 2026-08-13

**Focus:** Let Apex *find* targets (discovery-first), not only research pre-named ones.  
**Constraint this session:** Full API server + DB not available in sandbox; evaluation uses the same public-web queries and case-file shape `buildDiscoveryCaseFile` / Boss opening brief / agentic extractors are designed to drive.

---

## 1. How discovery is supposed to work (current code)

| Stage | Module / artifact | Behavior |
|-------|-------------------|----------|
| Intake | `case-bureau.buildDiscoveryCaseFile` | No pre-selected company. `bossPremise` = broad discovery + golden-standard pointer. `discoveredCandidates: []`, `entityLinks: []`, `orgFootprint` empty. |
| Opening brief | `buildBossOpeningPrompt` (discovery branch) | “Do not assume a target… Discover promising candidates… Rank direct routes first… Preserve exact source URLs.” |
| Query plan | `web-search-queries` + agentic SERP mix | Company / owner / BBB / OpenCorporates / Facebook org-inbox / leadership angles when a name appears; first pass is *category + geography* searches. |
| Lanes | `candidateLanes` | Founder/operator-investors, family offices, regional business owners, portfolio/advisors, intermediaries, social/org routes, wallet-first. |
| Fill | API research job (cases route) | Boss + right-hand + agentic loop populate `discoveredCandidates`, `entityLinks`, `orgFootprint`. |
| Score | `scripts/score-discovery-case.mjs` | email / phone / website / address / relatedPeople / entityLinks / orgFootprint / zeroPollution. |
| Overnight | `overnight-targets.json` + autoresearch | Fixed cohort for regression; **not** the discovery finder itself. |

**Gap observed:** `discovery-source-mixer` / `broad-discovery.ts` / `browser-fetch` are referenced by apply scripts and floor checks but are **missing** from this tree → discovery stack floor 20/24. Research extractors are present; broad randomised Western mixer is not fully wired in-repo.

---

## 2. Open discovery run (no pre-named company)

**Human mission (discovery-first):**  
> Western Michigan / Michigan mid-market precision tooling, tool & die, CNC machining. Find real companies and attributable owners/officers with public contact surface. Practical proximity to decision-makers. Fail-closed.

**SERP mix used (mirrors agentic / Boss opening angles):**

1. `Western Michigan precision tooling OR tool and die OR machining "owner" OR "president" OR "managing partner"`
2. `"tool and die" OR "precision machining" Michigan (BBB OR "about us" OR leadership OR team) (owner OR president OR CEO)`
3. `site:bbb.org Michigan "tool" OR "die" OR machining owner OR principal`

**Candidates discovered (sample — public evidence only):**

| Candidate | Why relevant | Early people / ownership signal | Primary URL |
|-----------|--------------|----------------------------------|-------------|
| **Griffin Tool, Inc.** (Stevensville, MI) | ~65 employees, trim dies, multi-gen family | Malcolm Cowan CEO/Pres; Jenny Cowan CFO; succession 2018; Lillian Cowan Office Mgr (4th gen) | griffintool.com/about |
| **Patterson Precision Manufacturing** (Muskegon / Norton Shores) | Family + SBA woman-owned, die/CNC | Leslie Patterson Owner & CEO; Larry Dyer; Morgan Carroll | pattersonpmfg.com/company |
| **Walker Tool & Die** (Grand Rapids) | ~60 employees, stamping dies, 2nd gen | Jeff Umlor President; Dave Hendricks ownership line | mlive + metalforming coverage |
| **Leroy Tool & Die** (Leroy, MI) | BBB principals explicit | Terry Wanstead Owner; Judy Wanstead Sec/Treas; Eric Wanstead Plant Mgr | bbb.org profile |
| **KB Tool & Die** (Sterling Heights) | Classic validation surface | Alan G. Klinger / President + role emails on contact page | kbtoolanddie.com |

Discovery **did** surface both net-new names and a known validation target (KB) without being given those names in the objective.

---

## 3. Deep surface: Griffin Tool (Apex-shaped vs shallow)

**Page:** https://www.griffintool.com/about  

**What a shallow “Grok Agent-style” pass often stops at:**  
Company exists; Malcolm Cowan is CEO; family business; maybe one generic contact form.

**What current Apex extractors + golden-standard loop are built to hold:**

| Person | Role | Email (page mailto) | Scope | HNWI-path? |
|--------|------|---------------------|-------|------------|
| Malcolm Cowan | Chief Executive Officer and President | malcolm@griffintool.com | related-person (name-tied) | Yes — CEO + ownership succession |
| Jenny Cowan | Chief Financial Officer | jenny@griffintool.com | related-person | Yes — acquired business 2018 with Malcolm |
| Lillian Cowan | Office Manager | lillian@griffintool.com | related-person | Medium — 4th gen, not principal |
| Jason Caropepe | Operations Manager | jason@griffintool.com | related-person | Medium |
| Tim Dye | Engineering Manager | tim@griffintool.com | related-person | Medium |
| Rod McGilvra | Senior Engineer | rod.mcgilvra@griffintool.com | related-person | Lower |
| Brian Moore | Head of CNC Department | brian.moore@griffintool.com | related-person | Lower |

**Ownership narrative (extractors already ship for this class):**  
Greg Griffin founded 1988 → Malcolm & Jenny acquired 2018 (30th anniversary) → Lillian fourth-generation.  
That is exactly the “second-generation / succession / acquired by” class the agentic patterns target.

**Org surface:** domain `griffintool.com`; role emails are **name-tied**, not info@ — Personal/related scope is justified by page context + mailto.  
**Refuse-done:** after any org phone/website, related-people hop would still force BBB/leadership if this page had been missed.

**Scorecard expectation if case file filled correctly:** high on website, relatedPeople, entityLinks; email vectors present with sourceUrls; zero pollution if only griffintool.com / about used.

---

## 4. Deep surface: Patterson Precision Manufacturing

**Page:** https://pattersonpmfg.com/company/  

| Person | Role | Evidence |
|--------|------|----------|
| Leslie Patterson | Owner & CEO | Explicit leadership list + ownership sentence |
| Larry Dyer | Process Engineer | Leadership list |
| Morgan Carroll | Director of Business Development | Leadership list |

**Phone (secondary public):** (231) 733-1913 (directory; must still be admitted only with sourceUrl and trash-gate).  
**Email:** no role mailbox on the company page in this visit — org inbox hop still required (model-chosen email/contact search).  
**HNWI-path:** Leslie Patterson (Owner & CEO, woman-owned SBA) is the primary flag.

Shallow pass: “family-owned machine shop in Muskegon.”  
Apex-shaped: three named leadership contacts + ownership claim + forced next hop for org email/phone with provenance.

---

## 5. Comparison summary (discovery → research)

| Dimension | Discovery-first (this run) | Research-only (prior focus) |
|-----------|----------------------------|------------------------------|
| Target origin | SERP category + geography; no company in objective | Operator names company |
| Case start | Empty `discoveredCandidates` | Often company-lock first |
| Success metric | Candidates + entityLinks + orgFootprint scorecard | People-contacts + org surface vs Grok floor |
| Failure mode | Stops at famous names; pollution from directories | Misses directory people; marks info@ Personal |
| Griffin outcome | Found via open MI tooling search | Would win hard on full about-page directory |
| Mixer / broad-discovery | **Missing files** — floor fails 4 checks | N/A |

**Conclusion:** Discovery *query and case-file design* work. Live open search produced usable mid-market targets with public people surface. Full automated discovery loop still depends on missing mixer/browser modules + running API. Research maximizer on discovery-found Griffin would destroy a shallow agent run (7+ role emails + succession narrative vs 0–1 names).

---

## 6. Actions taken

1. Added discovery-found targets to `scripts/overnight-targets.json` (Griffin, Patterson, Leroy).  
2. This document committed as the discovery-side counterpart to `GOLDEN_STANDARD_CASE_REFERENCE.md`.  
3. Discovery stack floor remains 20/24 until `browser-fetch` + Boss org-footprint methodology string + mixer land.

---

## 7. Recommended next engineering (batch)

1. Restore or stub `browser-fetch.ts` (Scrapfly/ZenRows/Playwright paths) to green discovery floor.  
2. Land minimal `discovery-source-mixer` + wire `apply-discovery-mixer.mjs` targets so Western category rotation is real.  
3. When API is up: run `run-single-discovery-test.mjs` with **no** company name in objective; score with `score-discovery-case.mjs`.  
4. Holdout: Griffin Tool about page — assert ≥5 related persons with sourceUrls and name-tied emails.
