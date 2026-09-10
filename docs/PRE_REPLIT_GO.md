# Pre-Replit GO — Apex Atlas

**Branch:** `main`  
**Purpose:** live acceptance preparation only. Static repository checks are not runtime proof.

## Before launch

1. Import `https://github.com/2f22vtd4kr-cloud/BigContacts` → **`main`**.
2. Install dependencies and apply the current database schema.
3. Start the API/desk workflows.
4. Confirm `GET /api/healthz` reports the expected live service/provider integrity.
5. Confirm the runtime is using the exact Git SHA being tested.
6. Only then run the bounded Apex proof experiment.

## Apex role law

| Role | Provider | Authority |
|------|----------|-----------|
| Boss / Head Investigator | **Gemini** | Case direction, assignment, continuation, stopping/control decisions |
| Right Hand / Oversight | **DeepSeek via NVIDIA Integrate** | Review, challenge, gap detection, advice; never Investigator |
| Investigator | **Groq or Mistral** | Free-ReAct research: first action, tool choice, queries, pivots, revisits, evidence judgment, findings, promotion decision, stopping |

Groq/Mistral interchangeability is capacity/transport behavior only. A provider failure must never cause deterministic code to choose the research strategy.

## Required secrets

**Core**
- `DATABASE_URL`
- Redis configuration required by the deployed environment
- `GEMINI_API_KEY` / `GEMINI_KEY`
- `DEEPSEEK_API_KEY` / NVIDIA Integrate credentials used by the configured adapter
- `GROQ_API_KEY`
- `SERPER_API_KEY` (plus configured alternates if used)

**Optional capabilities**
- Tavily / Exa
- Mistral
- browser/provider credentials
- registry/domain capabilities

Python OSINT tools such as Holehe, Maigret, Sherlock and theHarvester remain unavailable until a real sandbox/egress boundary exists. Do not treat a subprocess timeout as network isolation.

## Runtime proof experiment

The proof is **not** “the server starts” and is **not** “a card appeared.”

Capture one complete bounded investigation and verify:

```text
case opened
  ↓
Gemini Boss
  ↓
DeepSeek/NVIDIA Right Hand
  ↓
Gemini selects Groq OR Mistral Investigator
  ↓
Investigator chooses first action
  ↓
successful observation
  ↓
Investigator chooses next action independently
  ↓
observation / pivot / revisit / tool choice
  ↓
explicit model finding
  ↓
explicit promotion decision where appropriate
  ↓
exact successful observed provenance
  ↓
deterministic evidence validation
  ↓
card/evidence projection only if validation succeeds
```

The exact research trajectory must **not** be prescribed by the test. The test must observe genuine model agency.

## Runtime acceptance invariants

- First Investigator action is model-selected; no seeded hidden query.
- No deterministic phase forces a provider/tool/hop sequence.
- Public-source text cannot override institutional instructions or role law.
- Failed/blocked/timeout URLs cannot become evidence provenance.
- A claim must be supported by the actual successful observation containing the claim; identity and contact claims cannot be assembled from unrelated pages.
- Candidate admission requires explicit model identity + candidate scope + successful observed source + explicit promotion.
- Organization contact routes remain organization scope.
- Invalid Boss/control decisions fail closed; they are never converted into another action.
- Cancellation stops the run and is distinct from successful completion.
- Hard budgets remain safety/resource limits, not research strategy.
- Trajectory/event records are sufficient to reconstruct what happened without exposing hidden chain-of-thought.
- Card fields are projections; evidence/provenance remains the source of truth.

## Evidence to capture from the live run

Record:

- tested Git SHA;
- case ID / run ID / job ID;
- Boss model;
- Right-Hand model;
- selected Investigator model;
- every model-selected action and execution status;
- successful observed URLs;
- structured trajectory records;
- model findings and promotion decisions;
- evidence validation result;
- resulting evidence/card projection;
- stop reason;
- cancellation/error state if applicable.

A runtime run that merely produces a plausible contact without this causal/provenance chain is **not accepted as proof**.

## Do not cheat the proof

Do not force `web_search`, seed a URL/query, inject a known contact, manually select a provider/tool, copy an existing entity value, promote deterministic extraction, or use retired enrichment to make the test pass.

A failed proof is valuable: preserve its complete trajectory and diagnose the actual boundary that failed.
