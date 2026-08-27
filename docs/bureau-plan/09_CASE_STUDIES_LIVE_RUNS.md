# Volume 09 — Worked Case Studies (Live Runs vs Independent Audit)

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN
**Purpose:** Concrete post-mortems. Each case states Apex card outcome, independent public surface, verdict, and required engineering fix. No invented contacts.

---

## Method for each case

1. Record Apex ledger fields (outcome, phone, email, source labels, notes).
2. Independent open-web / SEC primary read on the same name.
3. Score: identity bind, contact quality, honesty of org vs personal, promotion after dig.
4. Map failure to control-plane / promote / identity / ops — not to “need more force hops.”

---

## Case: Carl C. Icahn / Guaranty Financial

### Apex observed behavior
Free dig showed model-invented queries (official website, SEC contact, leadership site:gnty.com), visits to gnty.com and bill-staley page with contact-fact extraction, registry_search attempts.

### Problem
evidence_only or empty phone/email on card despite dig activity.

### Independent public bar
Primary firm surface includes carlicahn.com and published main/press numbers from public pages; EDGAR notice context exists for related entities.

### Failure code
`DIG_OK_PROMOTE_FAIL`

### Required fix (engineering)
B1 rehydrate/promote after dig; never leave evidence_only when URL-backed org or firm lines exist unless identity blocks; emit promote span.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Larry N. Feinberg / Oracle Partners class

### Apex observed behavior
Card showed EDGAR-Phone style issuer line (e.g. 267 area) as organization or direct-adjacent path.

### Problem
Issuer switchboard risk; not Oracle Partners Greenwich primary line.

### Independent public bar
Public firm HQ lines in 203 area and oraclepartners.com class surfaces are the honest firm routes.

### Failure code
`ISSUER_OVER_FIRM`

### Required fix (engineering)
Notice-line / dig firm phone over EDGAR issuer CIK phone; agentic-web must not be overwritten by later EDGAR-Phone pass.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Gordon Gund / Gund Investment

### Apex observed behavior
EDGAR-Phone on card; organization_contact.

### Problem
Wrong or weak issuer-associated number vs Princeton Gund Investment public line.

### Independent public bar
Gund Investment Corp public phone historically associated with Princeton NJ notice context.

### Failure code
`ISSUER_OVER_FIRM`

### Required fix (engineering)
Same as Feinberg: reporting-person notice block > issuer submissions phone.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Frank H. Pearl

### Apex observed behavior
Treated as live research target; thin or empty contact path.

### Problem
Deceased (2012) public record; firm historical numbers are not live personal outreach.

### Independent public bar
Deceased gate at cook; evidence_only with deceased note; do not burn dig budget as live HNWI.

### Failure code
`STALE_TARGET`

### Required fix (engineering)
Deceased probe before full OSINT; card outcome honesty.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Pickup Todd M / Impac class

### Apex observed behavior
organization_contact with CA area org phone.

### Problem
Partial org path; Form 4 address surface not always on card.

### Independent public bar
SEC Form 4 / SC13 address blocks for reporting person are primary when present.

### Failure code
`PARTIAL_ORG`

### Required fix (engineering)
Form 3/4 address extraction into evidence; org phone remains organization_contact.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Scripps Eaton M

### Apex observed behavior
organization_contact with issuer HQ style phone.

### Problem
E.W. Scripps HQ switchboard is org-honest if labeled correctly; Miramar Services mailing appears on Form 4 class filings.

### Independent public bar
Org label OK if not sold as personal; mailing address should be evidence.

### Failure code
`ORG_OK_IF_HONEST`

### Required fix (engineering)
Keep organization_contact; attach Form 4 mailing as address evidence.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Andrew F. Johnson / Hastings Manufacturing (earlier arc)

### Apex observed behavior
Repeated first admit; SC 13D identity; timeout thin card; role/address on DEF 14A not promoted early.

### Problem
Deterministic EDGAR ranking + timeout before proxy parse.

### Independent public bar
DEF 14A holds role, street, related officers publicly.

### Failure code
`ORDERING_TIMEOUT`

### Required fix (engineering)
Early identity boost from proxy; shuffle discovery; longer target timeout; free dig after identity anchors.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Jack W. Schuler class

### Apex observed behavior
EDGAR chrome strings stored as related contacts (Home Skip, Menu Close Search).

### Problem
Nav pollution as contacts.

### Independent public bar
Only person-like tokens from proxy bodies; blocklist SEC chrome.

### Failure code
`EXTRACT_POLLUTION`

### Required fix (engineering)
sanitize related-name extractor; never persist nav chrome.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: James C. Czirr (Janeway batch)

### Apex observed behavior
direct_contact_candidate with agentic-web-org phone.

### Problem
Over-strong outcome for org-scoped dig; name collision risk with wealth channels.

### Independent public bar
Surname and host collision must force organization_contact without personal email.

### Failure code
`OUTCOME_OVERCLAIM`

### Required fix (engineering)
agentic-web-org → organization_contact; surname gate.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Robert W. Philip (Janeway batch)

### Apex observed behavior
direct_contact_candidate agentic-web-org phone.

### Problem
Common name; possible mis-attribution.

### Independent public bar
Independent pass: identity muddy; do not over-claim direct.

### Failure code
`OUTCOME_OVERCLAIM`

### Required fix (engineering)
Same honesty rules; collision hosts.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Peter A. Jr. Bordes

### Apex observed behavior
organization_contact mail@bbgi.com class.

### Problem
Wrong-family media group risk vs other Bordes surfaces.

### Independent public bar
Generic media inbox is org at best; identity bind required.

### Failure code
`ORG_EMAIL_RISK`

### Required fix (engineering)
Generic inbox + collision → organization_contact or evidence_only.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Case: Brauser Michael

### Apex observed behavior
organization_contact info@majesco.com.

### Problem
Issuer generic inbox, not investor personal.

### Independent public bar
Correct as org if labeled; false if implied personal.

### Failure code
`ORG_OK_IF_HONEST`

### Required fix (engineering)
Keep organization_contact; never direct_*.

### Acceptance for this case
- Re-cook or re-run on same identity.
- Card fields match honesty rules above.
- Trajectory shows free tool choice if dig ran.
- Independent re-read does not clearly beat Apex on primary lines without Apex mis-label.

---

## Cross-case matrix

| Failure code | Count in this set | Primary volume |
|--------------|-------------------|----------------|
| DIG_OK_PROMOTE_FAIL | 1+ | 03, 08 Wave B |
| ISSUER_OVER_FIRM | 2+ | 03 |
| STALE_TARGET | 1+ | 04 |
| EXTRACT_POLLUTION | 1+ | 02 extractors |
| OUTCOME_OVERCLAIM | 2+ | 03 |
| ORG_OK_IF_HONEST | 2+ | 03 |
| ORDERING_TIMEOUT | 1+ | 02, 04 |

## Rule derived from all cases

Free dig without honest promote is **not** superiority. Scripted dig that never visits primary pages is **not** a bureau. Both failure modes appeared in this project’s history; the plan prioritizes removing scripts and fixing promote/identity over adding more pipeline stages.
