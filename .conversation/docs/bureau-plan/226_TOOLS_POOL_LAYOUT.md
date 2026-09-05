# Volume 226 — Tools Pool Layout

## Definition

The **tools pool** is the set of executable capabilities research agents may call. It is not an agent. It has no goals.

## Pool inventory (dig-facing)

| Tool | Function | Typical providers |
|------|----------|-------------------|
| web_search | SERP | Serper, Tavily, Exa, Perplexity, DDG fallback |
| visit | Fetch + extract | HTTP |
| browser_fetch | Hard pages | Scrapfly, ZenRows |
| footprint_email | Email presence | Holehe |
| footprint_username | Username presence | Maigret, Sherlock |
| domain_lookup | RDAP/WHOIS | RDAP, WhoisJSON |
| harvest_domain | Domain emails/hosts | theHarvester |
| registry_search | Registries | EDGAR, CH, BRREG, GLEIF, OC, … |
| reverse_whois | Reverse WHOIS | Whoxy when keyed |
| done | End loop | n/a |

## Pool rules

1. **Model chooses** — no force controller
2. **Fail soft** — error string in observation, model may pivot
3. **Provider failover inside the tool** — model still sees `web_search`
4. **Budgets** — soft caps (footprint, browser) with observation notice
5. **Secrets** — never in DigSpan summaries

## Who may call the pool

| Caller | Allowed |
|--------|---------|
| Dig agent | Full dig set |
| Discovery agent | search, visit, registry, done (not promote) |
| Case investigator | Subset via case bridge if enabled |
| Boss / right-hand | **None** |
| Orchestrator | **None** (except scheduling) |

## UI “tools pool” mental model

Live Desk should show tools as **lanes that lit up because an agent called them**, not as a checklist of mandatory hops. Scheme nodes = observed spans, not the full catalog.

