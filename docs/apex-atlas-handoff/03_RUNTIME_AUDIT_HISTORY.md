# Apex Atlas — Runtime Audit History

This volume records recent operator-supplied live evidence. It is historical and must be verified against current main.

## Latest setup

Main commit reported:
f11371d95337c1bd8a7c2b49d7c383903a08bfb5

Reported checks:
- frozen install PASS;
- typecheck PASS;
- bureau checks PASS;
- initial build failed at Boss model-boundary guard;
- narrow daily-quota-path correction applied;
- affected tests PASS;
- typecheck PASS;
- bureau checks PASS;
- full build PASS;
- API health PASS;
- active Atlas job idle before launch.

## One authorized live run

Exactly one UI-equivalent launch was submitted.

POST /api/ingest/atlas-run
targetCount=3
researchDepth=standard
targetTimeoutMs=420000

Job:
391bbe22-0414-4ed4-965d-5714181af242

Accepted:
2026-10-01T04:03:03Z–04:03:04Z

Terminal:
2026-10-01T04:08:00.295Z

No second launch was sent.

## Runtime result

The run reached:
- Boss assignment;
- Right-hand opening;
- Investigator assignment;
- model-owned discovery;
- real Serper searches;
- Boss control turns;
- terminal Right-hand failure.

Discovery:
- 5 Serper searches;
- 38 returned URL entries, not deduplicated;
- 0 page visits;
- 0 findings;
- 0 candidate entities/cards;
- 0 evidence rows.

Durable case:
- case 1;
- 12 events;
- status review;
- current action canonical-control-unavailable;
- 5 Investigator trajectory records;
- discoveredCandidates empty.

Redis forensic trace endpoint:
- 0 slots.

This trace-vs-durable mismatch is itself a follow-up defect candidate.

## Search activity

Observed searches:
- private-equity partner/contact query;
- mid-market private-equity leadership query;
- leadership plus LinkedIn query;
- Gryphon Investors leadership team;
- repeated Gryphon Investors leadership team.

No result was followed by a page visit.

## Investigator provider activity

Investigator provider: Groq.

Observed provider behavior:
- Qwen HTTP 200 successes;
- repeated Qwen HTTP 413 request-size failures;
- GPT-OSS fallback successes;
- Groq HTTP 429 rate limits;
- provider cooldown blocks.

Prompt/context sizes grew approximately:
21,774 -> 39,482 -> 45,804 -> 53,766 -> 116,133 -> 121,241 -> 126,240 -> 214,957 characters.

This caused repeated Qwen 413s.

This is a separate serious engineering problem because the Investigator can lose research capacity even if Gemini is healthy.

## Gemini terminal event

Durable case event 12:
Boss control turn 4
action=stop
status=unavailable

Right-hand error:
Gemini Right-hand gemini-3.1-flash-lite rate_limited.

Atlas then failed closed.

That fail-closed behavior is correct; continuing without required oversight would be architecturally wrong.

## Persistence

Reported final counts:
- research cases: 1;
- case events: 12;
- entities: 0;
- research evidence: 0;
- contact evidence: 0;
- assets/cards: 0.

No target card or trusted-contact/card promotion occurred.

## Interpretation

The run proves:
- replacement Boss Gemini credential allowed the canonical workflow to start;
- the broader Gemini pool was exercised;
- real Investigator research occurred;
- real external search calls occurred;
- durable case events were written;
- fail-closed semantics worked.

It does NOT prove:
- reliable Right-hand availability;
- completion of targets 1/2/3;
- evidence/card creation;
- end-to-end research success;
- GREEN release.

## Do not repeat blindly

Before another live run, investigate:
1. Right-hand model-pool eligibility/cooldowns/retry behavior;
2. Investigator prompt/context growth and compaction;
3. trace endpoint vs durable event consistency;
4. actual sequential target execution, which remains unverified.

Future live runs must create a fresh timestamped audit and append after every significant action.
