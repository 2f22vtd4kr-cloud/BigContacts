# Apex Atlas — ReAct bureau architecture

**Product rule:** Trained models *research*. OSINT tools *execute*. Scripts are *backstop only* when every control LLM is dead.

This is not a search playbook with LLM labels. It is a **harness**: tools + bounds + multi-provider failover around a free ReAct loop.

---

## 1. ReAct agent loop (industry + Apex)

### Industry core (2025–26)

Every production agent converges on:

1. **Perceive** — goal, trajectory, last observation  
2. **Reason** — model decides next move (thought)  
3. **Act** — runtime runs exactly one tool  
4. **Observe** — tool result returns to context  
5. **Stop** — model `done`, max iterations, wall-clock, or integrity failure  

Patterns that matter for Apex:

| Pattern | Role |
|---------|------|
| **ReAct** | Base dig loop |
| **Tool-use loop** | Search, visit, registries, Holehe/Maigret are tools |
| **Bounded execution** | `maxIter` + `hardTimeoutMs` |
| **Provider fallback** | Groq → Mistral → Gemini → NVIDIA per step |
| **Partial success on limit** | Budget/timeout returns findings already extracted |

### Apex agentic loop (live path)

```
objective + target
  → llmStep(prompt)     // multi-provider JSON ReAct
  → parse action
  → web_search | visit | footprint_email | footprint_username | done
  → observation + CONTACT FACTS on HTML
  → repeat until done | maxIter | hardTimeout
```

**Fail-closed:** emails/phones need `sourceUrls`; trash/placeholder sanitizers; aggregator hosts deprioritized.

**Deterministic extractors** on every `visit` (CONTACT FACTS, proxy/IR blocks) are **tool output**, not a research script.

---

## 2. LLM fallback strategies

### Per-step control plane (`llmStep`)

```
try Groq (model list rotation)
  → try Mistral
  → try Gemini Boss path
  → try NVIDIA
  → null  ⇒ deterministic recovery (one plain search + optional visit)
```

Rules:

- **Never** depend on a single vendor or a decommissioned model id.  
- Empty response counts as failure → advance provider.  
- Health signal: `setAgenticLlmHealth` feeds `bureauIntegrity` (banner / status).  
- **Do not** run force-search recipes when models are healthy.

### Final card review (separate path)

Gemini Boss → NVIDIA right-hand → Groq capacity fallback → deterministic adjudicator on eligible candidates only.

### Adaptive director

Boss free `tool` + `query` → right-hand → Groq free step → **stop** (no dig ladder).

---

## 3. Budget exit — code pattern

When the loop hits a limit, **keep what tools already found**. Never discard the bag.

### Hard wall-clock (inside the for-loop)

```ts
if (Date.now() - startedAt >= hardTimeoutMs) {
  history.push(`step${i + 1}: hard_timeout ... findings=${findings.length}`);
  salvageEmailsFromHistory();
  return {
    status: "timeout",
    model: modelUsed,
    iterations: i,
    searches,
    visits,
    findings, // partial preserved
    trajectory: history,
    error: `hard timeout ${hardTimeoutMs}ms (partial findings preserved)`,
  };
}
```

### Iteration budget exhausted (after the for-loop)

```ts
for (let i = 0; i < maxIter; i++) {
  // ... reason → act → observe ...
  if (action.action === "done") {
    salvageEmailsFromHistory();
    return { status: "completed", findings, /* ... */ };
  }
}

// Budget exit — still salvage bag
salvageEmailsFromHistory();
return {
  status: "completed",
  model: modelUsed,
  iterations: maxIter,
  searches,
  visits,
  findings,
  trajectory: history,
  error: "iteration budget exhausted",
};
```

### Model `done` with empty payload but non-empty bag

Accept `done` when auto-extracted CONTACT FACTS already sit in `findings` — same as a human keeping what they saw on the page.

---

## 4. Structured plan — real AI OSINT bureau (not scripted slop)

### Principle

| Layer | Owns |
|-------|------|
| **Boss / right-hand / dig LLMs** | What to investigate next, when to stop, what lands on the card |
| **Tools** | SERP, fetch, browser escalate, Holehe, Maigret, Sherlock, CH, EDGAR, Whois… |
| **Harness** | Bounds, failover, fail-closed validation, integrity banner |
| **Scripts** | Only when **all** dig LLMs fail for a step |

### Phase A — Control plane (mostly done, do not regress)

- [x] Delete force_* gap-fills from agentic  
- [x] Done only on pure no-op  
- [x] Adaptive stop-only rules path  
- [x] Boss free brief (no tool menu)  
- [x] Multi-LLM dig + review  
- [x] Off dead Llama 3.3  
- [x] Budget/timeout preserve findings  
- [ ] Optional: native `tools[]` per provider where one model owns the loop (schema reliability)

### Phase B — Tools as model-chosen capabilities (in progress)

- [x] Serper → Tavily → Exa → DDG for `web_search`  
- [x] `visit` + browser escalate + CONTACT FACTS  
- [x] Domain surface (RDAP / WhoisJSON) on discovered hosts  
- [x] **`footprint_email` / `footprint_username`** as optional ReAct actions (model chooses)  
- [x] **`domain_lookup`** (RDAP/WHOIS) and **`registry_search`** (SEC EDGAR, Companies House, OpenCorporates, GLEIF) — model asks, tool runs  
- [ ] Reactor shows real tool ids + spoken stories for each

### Phase C — Operator honesty

- [x] `bureauIntegrity` critical when no search or no agentic LLM  
- [x] No fake Perplexity LIVE  
- [ ] Integrity panel lists **which** OSINT CLIs are installed  
- [ ] Trajectory never invents future steps

### Phase D — Acceptance

- Same hard public target as a strong general agent  
- `bureauIntegrity=ok`  
- Expect **more** surface (tools) with **equal or better** contact precision  
- Loss to a single web agent = severity bug in harness or keys, not “models are weak”

### Do not re-introduce

`force_company_search`, `force_related_search`, `force_org_email_search`, refuse-done loops, GROK-PARITY search orders, platform `site:` dig menus, adaptive dig ladders.

---

## 5. Replit boot (research)

1. Pull latest `main`  
2. Secrets: Serper + Groq minimum; full set preferred  
3. `RESEARCH_DEPTH=standard`  
4. Python OSINT tools installed (Holehe, Maigret, Sherlock)  
5. `bureauIntegrity=ok`  
6. Launch smoke — trajectory shows model-invented queries, not `force_*`
