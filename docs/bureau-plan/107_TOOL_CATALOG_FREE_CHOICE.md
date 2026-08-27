# Volume 107 — Tool Catalog for Free Choice

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

Tools are **options the model may choose**, not a tour the runtime forces.

| Tool | Capability | Model may choose when | Not |
|------|------------|----------------------|-----|
| web_search | SERP via Serper/Tavily/Exa failover | When identity or employer surface unknown | Never as only forced first hop when model already has a URL |
| visit | HTTP fetch + CONTACT FACTS extract | When SERP or knowledge yields a primary URL | Do not force /about /team path list |
| browser_fetch | JS-capable fetch | When static visit fails challenge | Budget soft-cap |
| registry_search | EDGAR/CH/OC/etc. | When filings identity needed | Not a mandatory pre-dig ritual when dig is the pass |
| footprint_email | Holehe-class | When email candidate exists | Soft budget |
| footprint_username | Maigret/Sherlock-class | When username/handle exists | Soft budget |
| domain_lookup | RDAP/DNS | When domain attribution needed |  |
| harvest_domain | Domain email harvest | When org domain known and org routes useful | Org labeling |
| reverse_whois | When enabled | Attribution pivots | Key may be absent |
| done | Finish dig | When bag sufficient or budget better spent stopping | Reject only pure no-op |

## Prompt rule

List tools in orientation. Do not order them as mandatory sequence.
