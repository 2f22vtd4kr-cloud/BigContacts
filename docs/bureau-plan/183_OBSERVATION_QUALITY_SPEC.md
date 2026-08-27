# Volume 183 — Observation Quality Spec (Search & Visit)

## Principle

Free dig quality is gated by **what the model sees**. Thin observations cause thin findings. Scripts cannot fix that; better SERP and visit payloads can.

## web_search observation minimum

- Query echoed
- For each result (top N): title, URL, snippet
- Host highlighted when sec.gov, company domain, or IR subdomain
- De-duplicated hosts
- Clear numbering so model can pick visit targets
- Error text if provider failed (so model can retry different query, not invent)

## visit observation minimum

- Final URL after redirects
- Status code / failure reason
- Text budget: prefer contact-rich slices + head
- Explicit `CANDIDATES:` list of emails/phones/socials found by deterministic extractors — labeled **unverified**
- No silent drop of org-looking numbers

## browser_fetch observation

Same as visit, plus note that escalate was used. Model should not need to know vendor names.

## Anti-patterns

- Dumping 100k characters of boilerplate
- Stripping all telephone-looking strings as “noise”
- Returning only “page fetched ok” without text

## Metrics

Track average observation size, candidate count per visit, visit rate after search — correlate with scoreboard.

