# Apex Atlas — ReAct Bureau Architecture

**Canonical role law:** Boss = **Gemini**. Right-hand = **DeepSeek via NVIDIA NIM**. Investigator = **the configured Investigator LLM pool**. Gemini and NVIDIA/DeepSeek do not conduct the investigation.

Apex is a model-led research bureau, not a deterministic search playbook. The harness supplies state, the complete research-tool surface, budgets, provenance and safety boundaries; the Investigator LLM owns the research trajectory.

---

## 0. Role architecture

### Boss — Gemini

Owns case direction, strategic prioritization, investigator briefs, ongoing bureau orchestration and case-level review where configured. It does not execute the Investigator's web/OSINT tool loop.

### Right-hand — DeepSeek via NVIDIA NIM

Owns advisory orchestration support: case-file critique, evidence-gap analysis, analysis of ongoing bureau work/results and recommendations back to the Boss. It is **not** an Investigator LLM and is never a Dig fallback.

### Investigator LLM pool

This is the **single additional model-decision step** immediately before each research action. The Investigator LLM receives the target, objective, accumulated evidence/trajectory and the complete live research capability surface, then chooses exactly one next action.

The pool is for Investigator LLM adapters only. It is intentionally separate from:

- Boss Gemini;
- Right-hand DeepSeek via NVIDIA NIM;
- search/research vendors such as Serper, Tavily and Exa;
- browser/fetch vendors such as Scrapfly and ZenRows;
- registries and OSINT executors.

The current configured Investigator adapters are Groq and Mistral. This is an implementation pool, not a conceptual `Groq → Mistral` architecture: adapters may be added without changing the ReAct design. Provider order is transport/capacity fallback only; it never defines research strategy.

### Harness

Deterministic code may enforce lifecycle, schema validity, budgets, timeouts, permissions, provenance, identity safety, persistence and promotion honesty. It may not choose the research path.

---

## 1. Free-ReAct loop

```
objective + target + structured case state
        ↓
INVESTIGATOR LLM DECISION
        ↓
one model-selected research action
        ↓
tool / browser / OSINT execution
        ↓
typed observation + exact provenance
        ↓
INVESTIGATOR LLM DECISION
        ↺
```

The action surface includes web search through **Serper / Tavily / Exa**, page visit, **Scrapfly / ZenRows browser escalation**, registry lookup, domain lookup via RDAP/WhoisJSON, public email/username footprinting and domain harvesting. These are capabilities available to the Investigator; they are not separate scripted stages.

There is no mandatory first search, company→LinkedIn→Instagram chain, force hop, ranked Forbes intake, or fixed number of hops.

---

## 2. Discovery identity boundary

Discovery must keep these layers distinct:

```
RAW PAGE / SERP / TOOL OBSERVATION
        ↓
INVESTIGATOR LLM HYPOTHESIS
        ↓
MODEL-EMITTED finding (action=done)
        ↓
identity + provenance safety gate
        ↓
ADMITTED PERSON
```

Deterministic extraction may preserve literal contact facts as observations, but it is not allowed to select a person identity. Proxy/filing related-name tables, snippets, headings, addresses, products, departments and organization-only strings cannot become candidates merely because they look person-shaped.

The canonical discovery admission input is `result.modelFindings` plus the actual trajectory, not a general auto-extracted findings bag.

---

## 3. Tool observations and provenance

Every tool result is typed observation with source URL/status where applicable. Search snippets and page text are not facts merely because they came from a tool. Contact claims require exact HTTP(S) provenance and explicit scope.

Organization routes remain organization-scoped unless evidence establishes a personal association. A generic inbox or switchboard is never silently relabeled as a direct personal contact.

---

## 4. Provider behavior

### Investigator LLMs

The Investigator LLM pool is **not** the Boss/right-hand pool and is **not** the research-provider pool. The current adapters are Groq and Mistral. If all configured Investigator adapters fail, the Dig capability fails/degrades honestly. It does not borrow Gemini or DeepSeek/NVIDIA and does not invoke deterministic research recovery.

### Research tools

The Investigator may choose among configured **Serper / Tavily / Exa** search transports and may choose `browser_fetch`, which can escalate through **Scrapfly / ZenRows**. Tool-provider failover is transport behavior after the Investigator has chosen the capability; it is not an LLM decision and not a substitute Investigator.

Provider readiness must distinguish configured, reachable, authorized, rate-limited, quota-exhausted and successfully responding.

---

## 5. Stopping and budgets

The Investigator may select `done` when evidence is sufficient or further research is not worthwhile. Hard iteration, wall-clock, cancellation and provider deadlines are harness safety limits, not a research script.

On timeout/cancel/budget exit, valid evidence already collected is preserved. If identity or contact evidence is insufficient, an empty result is preferable to a fabricated person/contact.

---

## 6. Replit production path

The production App uses one API workflow on port 8080, with the desk at `/` and API under `/api/`. `ENABLE_AUTO_PIPELINE=false` by default. Live quality requires an actual provider-backed Investigator trajectory; health checks and static autonomy guards are not research proof.

---

## 7. Acceptance

A valid live acceptance run must show:

1. a real provider-backed Investigator decision;
2. model-selected research actions;
3. real observations from the selected tools/browsers;
4. model-emitted discovery finding(s);
5. deterministic identity/provenance admission;
6. the admitted person entering free-ReAct Dig;
7. honest sourced contacts or an explicitly empty card;
8. no forced research hops;
9. trajectory evidence sufficient to reconstruct where each claim came from.

A longer trajectory or larger tool count is not evidence of superiority. Compare truthful research outcomes against a strong independent baseline.
