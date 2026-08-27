# Volume 10 — OSINT Tool Catalog (Model-Chosen Capabilities)

**Law:** Every tool below is a **capability the dig model may select**. None is a mandatory stage on a healthy run.

## Inventory

| Action | Class | Backends | Output | Failure modes | Role in free dig |
|--------|-------|----------|--------|---------------|------------------|
| web_search | SERP | Serper, Tavily, Exa, DDG fallback | Invent queries; return titles, URLs, snippets | Empty SERP; rate limit; missing key | Primary dig move |
| visit | Fetch | HTTP client | HTML/text; CONTACT FACTS extract | 403/CF; timeout | Primary page read |
| browser_fetch | Browser | Scrapfly, ZenRows | Rendered HTML when static fetch fails | Quota; key missing | Anti-bot / JS pages |
| registry_search | Registry | EDGAR, CH, BRREG, GLEIF, OpenCorporates, BODACC | Filings, officers, company links | 401 token; schema drift | Identity anchors |
| domain_lookup | Infra | RDAP, WhoisJSON | Registrar, contacts, nameservers | Thin RDAP; privacy redaction | Org surface |
| harvest_domain | Harvest | theHarvester | Emails/hosts from domain | Noise; install missing | Domain email sweep |
| footprint_email | Footprint | Holehe | Account existence signals | False positives; rate limit | Email probing |
| footprint_username | Footprint | Maigret, Sherlock | Profile URLs across sites | Noise; slow CLI | Handle pivot |
| reverse_whois | Infra | Whoxy if keyed | Domains by registrant | Key missing; paid tier | Org domain graph |
| done | Control | n/a | End loop; keep findings bag | Premature done | Model stop |

## Per-tool requirements

### `web_search`

- **Class:** SERP
- **Backends:** Serper, Tavily, Exa, DDG fallback
- **Expected output to model:** Invent queries; return titles, URLs, snippets
- **Failure modes:** Empty SERP; rate limit; missing key
- **Role:** Primary dig move
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`web_search`.

### `visit`

- **Class:** Fetch
- **Backends:** HTTP client
- **Expected output to model:** HTML/text; CONTACT FACTS extract
- **Failure modes:** 403/CF; timeout
- **Role:** Primary page read
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`visit`.

### `browser_fetch`

- **Class:** Browser
- **Backends:** Scrapfly, ZenRows
- **Expected output to model:** Rendered HTML when static fetch fails
- **Failure modes:** Quota; key missing
- **Role:** Anti-bot / JS pages
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`browser_fetch`.

### `registry_search`

- **Class:** Registry
- **Backends:** EDGAR, CH, BRREG, GLEIF, OpenCorporates, BODACC
- **Expected output to model:** Filings, officers, company links
- **Failure modes:** 401 token; schema drift
- **Role:** Identity anchors
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`registry_search`.

### `domain_lookup`

- **Class:** Infra
- **Backends:** RDAP, WhoisJSON
- **Expected output to model:** Registrar, contacts, nameservers
- **Failure modes:** Thin RDAP; privacy redaction
- **Role:** Org surface
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`domain_lookup`.

### `harvest_domain`

- **Class:** Harvest
- **Backends:** theHarvester
- **Expected output to model:** Emails/hosts from domain
- **Failure modes:** Noise; install missing
- **Role:** Domain email sweep
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`harvest_domain`.

### `footprint_email`

- **Class:** Footprint
- **Backends:** Holehe
- **Expected output to model:** Account existence signals
- **Failure modes:** False positives; rate limit
- **Role:** Email probing
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`footprint_email`.

### `footprint_username`

- **Class:** Footprint
- **Backends:** Maigret, Sherlock
- **Expected output to model:** Profile URLs across sites
- **Failure modes:** Noise; slow CLI
- **Role:** Handle pivot
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`footprint_username`.

### `reverse_whois`

- **Class:** Infra
- **Backends:** Whoxy if keyed
- **Expected output to model:** Domains by registrant
- **Failure modes:** Key missing; paid tier
- **Role:** Org domain graph
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`reverse_whois`.

### `done`

- **Class:** Control
- **Backends:** n/a
- **Expected output to model:** End loop; keep findings bag
- **Failure modes:** Premature done
- **Role:** Model stop
- **Observation contract:** structured summary + URLs + error string if failed; never silent success.
- **Live Desk:** map to method chrome (search / browser / registry / footprint / domain).
- **DigSpan:** op=`execute_tool` or `chat` for LLM; name=`done`.

## Provider failover for search

Order on healthy installs: **Serper → Tavily → Exa → DDG**. Missing middle providers skip. Integrity must count Serper as live search.

## LLM failover for dig steps

**Groq → Mistral → Gemini → NVIDIA**. Empty/error advances chain. All fail → thin deterministic recovery once.

## Installation

Python OSINT (Holehe, Maigret, Sherlock, theHarvester) is environment-dependent. Missing tools must surface as observations, not fake findings. Replit from-zero may set INSTALL_PYTHON_OSINT=false for credit-safe boot; full parity digs need tools installed.
