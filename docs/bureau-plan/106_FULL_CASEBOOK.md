# Volume 106 — Full Casebook: Comparison Losses and Fixes

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

**Principle reminder (Vol 101):** Dig stays free. Fixes below are promote, identity, labeling, ops — not dig scripts.

## Case A1 — Icahn dig with empty or weak card

### What happened
Free dig (or dig after force-era removal) ran web_search on Guaranty / gnty.com, leadership pages, SEC-related queries, visits that produced CONTACT FACTS in trajectory. Card often stayed evidence_only or empty contact fields while a single chat agent could state a firm main line with a public URL.

### Root cause class
Dissemination failure (promote/rehydrate/cache), not “need more forced searches.”

### Correct fix
Vol 21/77 promote guarantee; rehydrate from contact_evidence; invalidate list cache; DigSpan promote event.

### Incorrect fix
Restore force_company_surface_search hop list.

### Scoreboard rule
If dig extracted URL-backed phone/email and card empty without collision block → Apex scores 0 on this fixture.

---

## Case B1 — Feinberg-class issuer switchboard

### What happened
EDGAR identity admit attached issuer CIK phone to person card. Independent open research preferred firm/public lines (e.g. published main numbers distinct from issuer plant switchboard class).

### Root cause class
Source priority + outcome honesty: EDGAR-Phone treated as personal reach.

### Correct fix
EDGAR-Phone → organization_contact only; never overwrite agentic-web; prefer notice-line when bound; dig free to find firm HQ.

### Incorrect fix
Force a fixed phone from a prefer-list domain.

### Scoreboard rule
Issuer-only personal claim → harmful or lose vs baseline.

---

## Case B2 — Gund-class primary line

### What happened
Similar issuer-vs-firm tension; independent audits cited stronger primary firm lines.

### Correct fix
Same as B1; notice-and-communications parsing (Vol 84) without assuming counsel phone is personal mobile.

### Scoreboard rule
Honest organization_contact can tie; wrong direct_* loses.

---

## Case C1 — Org dig phone labeled personal

### What happened
Dig or extract found routes that were organization-scoped; outcome still read as direct contact candidate.

### Root cause class
Outcome mapping missing *-org force-down.

### Correct fix
Vol 79: agentic-web-org / *-org → organization_contact without personal email bind.

### Incorrect fix
Ban dig from visiting company sites (that would kill free research).

---

## Case E1 — Menu strings as related persons

### What happened
EDGAR HTML navigation tokens (Home, Skip, Menu, Close, Search) admitted as related people.

### Correct fix
Vol 38 sanitizer person-token allowlist; blocklist chrome; tests on fixture HTML.

### Incorrect fix
Disable related-person extraction entirely without sanitizer (loses real officers).

---

## Case S1 — force hop brain

### What happened
force_company_surface_search → continue → force_org_email → budget burn; model barely reasoned. Apex looked multi-model but behaved as a brittle script. Single free agent won.

### Correct fix
Delete force controllers; soft observation only; Vol 101.

### Regression test
CI grep force_ on agentic dig path.

---

## Case O1 — Status plane under dig

### What happened
Conflicting phase strings; healthz/status timeouts while dig CPU-bound; operator could not steer.

### Correct fix
yieldEventLoop; withBudget Redis; normalizeAtlasStatusMessage; one taxonomy string.

### Incorrect fix
Remove dig tools to keep UI snappy.

---

## Case D1 — Stale/deceased live path

### What happened
Publicly deceased figure still burned live outreach-style dig.

### Correct fix
Vol 40 deceased gate → evidence_only + note; skip full burn.

---
