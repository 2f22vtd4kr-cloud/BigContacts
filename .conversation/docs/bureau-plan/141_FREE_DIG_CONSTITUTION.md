# Volume 141 — Free Dig Constitution (Anti-Script Permanent Law)

## Article I — Agency

The dig model selects the next action from the **allowed tool set**. Implementers may:

- Provide orientation (OSINT norms, no invention, cite URLs).
- Provide observations (SERP snippets, page text, registry rows).
- Soft-nudge on stagnation (repeated identical query).
- Enforce budgets (maxIter, hardTimeout, footprint soft cap).

Implementers may **not**:

- Inject `force_*` actions.
- Replace the model’s choice with a fixed ladder (“always visit first URL,” “always related person next”).
- Stop the dig solely because a non-dig subsystem (adaptive director) has no script.

## Article II — Tools (sharp set)

Core: `web_search`, `visit`, `browser_fetch`, `domain_lookup`, `registry_search`, `harvest_domain`, `footprint_email`, `footprint_username`, `reverse_whois`, `done`.

Growth rule: new tools require (a) clear observation format, (b) failure message the model can read, (c) no automatic chain that skips the model.

## Article III — Done

`done` is accepted when the model returns findings with sourceUrls, or when budgets expire **with partial findings preserved**. Soft-reject only pure no-ops (zero search, zero visit, zero findings) early in the loop.

## Article IV — Findings

No promote without:

- Non-empty value passing sanitize,
- For email/phone/linkedin: at least one http(s) sourceUrl when required by vector policy,
- Identity collision assessed.

## Article V — CI

`pnpm run check:no-force-dig` (or equivalent) is **blocking**. Any PR that reintroduces force controllers fails closed.

## Article VI — Parity with single-LLM agents

A single-LLM agent with web search is free. Apex dig must be **at least as free**, with **more** tools and **durable** memory. If Apex is stricter than chat in a way that reduces search/visit, that strictness is a bug unless it prevents invention or illegal collection.

