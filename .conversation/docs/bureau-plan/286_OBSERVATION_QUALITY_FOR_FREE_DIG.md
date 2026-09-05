# Volume 286 — Observation Quality for Free Dig

## Purpose

Free dig fails quietly when tools return thin observations: the model cannot invent what the page did not yield, and it should not be blamed for empty cards when the harness starved context. This volume defines **observation quality** as a product requirement equal to tool choice freedom.

## Normative requirements

1. Every `web_search` observation includes ranked URLs, titles, and snippets sufficient to choose a visit—not only “N results.”
2. Every successful `visit` / `browser_fetch` observation surfaces extracted contact facts (type, scope, value) when present, plus enough page text for role/org binding.
3. Tool errors are explicit (timeout, 403, empty body)—never silent success.
4. Observations stay lossy-compressed for the model context window; **full fidelity** remains in evidence storage with `sourceUrls`.

## Anti-patterns

- Returning only “OK” from a visit that contained a phone in the HTML.
- Truncating away the only snippet that named the reporting person.
- Feeding lane labels (`LANE – people_press`) as if they were SERP queries.

## Relation to free dig

Better observations **increase** model agency. They do not prescribe the next query. Force-hop lists remain forbidden.
