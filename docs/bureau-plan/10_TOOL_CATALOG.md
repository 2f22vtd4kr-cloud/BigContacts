# Volume 10 — OSINT Tool Catalog (Model-Chosen Capabilities)

**Law:** Every tool below is a capability the Dig investigator may select. None is a mandatory research stage on a healthy run.

| Action | Class | Backends | Role |
|--------|-------|----------|------|
| web_search | SERP | Serper, Tavily, Exa, DDG | Model-selected discovery/research |
| visit | Fetch | HTTP client | Read a selected page |
| browser_fetch | Browser | Scrapfly, ZenRows | Escalate selected page fetch |
| registry_search | Registry | EDGAR, Companies House, BRREG, GLEIF, OpenCorporates, BODACC | Identity/company evidence |
| domain_lookup | Infra | RDAP, WhoisJSON | Domain/org evidence |
| harvest_domain | Harvest | theHarvester | Domain evidence when model chooses it |
| footprint_email | Footprint | Holehe | Public account-signal investigation |
| footprint_username | Footprint | Maigret, Sherlock | Handle/profile investigation |
| domain_lookup | Infra | RDAP → WhoisJSON | Domain (Whoxy removed) |
| done | Control | n/a | Model-selected stop |

## Tool-use law

The Dig investigator chooses whether to search, visit, pivot, use a registry, inspect a domain, investigate a public profile, or stop. Deterministic code executes the selected action and validates its result. Tool output remains a typed observation with source URL/status; it is not automatically an identity claim.

Missing tools/providers surface as failures or observations. They must never trigger a hidden scripted research path.

## Search provider order

Healthy web-search capability may use **Serper → Tavily → Exa → DDG** according to the runtime's capability fallback. This is search transport fallback, not research strategy: the query remains the model's choice.

## LLM provider-role boundary

**Dig investigator: Groq → Mistral only.** This is the provider failover for the web/OSINT research capability. Gemini is Boss and DeepSeek via NVIDIA Integrate is right-hand; neither is a Dig fallback.

**Provider roles:** **Boss = Gemini**; **Right-hand = DeepSeek via NVIDIA Integrate**; **Investigator = Groq → Mistral**.

If Groq and Mistral are unavailable, the Dig capability fails closed/degrades honestly. Do not replace the missing investigator with Gemini, NVIDIA, a deterministic search recipe, or a force-hop sequence.

## Observation and provenance

Search results, fetched pages, registry responses and OSINT results are observations. A contact finding must retain exact HTTP(S) source provenance and scope. An organization inbox or switchboard is organization-scoped unless evidence establishes a personal association.

## Installation

Python OSINT tools are environment-dependent. Missing installations must be reported as unavailable capabilities, never converted into synthetic findings.
