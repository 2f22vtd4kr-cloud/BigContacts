# Volume 219 — Discovery Agent Spec (Natural LLM)

## Role

`runDiscoveryAgent` — find **people to research**, not contacts.

## Tools (sharp set)

- `web_search`
- `visit` / `browser_fetch`
- `registry_search` (when jurisdiction fits)
- optional `edgar_search` / EFTS helper if exposed as one tool
- `done` with `candidates[]`

## Output candidate shape

```
{
  name: string,
  role?: string,
  company?: string,
  basis: string,           // why this person for outreach OSINT
  sourceUrls: string[],    // required
  lane?: string,           // e.g. sc13-filer, ir-executive, uk-director
  confidence?: number
}
```

No candidate without `sourceUrls` and non-empty `basis`.

## Orientation (spirit)

You are staffing an outreach intelligence desk. Propose named people who likely have a **public contact surface** worth a dig: filers, officers, principals, gatekeepers. Prefer approachable public footprints over celebrity trophies. One lane per run unless budget allows a second. Do not invent names. Do not treat companies as people.

## Budgets

- fast discovery: fewer iterations (bulk)
- standard: default for discoveryFirst desk fill
- Same philosophy as dig depths — **more agency time**, not more forced templates

## Admission

Existing `discovery-intake` ranks/filters still apply after the agent: fame filter, shell reframe, person-first. Agent proposes; intake admits.

## DigSpan

agentName: `discovery` (or investigator with stage discovery). Spans for search/visit/done.

## Parallelism

Do not run 15 template categories in parallel “for coverage” while also running the agent in a way that floods the ledger with noise. Prefer **one agent run → intake batch**.

