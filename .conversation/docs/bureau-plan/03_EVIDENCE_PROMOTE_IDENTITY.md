# Volume 03 — Evidence, Promote, Identity

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code anchors:** `bureau-contact-persist`, `contact-validation`, `identity-collision`, `computeContactOutcome`, rehydrate helpers

---

## 1. Evidence bag is the truth store

- Dig and extractors write **contact_evidence** (or equivalent) with values, types, sources, and **sourceUrls**.  
- Card columns are a **projection** under gates.  
- Weak candidates may remain evidence-only; they must not be silently dropped without a reason code when operators inspect provenance.

### 1.1 Fail-closed admission

- No invented emails/phones.  
- Trash hosts, placeholder phones (e.g. 555), filename-like domains rejected.  
- Salvage from trajectory only when an **http(s)** URL is present on the history line.

---

## 2. Promotion (dig → card)

### 2.1 Required path

After dig:

1. Persist evidence rows  
2. **Promote** best eligible phone/email/linkedin onto `entities.*`  
3. **Rehydrate** card from evidence if projection lags  
4. Invalidate list/cache so UI does not show stale empty cards  
5. Emit promote span for Live Desk when successful  

### 2.2 Issuer must not win by default

- `EDGAR-Phone` / Companies House main lines = **organization** routes.  
- Prefer notice-line / agentic dig person-associated evidence when present.  
- **Never overwrite** `agentic-web` (or better dig source) with issuer switchboard on later enricher passes.

### 2.3 Outcome taxonomy (normative intent)

| Outcome | Meaning |
|---------|---------|
| `none` | No usable route |
| `evidence_only` | Provenance without clean card route |
| `social_only` | Social handles only |
| `organization_contact` | Org switchboard / generic inbox / org-scoped dig |
| `direct_contact_candidate` | Person-associated route, not fully verified |
| `direct_contact_verified` | Stronger verification path only |

**Hard rule:** sources like `agentic-web-org` without a personal email must **not** become `direct_contact_*`.

---

## 3. Identity collision

### 3.1 Shared pure module

Card promote and graph edges must use the **same** collision assessment (e.g. `identity-collision.ts`):

- Multi-token targets: require surname token in evidence blob for personal promote  
- `personName` with different surname than target → risk  
- Collision host lists (wealth advisors, directory brokers, wrong IR families, etc.) expandable from production misses  
- Graph Entity↔Entity: same-first / different-surname rejected without stable registry id  

### 3.2 Lessons from live targets

| Class | Lesson |
|-------|--------|
| Czirr-type | Same first name + wealth channel ≠ target |
| Philip-type | Common name; UK IR email may be wrong family |
| Brauser / Majesco | Issuer `info@` is org, not investor personal |
| Bordes / BBGI | Media group mail risk |
| Pearl | Deceased / stale must not look like live outreach |

---

## 4. Acceptance tests (promote / identity)

1. Dig extracts phone with URL → card phone non-empty after promote (unless collision blocks).  
2. Issuer phone cannot replace agentic dig phone.  
3. `agentic-web-org` → organization_contact when no personal email.  
4. Different-surname personName → no personal direct promote.  
5. Independent audit on fixed names: Apex primary firm lines not systematically worse than careful open EDGAR/IR read.

---

## 5. Handoff to Volume 04

Volume 04 separates **discovery** (find candidates) from **dig** (research a locked target).
