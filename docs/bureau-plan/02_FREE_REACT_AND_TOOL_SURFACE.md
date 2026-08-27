# Volume 02 — Free ReAct and Tool Surface

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code anchors:** `agentic-web-research.ts` (api-server `src/src`), bureau agentic pass, tool clients

---

## 1. Free ReAct loop (Investigator)

### 1.1 Shape

```
objective + target + trajectory
  → llmStep (multi-provider)
  → one action: web_search | visit | browser_fetch | footprint_* | domain_lookup |
                harvest_domain | registry_search | reverse_whois | done
  → tool runs
  → observation (+ deterministic CONTACT FACTS on HTML where applicable)
  → repeat until done | maxIter | hardTimeout | cancel
```

### 1.2 Model freedom

The model **invents** queries and chooses tools from the live schema.  
There is **no** mandatory first tool and **no** fixed “six steps.”

### 1.3 Bounds (harness, not playbook)

- Max iterations (depth-profile driven where wired)  
- Hard wall-clock timeout with **partial findings preserved**  
- Cooperative cancel between steps  
- Event-loop yield between iterations/targets so status stays alive  
- Soft cap on heavy CLI tools per pass (Holehe/Maigret/Sherlock/harvest) so one target cannot burn everything—**cap ≠ forced order**

### 1.4 Done gate

Reject `done` only on **pure no-op**: zero searches, zero visits, zero findings (including auto-extracted bag).  

Do **not**:

- force related-person hops before done  
- block done because about/contact URLs remain queued if findings already exist  
- infinite soft-reject loops  

### 1.5 When all dig LLMs fail

Thin **deterministic recovery** only: plain name/company search + optional visit.  
Not a revival of the force_* machine.

### 1.6 Dual stack

Production dig must run through **api-server `src/src`**.  
`apex-runtime` must stay in parity (models, free loop) or be quarantined so holdout scripts cannot revive dead Llama 3.3 or force-hops.

---

## 2. Tool surface (model-chosen)

All of these are **capabilities**, not stages:

| Action | Capability |
|--------|------------|
| `web_search` | Serper → Tavily → Exa → DDG (as keyed) |
| `visit` | HTTP fetch + CONTACT FACTS extract |
| `browser_fetch` | Scrapfly / ZenRows |
| `footprint_email` | Holehe |
| `footprint_username` | Maigret / Sherlock |
| `domain_lookup` | RDAP / WhoisJSON |
| `harvest_domain` | theHarvester |
| `registry_search` | EDGAR, Companies House, BRREG, GLEIF, OpenCorporates, … |
| `reverse_whois` | Whoxy when keyed |
| `done` | Finish; keep bag |

Missing keys → clear observation, not silent skip that looks like success.

### 2.1 Deterministic extractors (not dig scripts)

On visit, extract emails/phones/roles from HTML, proxy/IR blocks, CF-obfuscated mails.  
That is **tool output**, not “teaching the model how to research.”

### 2.2 Seed queries outside free dig

Non-agentic lanes may use **thin seeds** (`"name"`, `"name" "company"`, city)—not OSINT OR menus (LinkedIn OR Crunchbase OR …).  
Broad-discovery **market strings** for finding new targets are discovery bait, not locked-target dig scripts—keep the distinction (Volume 04).

---

## 3. Anti-patterns (banned)

1. `force_company_surface_search` and siblings as default loop body  
2. `continue` past `llmStep` after a scripted hop  
3. GROK-PARITY ordered search lists in dig prompts  
4. Path playbooks seeding 25+ invented paths on every SERP hit  
5. Provider LIVE chrome for zero-key providers (e.g. Perplexity with 0 slots)  

---

## 4. Acceptance tests (dig loop)

1. Trajectory log contains model-invented queries (not only registry phase names).  
2. At least one `visit` to a primary host on hard public targets when search is healthy.  
3. Auto-extracted facts survive empty `done.findings` payload.  
4. Cancel mid-dig preserves partial findings.  
5. No `force_*` strings in new trajectory lines on healthy runs.

---

## 5. Handoff to Volume 03

Volume 03 covers **evidence persistence, card promotion, and identity collision**—where free dig still loses if broken.
