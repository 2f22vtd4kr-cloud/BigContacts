# Apex Atlas — Groq Boss migration

**Status:** implemented on `main`; Gemini remains the independent Right-hand advisor.

## Control-plane role split

- **Boss:** Groq `openai/gpt-oss-120b`, with bounded fallback `openai/gpt-oss-20b`.
- **Right-hand:** existing Gemini Right-hand implementation remains unchanged.
- **Investigator:** existing Groq/Mistral research lanes remain model-owned and tool-capable.
- The Boss has no web-search grounding and does not perform Investigator work. It only frames/reviews the case, selects an available Investigator capability, and issues bounded control decisions.

## Why this model

Groq currently documents GPT-OSS 120B as supporting reasoning, JSON Object/JSON Schema output, and tool use. Its current Free Plan limits list 30 RPM, 1K RPD, 8K TPM, and 200K TPD for both GPT-OSS 120B and 20B. The implementation therefore treats token budget as a first-class control-plane constraint rather than assuming the 131K model context can be filled.

## Transport contract

`artifacts/api-server/src/src/lib/groq-boss.ts` uses Groq's OpenAI-compatible Chat Completions endpoint:

`https://api.groq.com/openai/v1/chat/completions`

Authentication is `Authorization: Bearer $GROQ_BOSS_API_KEY`; numbered Boss credential slots are `GROQ_BOSS_API_KEY_1` through `GROQ_BOSS_API_KEY_10`. The generic `GROQ_API_KEY` namespace remains reserved for Investigator use.

The Boss:
- accepts only already-compacted Boss prompts up to 20,000 characters by default; oversized prompts fail closed so durable evidence is never arbitrarily discarded;
- maps the former Gemini `minimal` setting to GPT-OSS `low`;
- uses `reasoning_effort` (`low|medium|high`);
- sets `include_reasoning=false`;
- converts the existing Boss control schemas to Groq strict JSON Schema;
- retries one HTTP 503 on the same model;
- retries a 429 only when the provider supplies a short (<=2.5s) retry window;
- otherwise advances/fails closed rather than burning the Atlas control-plane budget;
- tries at most two models per credential: 120B then 20B.

No Groq key is stored in Git.

## Readiness and status

`GET /api/system/status` is ordinary local/cached telemetry and does not call Groq.

The explicit diagnostic `POST /api/system/diagnostics/groq-readiness` performs a live Groq model-catalog check. It is intentionally separate from normal status and from the canonical Atlas launch.

## Verification requirements

Before a live Atlas run:
1. run the Groq Boss unit/contract suite;
2. run the Groq Boss model-boundary static gate;
3. typecheck/build;
4. if the operator explicitly authorizes it, run the explicit Groq readiness diagnostic once;
5. only then authorize a canonical Atlas run.

A 200/ready catalog response proves model discovery/authentication only. It does **not** prove a full Atlas run succeeds.

## Provider boundary

The compatibility exports in `case-bureau.ts` retain the existing call graph names so the Bureau does not need a broad unsafe rewrite. Their implementation delegates to `groq-boss.ts`. Persisted Boss plan provider semantics are now `groq`.

Gemini remains present because it is still the Right-hand provider; removing Gemini entirely would violate the intended independent-oversight architecture.