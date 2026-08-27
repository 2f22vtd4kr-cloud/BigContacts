# Volume 139 — Agentic OSINT State of the Art (2025–2026) and Apex Mapping

## External signals (consult continuously)

- **Agentic AI for OSINT surveys (2026):** ReAct orchestration over specialized tools; human co-pilot for verification; taxonomy separates agentic architectures from mere prompting.
- **Open ReAct OSINT agents:** Model chooses tool; evidence ledger; claims must cite tool tags — “agent is the lens, not the target.”
- **Deep research products:** Multi-hop search+visit at consumer scale (OpenAI / Google / Perplexity class); open recipes (ODS, MTA-Agent) show tool-augmented open models can match or beat closed search previews on benchmarks when tools are real.
- **Browser / unlocker stacks:** Escalating fetch (HTTP → reader → stealth browser) for bot-walled pages — Apex already has browser-fetch budget; plan must keep **model-triggered** escalate, not fixed “always Scrapfly first.”
- **MCP research servers:** Bundles of search, extract, SEC, social, Wayback as tool menus — Apex’s tool list should remain **small and sharp** (search, visit, domain, registry, footprint) so the model is not drowned in 25 equally noisy tools.
- **Observability:** Honeycomb Agent Timeline GA (2026); OTel GenAI semantic conventions; LangSmith trajectory + Engine for issue clustering. Apex DigSpan is the **in-product** L2 trajectory; plan future optional OTLP export, not a dependency for desk UX.

## Mapping to Apex (do / don’t)

| External pattern | Apex do | Apex don’t |
|------------------|---------|------------|
| ReAct free choice | Keep agentic-web-research free; check-no-force-dig | Reintroduce force_* or fixed visit ladders |
| Evidence ledger | contact_evidence + sourceUrls required for promote | Promote from model prose without URL |
| Human verify | REACH = candidate until operator trust; validate copy | Auto-mark verified from LLM alone |
| Deep multi-hop | depth standard/deep scales maxIter + timeout | Infinite loops; scripted 40-step playbooks |
| Rank-fusion search | Multi-provider search with failover | Single SERP, fail closed to empty without try-next |
| Trajectory | DigSpan + Live Desk strip | Job progress % only |
| Genetic / explore-exploit (Blue Helix-style) | Optional later: query mutation from successful SERP hosts | Genetic algo before free dig is solid |

## HNWI-specific public paths (2026 playbooks)

1. **Name + issuer** → EDGAR EFTS (SC 13D/G, DEF 14A, Form 3/4) → notice phones, addresses, related persons.
2. **Company site / IR / press PDF** → emails, phones, roles.
3. **LinkedIn public** → role confirmation, not paid Sales Nav scrape as core.
4. **Registry** (CH, BRREG, etc.) → officers, registered office.
5. **Username footprint** (Maigret-class) → secondary, review-only, never sole identity proof.
6. **Reverse phone / email** only on values already found — expand graph, don’t seed from purchased dumps.

Apex must **not** compete by ingesting leaked lead-gen databases. Moat is **live public dig + attribution discipline + card UX**.

## Evaluation culture

External agents publish **benchmarks** (20-target, FRAMES, SimpleQA). Apex’s equivalent is the **fixed fixture scoreboard** vs baseline agent paste — mean ≥ 1.0, zero −1. Plan volumes must keep that gate sacred.

