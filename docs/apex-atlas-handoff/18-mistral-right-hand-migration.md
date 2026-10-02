# Mistral Right-hand Control-Plane Migration

Date: 2026-10-02

## Canonical roles
- Boss: Groq GPT-OSS 120B, bounded GPT-OSS 20B fallback.
- Right-hand: Mistral Small 4 (mistral-small-2603), with mistral-small-latest catalog fallback.
- Investigator: existing model-owned Groq/Mistral research layer.

The Right-hand remains an independent oversight role. It does not browse, select research tools, or replace the Investigator. It reasons only over supplied case/discovery context and returns bounded control JSON.

## Transport and credentials
The adapter is artifacts/api-server/src/src/lib/mistral-right-hand-reasoning.ts.
- credential: MISTRAL_API_KEY (plus numbered slots)
- catalog: Mistral /v1/models
- generation: Mistral /v1/chat/completions
- structured output: JSON Schema
- no key values committed

artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts is now only a compatibility re-export shim. It contains no Gemini transport.

## Failure and context rules
- provider calls are bounded by request/overall deadlines;
- one bounded same-model 503 retry;
- one short same-model 429 retry;
- model/catalog fallback remains bounded;
- missing credentials and unavailable catalog fail closed;
- model-facing prompts are capped at 20,000 characters;
- oversized context fails closed rather than silently truncating durable evidence;
- durable case history remains independent from model-facing compaction.

## Readiness
Ordinary GET /api/system/status remains side-effect-free with respect to provider generation and catalog calls. Explicit catalog readiness is available at POST /api/system/diagnostics/mistral-readiness.

A successful catalog diagnostic is not evidence that a full Atlas run succeeds. The canonical audit must still verify Boss -> Right-hand -> Investigator -> real capabilities -> durable evidence -> truthful terminal state.

## Verification gate
The canonical boundary check is scripts/check-mistral-right-hand-model-boundary.mjs; the API build invokes it. The regression suite is artifacts/api-server/src/src/lib/mistral-right-hand.test.ts.

No live Mistral generation or canonical Atlas run is performed automatically by this migration.