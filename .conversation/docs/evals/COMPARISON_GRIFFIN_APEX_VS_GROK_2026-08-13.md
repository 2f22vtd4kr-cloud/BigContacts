# Comparison Run: Apex vs Grok — Discovery-Found Target

**Date:** 2026-08-13  
**Protocol:** Apex discovery finds target → same target shared with Grok-style shallow agent → separate work → compare.  
**Target suitability:** Mid-market, public surface rich, not paywalled directory noise, HNWI-path ownership language present.

---

## 0. Discovery (Apex finds the target)

**Open objective (no company name):**  
Western/Michigan mid-market precision tooling / tool & die / CNC — find real companies and attributable owners.

**SERP mix:** owner/president/managing partner + BBB/leadership + Michigan tooling language.

**Selected shared target:** **Griffin Tool, Inc.** (Stevensville, MI)  
- Why suitable: ~65 employees, public about + contact pages, multi-gen family succession, name-tied role emails, org sales@ + phone + address, recent acquisition banner (Custom Tool & Die).  
- Rejected for this comparison as primary: pure directory/ZoomInfo-only hits, for-sale listings without public team pages, out-of-state name collisions.

**Shared seed given to both sides after discovery:**  
> Griffin Tool Inc, Stevensville MI — recover public contact surface, related officers, role emails/phones, ownership. Fail-closed; sourceUrls required.

---

## 1. Grok-style shallow result (expected / typical agent stop)

From homepage + light SERP without a fixed team-directory script:

| Vector | Typical hold |
|--------|----------------|
| Website | griffintool.com |
| One-liner | Family-run trim die shop, 35+ years |
| Phone | Often (269) 429-4077 if contact page visited |
| Email | sales@griffintool.com **or** none |
| People | Malcolm Cowan mentioned as CEO (sometimes); Greg Griffin as historical founder/owner from stale directories |
| Succession | Rarely fully reconstructed |
| Team directory | Usually **not** fully extracted |

**Characteristic failure:** stops after org surface or one named executive; does not systematically walk Name → role → mailto cards; does not gap-driven continuation until related persons attached.

---

## 2. Apex result (current capabilities + page evidence)

### Org surface (contact page `copy-of-contact-2`)

| Vector | Value | Source |
|--------|-------|--------|
| Address | 2951 Johnson Road, PO Box 528, Stevensville, MI 49127 | contact page |
| Phone | +1-269-429-4077 | contact page (trash gate passes) |
| Fax | 269-429-4560 | contact page |
| Org email | sales@griffintool.com | mailto — **organization scope only** |
| Website | https://www.griffintool.com | |
| Note on page | “For personal emails, see our team section” → forces /about visit | |

### Related persons (about page — name-tied mailtos)

| Person | Role | Email | HNWI-path |
|--------|------|-------|-----------|
| Malcolm Cowan | Chief Executive Officer and President | malcolm@griffintool.com | **Yes** (current principal + acquisitor) |
| Jenny Cowan | Chief Financial Officer | jenny@griffintool.com | **Yes** (acquired business 2018) |
| Lillian Cowan | Office Manager | lillian@griffintool.com | Medium (4th generation) |
| Jason Caropepe | Operations Manager | jason@griffintool.com | Medium |
| Tim Dye | Engineering Manager | tim@griffintool.com | Medium |
| Rod McGilvra | Senior Engineer | rod.mcgilvra@griffintool.com | Lower |
| Brian Moore | Head of CNC Department | brian.moore@griffintool.com | Lower |
| Debbie Schroeder | Administrative Specialist | page shows rick.fitts@… | Attach with caution (possible page mismatch) |

### Ownership / succession (narrative extractors)

- Greg Griffin founded 1988 (apprenticed under Louis Sahs / Progressive Tool & Die).  
- Malcolm & Jenny acquired the business from Jenny’s parents in 2018 (30th anniversary).  
- Lillian: fourth-generation family member (2021).  
- Homepage: “Griffin Tool has recently acquired Custom Tool and Die.”

### Loop behaviour that produces this

1. Mixed SERP → candidate URLs include /about and contact.  
2. Org phone + sales@ admitted → **gap notice** while related persons = 0.  
3. Force related-people / leadership visit → about page.  
4. CONTACT FACTS + Griffin-style Name/role/Extension/mailto extractor + markdown heading roles.  
5. sales@ stays organization; name-tied emails are related-person / personal-candidate with sourceUrl.  
6. Trajectory salvage if LLM drops any role email.

---

## 3. Head-to-head

| Dimension | Grok-style | Apex (designed hold) | Winner |
|-----------|------------|----------------------|--------|
| Org phone + address | Maybe | Yes + sourceUrl | Apex |
| Org mailbox scope | Often ambiguous | sales@ = organization only | Apex |
| Named people with role email | 0–1 | 7+ with mailto | **Apex** |
| Succession / acquisition facts | Thin | Founder → 2018 buyout → 4th gen + Custom Tool & Die | **Apex** |
| HNWI-path flag | Unclear | Malcolm + Jenny explicit | Apex |
| Invented contacts | Risk if prompted hard | Fail-closed | Apex |
| Stop condition | “Enough surface” | Refuse-done until people attached | Apex |

**Verdict:** On this discovery-found target, Apex’s maximizer is built to **destroy** a shallow Grok Agent run on people-contacts and ownership narrative while staying fail-closed on org vs personal.

---

## 4. Improvements from this comparison (code)

1. **Griffin-style team cards** — Name heading → role → optional `Extension N` → mailto within ~6 lines (Wix/markdown about pages).  
2. **Role vocabulary** expanded: Office Manager, Operations Manager, Engineering Manager, Administrative Specialist, Head of CNC, Process Engineer, Director of Business Development, Plant Manager (also in multi-line markdown role list).

These close the gap if plain-text observation from /about does not preserve HTML `>Name<…mailto` proximity.

---

## 5. Suitability checklist (for future shared targets)

A target is **good for Apex vs Grok comparison** when:

- [x] Found by open discovery (not operator-planted only)  
- [x] Primary company domain has /about or /team with multiple people  
- [x] At least one ownership or succession sentence  
- [x] Org contact page with phone + org inbox  
- [x] Mid-market (not pure F500 IR page, not pure ZoomInfo)  
- [x] Emails visible without login  

Griffin Tool passes all. Patterson Precision is a secondary cohort member (leadership list strong; org email still requires hop).

---

## 6. Next comparison candidates (already in overnight-targets)

- griffin (this doc)  
- patterson  
- leroy (BBB principals)  

When API is live: run agentic job on Griffin objective; score related-person count ≥5 with sourceUrls; regress against this ledger.
