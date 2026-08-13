# Apex Atlas — Textbook Golden-Standard Case Reference

**Status:** Canonical internal reference for Boss, right-hand (zAI), investigator prompts, and case-bureau.  
**Last aligned tip:** current main (contact-validation + wallet probe + wealth formal field).  
**Purpose:** Every mid-market public-surface run should converge toward this shape of execution. Grok Agent is the floor; this is the ceiling Apex is engineered to hold.

---

## 0. Intake & Discovery Case File

**Operator objective (mixed-randomised sources example)**  
> “Western Michigan precision tooling / die shop, mid-market. Public surface only. Recover every attributable person (owners, officers, managers) + role emails/phones. Prefer company directories, BBB, ownership narratives, local news. Fail-closed. Maximize people-contacts that can lead to HNWIs.”

**case-bureau.ts — buildDiscoveryCaseFile**

- Lane: **company-first** (no wallet string → wallet plan not injected).  
- `bossPremise` written immediately with non-negotiable rules:  
  > Grok is the floor. Apex maximises attributable people-contacts (owners, officers, founders + role emails/phones). Never invent contacts. Never mark org inboxes (info@, sales@, etc.) as Personal. Trash-phone gate stays on. Refuse done while org surface exists and zero related persons are attached.  
- `openQuestions` seeded:  
  1. Primary company domain + contact surface  
  2. Leadership / team / about directories  
  3. Ownership / succession / second-generation language  
  4. BBB / OpenCorporates / EDGAR principals  
  5. Domain-aligned personal vs org emails  
  6. Public wealth signals (filings, later wallet if appears)

Case context document starts empty and is appended after every agentic step.

---

## 1. Investigator Prompt (investigator-prompt-guide.ts)

Boss emits the investigator surface brief (SURFACE MANDATE):

```
SURFACE MANDATE
- Visit every plausible company, about, team, leadership, dealer, contact page.
- CONTACT FACTS are prepended from raw HTML before any LLM extraction (deterministic backstop).
- Extract every Name / Title slash, multi-line markdown heading, compound title, ownership narrative, lowercase team card, Willis-style directory segment, ALL-CAPS block.
- Cloudflare email-protection must be decoded.
- Org mailboxes force-attached with scope=organization only.
- Related-people SERP hop is mandatory once any org email or phone is present.
- Refuse done until related persons are attached or surface is demonstrably exhausted.
```

Right-hand (zAI / nvidia-nim-case-reasoning) receives the same brief plus the disposition contract: structured findings + surface status; never instruct erasure of related persons.

---

## 2. Agentic Loop — Mixed-Randomised Sources Start

**Turn 0 – randomised SERP mix** (web_search)

Typical first queries (order may vary; force logic later prioritises):

1. `"<Company>" OR "<short name>" <geo> (tool OR die OR machining OR manufacturing)`  
2. `"<Company>" (owner OR president OR CEO OR "managing partner" OR "general manager")`  
3. `site:bbb.org "<Company>"`  
4. `"<Company>" (team OR leadership OR about OR directory)`

SERP returns noisy mix (chamber, old PDFs, Facebook About, real domain, BBB, directories). Candidate URLs collected. Early trash does **not** stop the loop.

CONTACT FACTS extracted from first successful HTML visit and prepended to every subsequent LLM step.

---

## 3. Primary Surface Lock + Org Contacts

High-value visit (e.g. `/about` or homepage footer).

Deterministic extractors + LLM EXTRACTION MANDATE:

- Org phone → `sanitizePublicPhone` → trash gate (`normalizePhone` rejects 555-exchange, all-same-digit, trivial sequences) → admitted if clean.  
- Org emails (`info@`, `sales@`, `quotes@`, etc.) → force-attached, **scope = organization only**. Never Personal.

Case context live update:

```
ORG SURFACE LOCKED
- domain: <company domain>
- phone: <E.164> (sourceUrl)
- org emails: … (organization scope)
```

Because org surface exists and related-person count = 0 → **refuse-done** fires. Loop continues.

---

## 4. Force Related-People SERP + Directory Visits (correct timing)

Immediately after org surface is present:

```
force_related_search: "<Company>" (BBB OR owner OR "co-owner" OR "co-founder" OR partner OR "managing partner" OR "general manager" OR officers OR leadership OR succession OR "family-owned" OR "second-generation")
```

URL priority: BBB first, then `/team`, `/leadership`, `/about-us`, dealer paths.

Extractors that must fire when the page supports them:

