# Stage 2 execution report — pre-Replit

**SHA:** `607b95a` (+ this doc)  
**Rule:** No research-architecture rewrites. Backend path audited only.  
**Constraint:** This sandbox has **no** Redis/DB/provider secrets → full live atlas-run **not** executed here. Hosted Stage 3 on Replit is where Launch→Stop with keys is proven.

---

## 1. Research architecture integrity (DO NOT BREAK)

| Component | Path | Status |
|-----------|------|--------|
| Agentic ReAct + CONTACT FACTS | `agentic-web-research.ts` (~2068 lines) | **Intact** |
| Atlas 10-phase orchestrator | `atlas-orchestrator.ts` (~2454 lines) | **Intact** |
| Trash / placeholder gates | `contact-validation.ts` | **Intact** (`isTrashContactValue`, `isPlaceholderEmail`, 555/jdoe patterns) |
| Persist path filters trash | `bureau-contact-persist.ts`, `presented-contacts.ts` | **Intact** |
| Atlas HTTP contract | `routes/atlas.ts` | **Intact** — POST run, DELETE lock, GET status |
| Discovery-first defaults | atlas-run body | **Intact** — `discoveryFirst`, skipFaa when discovery, researchLimit |
| Grok-is-floor mandates | `investigator-prompt-guide.ts`, `case-bureau.ts`, NIM reasoning | **Intact** |
| Refuse-done / force related-people | removed — model-led done | **Gone (free research)** |

**Commit policy:** UI/offline hardening only in recent tips. No drive-by edits to agentic loop, extraction mandate, or orchestrator phase graph.

---

## 2. UI Stage 1 (live Vite `127.0.0.1:5177`)

| Route | Result |
|-------|--------|
| Overview | Black/gold; single Launch; no fake people; offline empty honest |
| Reactor | Idle standby; desktop method graph; no traffic lights |
| Entity ledger | Filters + Clear ledger; empty/offline honest |
| System status | Offline banner when API down; empty key pools shown as EMPTY (not fake green) |
| Workspace activity | Desk idle; Launch CTA; no synthetic running jobs |

Offline behaviour is **fail-closed and readable** — required for Replit before secrets are wired.

---

## 3. Honest comparison vs Grok Agent (natural, new-ish public surface)

### Target
**Mason UK Ltd** (mason-uk.co.uk) — mid-market UK engineering / isolation products.  
Prompt used for Grok-style pass: *Find important related people and how to contact them for Mason UK. Public sources only. No invented emails/phones.*

### Grok Agent–style public yield (this session web research)
| Name | Role | Vector | Source class |
|------|------|--------|--------------|
| Steve Hart | Director | steve@masonuk.co.uk | Company about page |
| Adam Fox | Director | adam@masonuk.co.uk | Company about page |
| Lucinda Boyton | Accounts Administrator | lucinda@masonuk.co.uk | Company about page |
| Josh (surname on page) | Technical support | josh@masonuk.co.uk | Company about page |
| Bruce Craik | Mechanical Sales Director | (role on page; email pattern may exist) | About / team surface |

**Trash:** none invented. Org general inbox may exist separately — must stay labeled org, not Personal.

### What Apex is built to do on the same target (code path, not a live run here)
1. Seed company → fetch about/contact/team (multi-hop mandate in agentic prompt).  
2. **CONTACT FACTS** deterministic block from page text (mailto + person/role lines).  
3. LLM EXTRACTION MANDATE with Grok-as-floor (named officers, compound titles).  
4. `isTrashContactValue` / placeholder filters — these addresses **should pass**.  
5. Persist with Personal vs org-mailbox distinction.  
6. Refuse-done until related people attached.

**Scoreboard (honest):**
| Dimension | Grok Agent (this pass) | Apex (architecture expectation) |
|-----------|------------------------|----------------------------------|
| Named principals | 4–5 | ≥ Grok if pages fetched |
| Direct domain emails | 4 | ≥ Grok via CONTACT FACTS |
| Invented/trash | 0 | 0 (gates) |
| Live run in this sandbox | N/A | **Blocked — no API keys/DB** |

**Conclusion:** Public surface is rich enough that a **healthy** Apex run must not lose to a shallow agent. A live S2-E on Replit with secrets is still required to **prove** parity numerically. Architecture and gates are aligned with that goal; we did **not** modify them in this pass.

---

## 4. Stage 2 blocks — status

| Block | Status |
|-------|--------|
| S2-A Live atlas-run | **Deferred to Replit** (needs Redis + providers) |
| S2-B Contact quality code | **PASS** static |
| S2-C Ledger mutation routes | **PASS** present (UI + API paths earlier) |
| S2-D Method chrome | **PASS** idle UI; live methods need run |
| S2-E Fair comparison | **Partial** — Grok pass done; Apex live pending keys |
| S2-F Offline modes | **PASS** UI |
| S2-G Secret hygiene | **PASS** (no keys in repo UI) |
| S2-H Density | **OK** offline; re-check mid-run on Replit |
| S2-I Replit freeze | Secrets names, ports, SPA, Python required — still valid |
| S2-J Go/no-go | **Conditional GO** for Replit **boot** + secrets; **full research GO** only after hosted S2-A/S2-E |

---

## 5. What not to touch before Replit

- `agentic-web-research.ts` extraction / CONTACT FACTS  
- `atlas-orchestrator.ts` phase order  
- `contact-validation.ts` gates  
- Prompt mandates removed (no Grok-is-floor / refuse-done scripts)  
- Job queue / atlas-lock semantics  

UI-only and deploy-wiring changes only unless a real research bug is proven with a live run.

---

## 6. Replit readiness checklist (operator)

1. Import `main` at current SHA (full monorepo, not sparse).  
2. Secrets: REDIS_URL_1–5, EXA_1/EXA_2, GROQ, TAVILY, SERPAPI, SERPER, GEMINI, NVIDIA, MISTRAL, HF, SCRAPFLY, ZENROWS, COMPANIES_HOUSE, WHOISJSON; `ENABLE_AUTO_PIPELINE=false`.  
3. `pnpm install` → schema → **Python OSINT tools required**.  
4. API 8080 + UI 23695; SPA + `/api` same origin.  
5. healthz → Launch 202 → reactor events → Stop → cancel burn.  
6. Optional: single-target research on Mason UK (or other fresh firm) and score vs this Grok table.

---

## 7. Responsibility note

Research depth was earned over many comparison cycles. This report **preserves** that path. Live parity proof is an **ops** step on Replit with keys — not a reason to rewrite the agentic stack from a UI sandbox.
