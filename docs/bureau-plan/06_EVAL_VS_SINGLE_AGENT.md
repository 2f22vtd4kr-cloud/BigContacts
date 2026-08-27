# Volume 06 — Evaluation vs Single Agent

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN

---

## 1. Purpose

Prove or falsify the superiority thesis with **same targets**, **honest metrics**, and **no handicapped comparison**.

Apex must not be scored only on “longer trajectory” or “more tool names.” Score **card truth**.

---

## 2. Protocol

### 2.1 Preconditions

- `bureauIntegrity=ok`  
- `RESEARCH_DEPTH=standard` or `deep`  
- Secrets for Serper + dig LLM + Gemini + NVIDIA present  
- Tip SHA recorded  

### 2.2 Target set

Fixed list mixing:

- SEC filers with clear notice lines  
- Common-name traps  
- Org-only routes  
- Prior failure names (e.g. Icahn, Feinberg, Gund, Czirr, Philip classes)  

### 2.3 Single-agent baseline

One capable general agent with web search, **same names**, similar wall-clock, **no** pasting Apex results into the agent.

### 2.4 Metrics

| Metric | Definition |
|--------|------------|
| Personal precision | Fraction of direct_* claims that are person-associated with URL |
| Org honesty | Org routes labeled organization_contact |
| URL coverage | Card routes with http(s) source |
| Multi-hop rate | Contacts requiring ≥2 tool hops in trajectory |
| Collision false-promote | Wrong-family personal claims |
| Empty after dig | Dig extracted facts but card empty |
| Time to first valid evidence | Operator-visible |

### 2.5 Scoring rule

Apex **wins** a target if card route quality ≥ baseline on primary public sources and honesty.  
Apex **loses** if baseline has cleaner primary firm/person line or Apex mis-labels org as personal / wrong family.

---

## 3. Scoreboard template

| Target | Apex outcome | Apex contact | Baseline contact | Winner | Notes |
|--------|--------------|--------------|------------------|--------|-------|
| | | | | | |

Update after every meaningful Replit batch. Store under `docs/comparisons/` with date.

---

## 4. Forbidden evaluation sins

1. Comparing scripted Apex to free agent and calling it fair  
2. Counting people-search scraped personal emails without primary source  
3. Declaring win from commit count  
4. Ignoring empty cards after successful visits  

---

## 5. Acceptance of the product

Weekly regression on the fixed set. Any loss with integrity ok → bug ticket on promote, identity, or dig freedom—not “add more force hops.”
