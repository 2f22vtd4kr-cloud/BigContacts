# Volume 10 — OSINT Tool Catalog (Model-Chosen Capabilities)

**Law:** Every tool below is a capability the investigator may select. None is a mandatory research stage on a healthy run.

| Action | Class | Backends | Role |
|--------|-------|----------|------|
| web_search | Search | Serper, Tavily, Exa, DDG | Model-selected discovery/research |
| visit | Fetch | HTTP client | Read a selected page |
| browser_fetch | Browser | Scrapfly, ZenRows | Escalate selected page fetch |
| registry_search | Registry | EDGAR, Companies House, BRREG, GLEIF, OpenCorporates, BODACC | Identity/company evidence |
| domain_lookup | Infra | RDAP, WhoisJSON | Domain/org evidence |
| harvest_domain | Harvest | theHarvester | Domain evidence when model chooses it |
| footprint_email | Footprint | Holehe | Public account-signal investigation |
| footprint_username | Footprint | Maigret, Sherlock | Handle/profile investigation |
| done | Control | n/a | Model-selected stop |

## Tool-use law

The investigator chooses whether to search, visit, pivot, use a registry, inspect a domain, investigate a public profile, or stop. Deterministic code executes the selected action and validates its result. Tool output remains a typed observation with source URL/status; it is not automatically an identity claim.

Missing tools/providers surface as failures or observations. They must never trigger a hidden scripted research path.

## Search capability pool

The search layer is a capability pool, not a fixed vendor chain. Serper, Tavily, Exa and DDG are interchangeable search transports where configured; Scrapfly/ZenRows provide browser/fetch escalation rather than an LLM role. The model may explicitly select a search provider when that is useful, or use the runtime's configured fallback when no provider is requested.

## Investigator LLM capability pool

The investigator role is **provider-neutral**. The runtime may select among configured LLM adapters for investigator decisions. Groq and Mistral are supported adapters today, but they are not the definition of the investigator role and must not be documented as a closed `Groq → Mistral` architecture.

Research/search/fetch capabilities such as **Tavily, Exa, Serper, Scrapfly and ZenRows** are separate tools available to the investigator; they are not interchangeable with the LLM adapter itself. This distinction keeps the architecture open to additional LLMs and additional research providers without changing the investigator role.

Gemini and NVIDIA remain Boss/right-hand roles unless deliberately added as investigator adapters in a separate architecture change. Provider failure must degrade honestly; it must not silently change model roles or impose a deterministic research recipe.

## Observation and provenance

Search results, fetched pages, registry responses and OSINT results are observations. A contact finding must retain exact HTTP(S) source provenance and scope. An organization inbox or switchboard is organization-scoped unless evidence establishes a personal association.

## Installation

Python OSINT tools are environment-dependent. Missing installations must be reported as unavailable capabilities, never converted into synthetic findings.
