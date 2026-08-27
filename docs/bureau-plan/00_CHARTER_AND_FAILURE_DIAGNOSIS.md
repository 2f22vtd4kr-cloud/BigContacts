# Volume 00 — Charter and Failure Diagnosis

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Audience:** operators, implementers, auditors  
**Depends on:** live runs 2026-08 (Replit), independent same-target comparisons, `docs/context.md`

---

## 1. Charter

### 1.1 What Apex Atlas is

Apex Atlas is a **public-records OSINT research desk**. It discovers capital-relevant people (owners, officers, principals, HNWIs) and surfaces **real, attributable contact routes** from public sources onto a durable ledger.

It is **not**:

- a sales email database  
- chat-only research without a ledger  
- a fixed registry crawler with AI labels  
- Steam “Atlas Reactor” or physics ATLAS  

### 1.2 Success metric (product bar)

The **entity card** (`entities.phone`, `email`, `linkedin`, `contactOutcome`, notes/role) must hold **person-level or honestly labeled org routes** with **exact source URLs**.

Evidence bags and dig trajectories are **provenance**. They are not a substitute for an empty or wrong card.

### 1.3 Superiority thesis

Apex is designed as **multi-tool + multi-LLM + bureau roles** (Boss, right-hand, investigators). On the same public target, it must **meet or beat** a single capable general agent with web search on:

1. Primary registry / filing grounding  
2. Multi-hop discovery (search → visit → extract → pivot)  
3. Source URL coverage  
4. Org vs personal honesty  
5. Identity collision resistance  

If Apex loses that comparison with `bureauIntegrity=ok`, the failure is **architecture or promotion**, not “the other model is smarter.”

### 1.4 Governing principles

1. **Models invent queries and tool choices; tools execute; code validates.**  
2. **No playbook as the dig brain.** Optional hints ≠ controllers.  
3. **No `sourceUrls` → no promote.**  
4. **Org vs personal is first-class** (`contactOutcome`), not a UI color.  
5. **Identity collision fails closed** (card and graph share rules).  
6. **Observability is product** (DigSpan / Live Desk), not optional logging.  
7. **Status plane isolation** — dig must not wedge `/healthz` and `/atlas-status`.

---

## 2. Failure diagnosis from live work

### 2.1 Pattern: dig real, card weak

**Observation (multiple Replit runs):**  
Trajectory showed free or semi-free tool use (e.g. Carl C. Icahn / Guaranty: model-invented queries, `gnty.com` visits, contact-fact extraction). Cards still showed:

- empty fields after dig, or  
- `EDGAR-Phone` / issuer-style numbers as the headline contact, or  
- `organization_contact` / `evidence_only` when stronger primary firm lines existed in open sources.

**Independent open-web pass on same batches** (Gund, Feinberg, Pearl, Icahn, later Czirr/Philip/Bordes/Brauser) repeatedly found **better or cleaner primary firm lines** than what the ledger displayed, without claiming unverified personal emails from people-search scrapers.

**Conclusion:** superiority failed on **promotion and honesty**, not only on “could the model search.”

### 2.2 Pattern: scripted dig starved free ReAct

**Observation:** Historically the agentic loop contained `force_*` search/visit machines, ordered gap-fills, and `continue` paths that **skipped `llmStep`**. Prompt text claimed ReAct freedom while the executable path was a recipe.

**Effect:** Multi-LLM + tools never got budget to dig like a free agent. A single unconstrained agent looked stronger **by construction**.

**Remediation direction (already partially shipped on main):** delete force-hop controllers; soft done gates; free-ReAct floor; Boss/RH judgment not enum menus. **Do not reintroduce.**

### 2.3 Pattern: dual phase taxonomy

**Observation (2026-08-26 Janeway run):** Status flipped between registry-style `[n/9] 🍳 cooking` messaging and `Phase 8/10 J4–J9` dig language without a single operator-facing progress model.

**Effect:** Operators cannot tell discovery vs dig vs stall. Live Desk and header disagree with scheme windows.

### 2.4 Pattern: status plane death under load

**Observation:** Mid-run `/api/ingest/atlas-status` and `/api/healthz` timed out (tens of seconds, empty body) while dig was active.

**Effect:** Cannot monitor, pause, or trust integrity during the moment monitoring matters most.

**Remediation direction:** Redis budgets, shorter cache, `yieldEventLoop` between targets/iters; optional later worker process.

### 2.5 Pattern: sticky Redis “exhausted” and Launch no-op

**Observation:** After healthy runs, UI showed DB 0/5; Launch returned `jobId` then idle. Root cause included **in-process sticky exhausted flags** and jobs that required Redis with no fallback—not necessarily “Upstash account dead.”

**Remediation direction:** PING recovery, in-memory job fallback, prefer **one** permanent Redis URL on free tier (status polls burn quota).

### 2.6 Pattern: stale Live / fake LIVE

**Observation:** Idle or stopped jobs still showed LIVE windows (“Window 6 of 6 · done”, wrong target vs header). Fixed-step language implied a predetermined dig length.

**Remediation direction:** age-out events; hard-idle when Atlas not running; continuous phase bar; DigSpan trajectory of **actual** tools only.

### 2.7 Pattern: identity collision and wrong-family contacts

**Observation:** Common names and collision hosts (wealth advisors, issuer IR, media groups) produced org phones/emails labeled too strongly as direct.

**Remediation direction:** shared `identity-collision` module; surname gates; host risk lists; graph edge parity; `agentic-web-org` must not map to `direct_contact_*`.

---

## 3. Root-cause summary

| Layer | Root cause | Product impact |
|-------|------------|----------------|
| Control | Scripted force-hops / skipped LLM turns | Loses to free single agent |
| Promote | Evidence not projected to card; issuer overwrite | Empty/wrong cards after good dig |
| Honesty | Outcome taxonomy mis-labels org as personal | False superiority on scoreboard |
| Ops | Blocking dig + sticky Redis + zombie jobs | Unmonitorable / unlaunchable desk |
| UX | Stale LIVE, fixed N-of-M steps, clipped controls | Operator cannot trust the desk |

---

## 4. What “winning” means (operational)

After a bounded Launch on a fixed target set:

1. Trajectory shows **model-chosen** `web_search` / `visit` / registry / footprint tools (not `force_*`).  
2. Card fields update from dig with **source URLs**.  
3. Org routes labeled **organization_contact** (or equivalent).  
4. Independent audit on **same names** does not systematically beat Apex on primary firm lines and identity bind.  
5. `/atlas-status` remains responsive; Pause/Stop work; idle looks idle.

Until (1)–(5) hold on live Replit, do not claim the bureau is “rightly tuned.”

---

## 5. Non-goals of this plan

- Replacing legal process or closed databases  
- Inventing contacts to pad scoreboards  
- Infinite UI chrome without card proof  
- Expanding tool count without provenance  
- Word-count theater without acceptance tests  

---

## 6. Handoff to Volume 01

Volume 01 specifies the **control plane** (Boss, right-hand, dig failover, orientation, integrity gate) that must remain pure so Volumes 02–06 can deliver free research and honest cards.
