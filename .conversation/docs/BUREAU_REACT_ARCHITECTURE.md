# Apex Atlas — ReAct Bureau Architecture

**Canonical role law:** Boss = **Gemini**. Right-hand = **NVIDIA NIM**. Discovery/Dig investigator = **Groq → Mistral**. Gemini and NVIDIA do not conduct Apex web/OSINT research.

Apex is a model-led research bureau, not a deterministic search playbook. The harness supplies state, tools, budgets, provenance and safety boundaries; the investigator model owns the research trajectory.

---

## 0. Role architecture

### Boss — Gemini

Owns case direction, strategic prioritization, investigator briefs and case-level review where configured. It does not browse or execute web/OSINT tools.

### Right-hand — NVIDIA NIM

Owns case-file critique, evidence-gap analysis and advisory recommendations. It does not browse or execute web/OSINT tools and is not a Dig fallback.

### Discovery / Dig investigator — Groq → Mistral

Owns actual web/OSINT research:

- inventing queries;
- selecting URLs and tools;
- reading observations;
- forming and testing hypotheses;
- pivoting;
- choosing research depth;
- deciding what evidence supports a finding;
- stopping.

Groq → Mistral is capability-local provider fallback, not hierarchy. A fallback receives the same objective/state and independently decides the next action.

### Harness

Deterministic code may enforce lifecycle, schema validity, budgets, timeouts, permissions, provenance, identity safety, persistence and promotion honesty. It may not choose the research path.

---

## 1. Free-ReAct loop

```
objective + target + structured case state
        ↓
Investigator LLM decision (Groq → Mistral)
        ↓
model-selected action
        ↓
tool execution
        ↓
typed observation + exact provenance
        ↓
model reasoning / pivot / stop
        ↺
```

Available capabilities may include web search, page visit, browser fetch, registry lookup, domain_lookup via RDAP/WhoisJSON, public email/username footprinting and domain harvesting. Deprecated Whoxy/reverse-WHOIS is not part of the canonical Dig tool surface. These are optional capabilities, not stages.

There is no mandatory first search, company→LinkedIn→Instagram chain, force hop, ranked Forbes intake, or fixed number of hops.

---

## 2. Discovery identity boundary

Discovery must keep these layers distinct:

```
RAW PAGE / SERP / TOOL OBSERVATION
        ↓
MODEL HYPOTHESIS
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

### Investigator

**Groq → Mistral only.** If both are unavailable, the Dig capability fails/degrades honestly. It does not fall back to Gemini or NVIDIA and does not invoke deterministic research recovery.

### Web search transport

Search backends may fail over among configured Serper/Tavily/Exa/DDG transports. This changes the transport used for the model's chosen query; it does not choose the query.

Provider readiness must distinguish configured, reachable, authorized, rate-limited, quota-exhausted and successfully responding.

---

## 5. Stopping and budgets

The investigator may select `done` when evidence is sufficient or further research is not worthwhile. Hard iteration, wall-clock, cancellation and provider deadlines are harness safety limits, not a research script.

On timeout/cancel/budget exit, valid evidence already collected is preserved. If identity or contact evidence is insufficient, an empty result is preferable to a fabricated person/contact.

---

## 6. Replit production path

The production App uses one API workflow on port 8080, with the desk at `/` and API under `/api/`. `ENABLE_AUTO_PIPELINE=false` by default. Live quality requires an actual provider-backed trajectory; health checks and static autonomy guards are not research proof.

---

## 7. Acceptance

A valid live acceptance run must show:

1. a real provider-backed investigator decision;
2. model-selected search/visit/tool actions;
3. real observations;
4. model-emitted discovery finding(s);
5. deterministic identity/provenance admission;
6. the admitted person entering free-ReAct Dig;
7. honest sourced contacts or an explicitly empty card;
8. no forced research hops;
9. trajectory evidence sufficient to reconstruct where each claim came from.

A longer trajectory or larger tool count is not evidence of superiority. Compare truthful research outcomes against a strong independent baseline.