- Name / Title slash (`Alan G. Klinger / President`)  
- Multi-line + markdown headings (`### Frank K. Chesek` / `#### CEO`)  
- Compound titles (`President and CEO Bryon Shafer`)  
- Ownership narratives (“Vince is the second-generation owner”, “who is the owner and President”, “owned and led by …”)  
- Lowercase team cards → title case PERSON  
- Willis-style directory (non-org email → Name + role lookback)  
- ALL-CAPS name blocks + Name / Role / email blocks  
- Middle initials, Jr/Sr normalize  
- Cloudflare email-protection decode  

All findings carry `sourceUrls`. Trajectory records every force hop and every salvaged email the LLM briefly dropped.

---

## 5. Personal vs Related / HNWI-Path Distinction

**Presented-contacts ranking & labels (current logic)**

| Scope / class              | Display label                          | HNWI-path? | Rule |
|---------------------------|----------------------------------------|------------|------|
| Personal (strict)         | Looks personal / direct                | Yes if ownership-level | Name-tied local-part **and** page context + sourceUrl support it; never org-prefix |
| Related-person (owner/partner/principal) | Company · related · owner / managing partner | **Yes** | Ownership, partner, founder, principal language |
| Related-person (officer)  | Company · related                      | Medium–Yes | CEO, President, VP, GM, Controller, etc. |
| Organization mailbox      | Company · org mailbox                  | No         | info@, sales@, support@, … — force organization scope |
| Candidate / weak          | Candidate / Weak match · possible name collision | No until evidence | Fail-closed |
| Trash                     | (never shown)                          | —          | 555, all-same, trivial sequences rejected by gate |

Personal scope is applied **only** under the strict name-tied + context test.  
HNWI-path contacts are the subset of related persons carrying ownership / partner / founder / principal language — these are flagged for wealth-estimator and deeper registry hops.

---

## 6. Boss + Right-Hand Behaviour (live)

**Boss (Gemini)**  
- Watches trajectory continuously.  
- On every refuse-done, re-issues SURFACE MANDATE and demands related-people hop if not yet executed.  
- Never instructs erasure of related persons.  
- Updates `bossPremise` and openQuestions as surface expands.

**Right-hand (zAI / nvidia-nim-case-reasoning)**  
- Receives full case context + latest observation.  
- Returns structured disposition, e.g.:

```
rightHandDisposition: {
  surfaceStatus: "org_locked_related_partial" | "surface_complete",
  missing: [...],
  nextForcedAction: "...",
  peopleAttached: N,
  orgMailboxes: M
}
```

- Never invents a contact.  
- Confirms trash-gate compliance on every phone.

Case context document is appended after every step (force hops, salvages, refuse-done decisions, people counts).

---

## 7. Final Case File Shape (perfect execution)

```
CASE STATUS: surface_complete
ORG SURFACE: locked (domain, phone, org emails — organization scope only)
RELATED PERSONS: ≥1 (ideally full public directory) with sourceUrls + roles
HNWI-PATH CONTACTS: owners / partners / principal executives flagged
PERSONAL SCOPE CONTACTS: only those meeting strict name-tied + context test
TRASH REJECTED: any 555 / trivial phones never admitted
TRAJECTORY: complete audit of every force hop, salvage, refuse-done
WEALTH CONTEXT: ready when ownership language or probed wallet USD present
BOSS PREMISE: updated — “Grok floor exceeded; full public directory held”
RIGHT-HAND DISPOSITION: surface_complete — maximised attributable people-contacts
```

Display order: **Personal (if any) → Company · related (HNWI-path first) → Company · org mailbox → Candidate**.

---

## 8. Wallet-first variant (when objective carries a wallet)

- `wallet-seed.ts` parses ETH/BTC, builds fail-closed attribution plan.  
- Plan is injected into bossPremise and prepended to agentic objective.  
- Attribution first; contact maximizer only after holder is locked with sourceUrls.  
- Exchange / mixer / protocol treasury → rejected_non_human.  
- Optional gated Ethplorer freekey balance probe available post-attribution; USD written into metadata for wealth-estimator formal field.  
- Never invent holder or contacts from chain data alone.

---

## 9. Non-negotiable rules (always on)

- Never invent contacts.  
- Never mark org inboxes as Personal.  
- Trash-phone gate stays on.  
- Every contact requires http(s) sourceUrl.  
- Refuse done while org surface exists and zero related persons attached.  
- Trajectory salvage for any company-aligned email the LLM drops.  
- Grok is the floor; any Grok-only public person that Apex misses is a severe bug.

This document is the textbook. Boss and right-hand should treat it as the reference shape for every comparable mid-market public-surface case.
