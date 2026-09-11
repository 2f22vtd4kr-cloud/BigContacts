# Apex Atlas forensic continuation — 2026-09-11

## Scope

This pass deliberately remained pre-Replit. The operator will launch Replit manually later; this session focused on repository architecture, source-of-truth defects, persistence boundaries, and reachability.

## 1. ReAct opening / #120

`artifacts/api-server/package.json` still invokes `scripts/apply-free-react-opening-repair.mjs` in both build and test. The migration hardener rewrites two forced-search opening strings in `agentic-web-research-core.ts` at build time. The issue was previously closed prematurely; it has been reopened because source-first cleanup has not been proven.

The architectural requirement remains: the checked-in Investigator source itself must contain neutral initial state and the first model turn must choose any permitted capability from durable context. The migration hardener must then be removed from build/test and deleted.

Provider-ordering repair is separate and remains structurally distinct from the opening defect.

## 2. Groq final review / #128

Fresh source inspection of `artifacts/api-server/src/src/lib/ai-extractor.ts` confirms that `runFinalTargetReview()` still contains a tertiary Groq capacity loop after Gemini Boss and DeepSeek/NVIDIA Right Hand. The loop explicitly labels itself `groq-final-review-fallback` and returns `adjudicateFinalTargetReview(...)` from Groq output.

This is a real role-law violation. Groq is Investigator-only. The correct source-level repair is to remove the entire Groq final-review loop and retain the deterministic fail-closed adjudication after Gemini/DeepSeek are unavailable. The migration hardener must only be deleted after that direct source repair.

## 3. Duplicate discovery control planes / #153

Two materially different discovery paths are live/structurally significant:

- `routes/research/canonical-case-discovery.ts` is explicitly mounted and performs DeepSeek Right-hand review → Gemini Boss assignment → `runBureauAgenticWebPass(mode: "discovery")`, followed by its own candidate/entity projection.
- `lib/canonical-atlas-discovery.ts` is imported by the canonical Atlas launch route and contains a separate Boss/control/admission/projection implementation.

They must not be treated as harmless wrappers. Their persistence and admission semantics differ. Consolidation requires caller/contract tracing before retiring either path.

## 4. Evidence graph / #152

The repository currently has two evidence generations:

### Canonical
`research_cases` → `research_case_events` → Investigator trajectory/observations → model-authored findings → strict contact-evidence validation → projection.

### Legacy
`research_sessions` → `research_evidence`, with consumers/writers in legacy session/target-research/MCTS surfaces.

The old graph must not be deleted until reachability/API compatibility is reconciled.

A concrete canonical defect was found in `canonical-case-discovery.ts`: after explicit model promotion it creates a review-only entity and attempts to persist a synthetic `other` vector `person:<name>`. The strict persistence boundary now rejects this synthetic identity marker, so it does not currently become contact evidence, but the call is architecturally wrong. Discovery identity admission should be represented by a case/event/claim reference, not fabricated contact evidence.

The same discovery event currently records admitted names without a first-class immutable observation/claim reference. This is a direct next implementation target for #152.

## 5. Entity/contact writer map

Current writers/readers found include:

- canonical discovery: `canonical-case-discovery.ts`, `canonical-atlas-discovery.ts`;
- canonical strict evidence: `bureau-contact-persist-strict.ts`;
- manual/application entity API: `routes/entities.ts`;
- legacy research: `routes/research/cases.ts`, `routes/research/bulk.ts`, MCTS and old target-research surfaces;
- legacy/compatibility enrichment: Phase J, registry enrichment, ingest compatibility surfaces;
- presentation/read surfaces such as `presented-contacts.ts`.

The mounted API index explicitly avoids mounting deterministic extended-OSINT execution. Legacy mutation boundaries and retirement guards exist, but leaf-level source audit is still required before calling those trees structurally dead.

## 6. Subprocess OSINT / #139

Python cancellation has process-group/kill-backstop mechanics, but this is not an egress sandbox. Holehe, Maigret, Sherlock and theHarvester can perform network I/O independently of Node's SSRF boundary unless execution occurs inside an enforceable OS/network boundary.

Required final architecture:

Investigator action → Apex executor → short-lived sandbox → restricted network namespace/egress broker → approved destination policy → child process/group → bounded output/time/filesystem → structured observation → canonical evidence boundary.

Until this exists, network-capable Python OSINT remains fail-closed.

## 7. Runtime status

No Replit runtime proof is claimed. This pass intentionally stops before the manual Replit launch. The eventual acceptance experiment must prove the multi-role causal chain and genuine model-selected trajectory, not merely server startup.
