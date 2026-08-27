# Volume 147 — Search and Visit Quality (Free Dig Performance)

## Goal

Raise **visits that touch attributable pages** (filings, company contact, person bio) without scripting the path.

## Soft techniques allowed

- Observation text that lists SERP URLs clearly numbered so the model can `visit`.
- Stagnation nudge when the same query repeats 3×.
- Timeout soft warning in observation (“budget low — prioritize best URL”).
- Provider failover silent to the model (same tool name, different backend).

## Hard techniques forbidden

- Auto-visit top 3 SERP without model action.
- Forced query templates every N steps.
- Blocking `done` until a phone is found (causes invention pressure).

## SERP hygiene

- De-duplicate hosts in observation.
- Flag aggregator hosts in observation text (model may still visit; promote layer rejects).
- Prefer including PDF / sec.gov / company domain lines when present in results.

## Visit hygiene

- Truncate page text intelligently (contact sections, tel: patterns, mailto:).
- Emit extracted candidates into observation as **candidates**, not as already-true findings — model must still emit findings with URLs.

## Metrics (internal)

- searches per dig, visits per dig, findings with sourceUrls, promote rate, overwrite rate.
- Correlate with scoreboard mean over time.

