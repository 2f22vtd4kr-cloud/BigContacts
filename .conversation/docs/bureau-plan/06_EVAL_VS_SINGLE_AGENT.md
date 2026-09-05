# Volume 06 — Evaluation vs Single Agent

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN

---

## 1. Purpose

Prove or falsify the superiority thesis with **same targets, honest metrics, and no handicapped comparison**.

Apex must not be scored only on “longer trajectory” or “more tool names.” Score **card truth**.

---

## 2. Protocol

### 2.1 Preconditions

- `bureauIntegrity=ok`  
- `RESEARCH_DEPTH=standard` or `deep`  
- Secrets for Serper + dig LLM + Gemini + NVIDIA present  
- Tip SHA recorded  
- Apex target set and run identifiers recorded before baseline work begins

### 2.2 Target set

Fixed list mixing:

- SEC filers with clear notice lines  
- Common-name traps  
- Org-only routes  
- Prior failure names (e.g. Icahn, Feinberg, Gund, Czirr, Philip classes)  

For discovery-first batches, the **targets actually admitted by Apex** become the comparison set only after Apex execution is complete. Do not substitute hand-picked targets after seeing Apex's failures or successes.

### 2.3 Blind single-agent baseline

Use one capable independent **OpenAI model/research context** with public web research capability. The exact model identifier must be recorded at execution time.

The baseline receives:

- the same target;
- the same research objective;
- comparable wall-clock/tool budget;
- the public web and whatever normal research capability is available to that independent agent.

The baseline must **not** receive:

- Apex card;
- Apex hypotheses;
- Apex trajectory;
- Apex URLs or source shortlist;
- Apex rejected identities;
- Apex contact candidates;
- any other Apex-derived research state.

A baseline win is a legitimate Apex loss. Never handicap the baseline to make Apex look better.

### 2.4 Execution order / contamination control

1. Freeze the Apex run ID, tip SHA, and target list.
2. Export Apex evidence/trajectory into the audit record.
3. Start an independent OpenAI baseline context with only the target/objective.
4. Do not paste or summarize Apex findings into the baseline.
5. Record the baseline's sources and result independently.
6. Only after both sides are frozen, perform the comparative audit.

### 2.5 Metrics

| Metric | Definition |
|--------|------------|
| Personal precision | Fraction of direct_* claims that are person-associated with URL |
| Org honesty | Org routes labeled organization_contact |
| URL coverage | Card routes with http(s) source |
| Multi-hop rate | Contacts requiring ≥2 tool hops in trajectory |
| Collision false-promote | Wrong-family personal claims |
| Empty after dig | Dig extracted facts but card empty |
| Time to first valid evidence | Operator-visible |
| Primary-source rate | Fraction of material identity/contact claims backed by primary or first-party sources |
| Unsupported contact rate | Contact claims lacking direct supporting provenance |
| Evidence completeness | Required claim fields with retained supporting evidence |

### 2.6 Scoring rule

Apex **wins** a target if card route quality ≥ baseline on primary public sources and honesty.  
Apex **loses** if baseline has cleaner primary firm/person line or Apex mis-labels org as personal / wrong family.

Tie if the research is materially equivalent. Do not break ties using call count, agent count, trajectory length, UI quality, or commit count.

---

## 3. Scoreboard template

| Target | Apex outcome | Apex contact | Baseline contact | Winner | Notes |
|--------|--------------|--------------|------------------|--------|-------|
| | | | | | |

Update after every meaningful live batch. Store under `docs/comparisons/` with date and run IDs. Each target record should retain both sides' source URLs and an explicit reason for the winner.

---

## 4. Forbidden evaluation sins

1. Comparing scripted Apex to free agent and calling it fair  
2. Comparing Apex to a baseline that has been shown Apex evidence  
3. Counting people-search scraped personal emails without primary source  
4. Declaring win from commit count  
5. Ignoring empty cards after successful visits  
6. Treating a successful provider/API call as a research-quality win

---

## 5. Acceptance of the product

Weekly regression on the fixed set. Any loss with integrity ok → bug ticket on promote, identity, or dig freedom—not “add more force hops.”

A 10-target batch is not a victory because ten jobs completed. It is a research evaluation only after all targets have auditable evidence and each target has an independent blind baseline comparison.