# Live Recovery — 31 August 2026

## Evidence snapshot

The provider-backed 10-target run executed from commit `80ea32fed14c32baedd1c919bbf488b78690f5d3` reached a clean terminal state after a real Free-ReAct discovery pass.

Observed artifact facts:

- 0 persisted entities
- 0 admitted candidates
- 0 contacts
- 19 web searches
- 16 page visits
- `degraded=true`
- Qwen3.8-27B was the observed Dig model
- the Bureau spent approximately 24 minutes in the live research loop

This is a **research-quality failure**, not an infrastructure-success claim.

## Forensic diagnosis

The run proves the model/tool loop was live: the artifact contains model decisions, searches, visits, and actual page reads. The failure was therefore narrowed to the boundary after observation.

The discovery parser previously required `scope === "candidate"` before considering a finding. A named person found on an organization page can legitimately have `scope === "organization"` because the evidence surface is the organization, while the human identity is still a valid discovery candidate. That semantic mismatch can discard truthful people without weakening the identity gate.

The repair therefore allows an explicitly named `personName` or explicit `person:` finding through discovery admission regardless of organization/unknown evidence scope. Generic organization findings remain rejected.

## New forensic telemetry

The ReAct runtime now records a compact, bounded summary of the model-declared `done` findings directly in the trajectory. This allows the next failure to be classified from evidence:

1. model returned no person;
2. model returned a person with organization scope;
3. model returned malformed identity data;
4. source URL was not actually observed;
5. identity gate rejected the candidate for a substantive reason.

This telemetry is observational only. It does not promote findings to cards.

## Source changes

- `scripts/apply-discovery-admission-v2.mjs` — build-time canonical-source hardening.
- `artifacts/api-server/package.json` — applies the hardening before API build.
- `scripts/resilient-live-batch-trigger.md` — retriggers the provider-resilient live audit on `main`.
- Notion OSINT Bureau Dashboard updated with the same evidence posture.

## Next proof gate

The next provider-backed run must reach terminal state and produce its artifacts. The required sequence remains:

`actual targets → actual cards → actual evidence → trajectory audit → independent blind OpenAI research → target-by-target comparison`.

A run is not green merely because setup, provider preflight, API startup, or the 10-target launch succeeded.

## Evaluation rule

The independent baseline remains blind. It receives the same target/objective and comparable research opportunity without Apex hypotheses, cards, or trajectories. Scores are based on identity truth, source quality, provenance, contact-route honesty, and practical reachability—not number of calls.
