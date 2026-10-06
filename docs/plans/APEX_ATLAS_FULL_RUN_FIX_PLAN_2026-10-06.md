# Apex Atlas Full-Run Fix Plan — 2026-10-06

## Goal

Make the next UI-equivalent Apex Atlas run operationally viable without weakening evidence, autonomy, provider separation, durable-state, or safety invariants.

The implementation is ordered from the provider boundary inward so that the next live run is not spent testing a known prompt-construction defect.

## Phase 1 — Bound the final provider request, not only inner context

### 1.1 Remove duplicated institutional orientation from the user prompt

Keep `apexOrientationCompact("dig_agent")` in the system message.

Remove the second copy and redundant bootstrap prose from `buildStepPrompt`.

Reason: identical institutional law does not need to be serialized twice.

### 1.2 Remove the full action schema from the user prompt

Keep `AGENTIC_STRUCTURED_SCHEMA` as the provider `response_format` contract.

Replace the prompt's full JSON schema dump with a short action vocabulary and explicit instruction:

- choose one permitted action;
- supply required fields;
- return one JSON object only.

This preserves deterministic output validation while removing a large static duplicate.

### 1.3 Reduce dynamic context budgets

Recommended defaults for a single Investigator turn:

- working durable context: 4,200–4,500 characters;
- intelligence state: 1,500–1,800 characters;
- prior durable case context inside the working context: <=1,000 characters;
- latest observation: <=1,000 characters;
- recent trajectory: <=2 recent bounded records;
- archive index: small head/tail representation.

Durable storage remains complete.

### 1.4 Add a final composed-prompt budget

The final `messages` content must be measured after composition.

Introduce a hard application budget around 8,500 characters for the combined system+user message content.

If composition exceeds the budget, compact the dynamic section first while preserving:

1. mission/role boundary;
2. current objective and anchor requirements;
3. latest observation;
4. current findings/negative evidence;
5. recent trajectory;
6. only then older context.

Do not blindly slice the whole prompt.

Telemetry must record:

- system chars;
- user chars;
- total prompt chars;
- prompt tokens;
- cached prompt tokens;
- completion tokens;
- total tokens.

## Phase 2 — Make provider quota handling predictive

### 2.1 Capture safe Groq rate-limit metadata

For every physical attempt, capture when present:

- limit requests;
- remaining requests;
- reset requests;
- limit tokens;
- remaining tokens;
- reset tokens;
- provider error code/type.

Never capture:

- Authorization headers;
- API keys;
- cookies;
- raw provider bodies.

### 2.2 Treat hard quota as terminal for the current episode

Already correct; preserve it.

Do not rotate the selected Investigator capability after an upstream hard quota response.

### 2.3 Avoid predictable token-window 429s

When a successful response reports remaining tokens and a reset interval, retain that snapshot for the selected capability/provider.

Before the next request, if the measured prompt/completion budget cannot fit in the remaining token allowance, wait for the reported reset when it is bounded by the Investigator episode timeout.

If the reset is not safely bounded, stop with a resource-limited provider outcome rather than sending a request that is predictably doomed.

This is a quota-efficiency mechanism, not a new safety ceiling.

### 2.4 Preserve the precise 400 compatibility fallback

Keep the same-model strict-schema → JSON-object fallback only when the provider explicitly identifies a structured-output validation rejection.

Do not fallback across models/providers/capabilities.

Add telemetry that makes this event visible.

## Phase 3 — Strengthen discovery query quality without taking autonomy away

### 3.1 Tighten the discovery search gate

Reject a discovery query when it consists only of generic time/sector/role/source vocabulary.

Accept model-selected queries when they contain a concrete anchor such as:

- named organization;
- named person;
- domain;
- registry/filing identifier;
- explicit source/domain constraint;
- or another non-generic contextual anchor.

Do not maintain a list of mandatory search steps.

### 3.2 Preserve pivot freedom

The Investigator may choose:

- registry search;
- official company site;
- trade publication;
- business filing;
- web search;
- domain research;
- another available capability.

The deterministic rail only decides whether the proposed action is sufficiently grounded to spend the external search budget.

### 3.3 Preserve negative/rejected evidence

A blocked generic query must become a durable trajectory record with the reason. It must not disappear from the model's memory.

## Phase 4 — Reconcile durable model metadata

When the actual model is known at an event boundary, persist the same provider/model/capability identity into the case row rather than leaving `pending`.

Do not rewrite historical facts after the run; apply this to future events/cases.

## Phase 5 — Add source-level regression guards

Add tests/checks for:

- final composed prompt <= configured hard budget;
- no duplicated institutional orientation in user prompt;
- no full action schema serialized into the user prompt;
- intelligence state remains separately bounded;
- discovery generic-query rejection;
- named-anchor query acceptance;
- hard 429 does not rotate capability;
- structured-output 400 fallback remains same model/capability;
- telemetry records safe rate-limit fields;
- durable case model identity is populated after provider selection.

## Phase 6 — Live-run acceptance gate

Before asking Replit for another full run:

### Static

- source integrity guards pass;
- typecheck passes;
- API build passes;
- API test suite passes;
- prompt-budget guard passes.

### Runtime

The next run must demonstrate:

- successful Investigator inference;
- bounded outbound prompt;
- no avoidable 400 retry if provider accepts strict schema;
- successful source observation;
- candidate admission;
- target investigation;
- evidence-backed contact route;
- correct durable terminal state.

A provider outage that occurs after a successful readiness check remains an external dependency failure, but the application must expose the exact rate-limit classification and preserve the case.

## Implementation order

1. Prompt composition/budget.
2. Provider telemetry/rate-limit snapshot.
3. Predictive token-window wait.
4. Discovery query gate.
5. Durable model metadata.
6. Static/runtime regression guards.
7. Re-read the complete canonical discovery → Investigator → admission → target → oversight path for information loss introduced by compaction.

## Rollback principle

Do not roll back the evidence/provenance architecture because a prompt becomes smaller.

If a compaction change loses decision-critical information, restore that information in the structured state rather than increasing the prompt indiscriminately.

The target architecture remains:

DURABLE EVIDENCE LEDGER
→ STRUCTURED DECISION STATE
→ COMPACT MODEL CONTEXT
→ LOCAL RECENT WINDOW
→ CURRENT ACTION / OBSERVATION
