# Apex Atlas first run

This is the operator sheet for one real, one-target run. It does not authorize bypassing operator authentication or changing credentials.

## Environment

Set these in the API server environment before launching:

| Variable | Recommended value | Purpose |
|---|---:|---|
| `APEX_GROQ_TPM_BUDGET` | `7000` | Local per-minute reservation ceiling only. Groq rate-limit response headers are observed and used to reconcile the provider's actual remaining-token window; this is not a claim that the provider grants 7,000 TPM. |
| `APEX_GROQ_DAILY_TOKEN_BUDGET_120B` | `180000` | Daily ceiling for GPT-OSS 120B. |
| `APEX_GROQ_DAILY_TOKEN_BUDGET_20B` | `180000` | Separate daily ceiling for GPT-OSS 20B. |
| `APEX_ENABLE_GROQ_INVESTIGATOR_20B` | `true` | Enable the explicit 20B Investigator capability for Boss selection. |
| `GROQ_AGENTIC_MODEL` | `openai/gpt-oss-20b` | Recommended first-run override: route standard Investigator capabilities to 20B as well. |

The two daily budgets are model-scoped, not one shared bucket. The durable `agentic_llm_daily_usage` ledger is keyed by UTC date, provider and canonical model.

### Investigator routing

- For the recommended first run, set both `APEX_ENABLE_GROQ_INVESTIGATOR_20B=true` and `GROQ_AGENTIC_MODEL=openai/gpt-oss-20b`.
- The first setting makes the explicit `groq-investigator-20b` capability available to Boss; the opening Boss prompt prefers that capability for routine discovery/action selection. Boss still makes the capability choice.
- The explicit `groq-investigator-20b` capability is pinned to `openai/gpt-oss-20b`. The second setting also routes standard `groq-investigator-N` capabilities to 20B if Boss chooses one of those IDs; it does not change the capability ID stored in the case.
- Without `GROQ_AGENTIC_MODEL`, standard capabilities use `GROQ_MODEL`, then `GROQ_CHAT_MODEL`, then the default `openai/gpt-oss-120b`.

### Boss, Right-hand and final review

- Groq Boss defaults to `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as its code-defined fallback.
- Groq Right-hand defaults to `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as its code-defined fallback.
- Per-act target control review calls Groq Right-hand first for advisory, then Groq Boss for the continue/redirect/stop decision. Both default to `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as their code-defined fallback. The Boss is the final control decision-maker; there is no separate final-review model ID.
- The `resolveGeminiBossModel` name is a compatibility alias; this path is Groq, not Gemini.
- There is currently **no environment variable that overrides the Boss or Right-hand model IDs**. Their environment variables configure credentials, not model routing: `GROQ_BOSS_API_KEY` (plus `GROQ_BOSS_API_KEY_1` through `_10`) and `GROQ_RIGHT_HAND_API_KEY` (plus `GROQ_RIGHT_HAND_API_KEY_1` through `_5`). Investigator credentials are `GROQ_INVESTIGATOR_API_KEY` (plus `GROQ_INVESTIGATOR_API_KEY_1` through `_7`).

Do not set an invented `GROQ_BOSS_MODEL` or `GROQ_RIGHT_HAND_MODEL`; those are not runtime overrides in the current code.

## Context compaction and model budgets

- Ordinary context below 14,000 characters and all latest-observation compaction use deterministic, URL-safe projections; the full observations and evidence remain durable. The 6,300–8,800-character segments in the 18 November audit therefore require **zero AI compaction calls**.
- Only genuinely long historical memory between 14,000 and 16,000 characters may use one AI compaction request per Investigator/control turn. Identical job content is cached by SHA-256 together with its fetched-source authority; a second distinct compaction request in the same turn falls back to deterministic projection. Empty or invalid responses do not trigger repair/retry loops.
- Audit replay estimate: the repeated 8,194-, 8,752- and 6,336-character segments now produce **0 compaction model calls across five turns**. The old run spent 39,383 reported tokens on 15 compaction calls across five Investigator calls (about 7,877 compaction tokens per Investigator call); the new path spends 0 separate compaction-provider tokens on those segment sizes. The combined 23,282 raw characters are about 6,848 tokens at the rough 3.4-characters/token estimate; deterministic projection still contributes to the normal Investigator/oversight prompt, so this is not a claim that all prompt tokens disappear.
- Production compaction uses the Right-hand GPT-OSS 120B model bucket, not the Investigator GPT-OSS 20B bucket. The 120B daily model budget is shared by the Boss/Right-hand roles; there is no separate cheap compaction model bucket configured. No new provider or model was added.

## Open-ended discovery objective and source mix

Keep the default evidence-led objective unless the human has a genuine case-specific constraint to add. It is intentionally open across sectors, countries, people, organizations and assets. Do not narrow it to one sector or country merely to make the first run easier to measure.

`targetCount: 1` is an operator spending ceiling for the number of target investigations, not a discovery filter or a one-sector/one-country instruction. The Investigator should form a concrete, falsifiable hypothesis from the objective and evidence, then choose whether public-web search, one or more enabled registries, or both offer the best information gain. The available registry catalog is randomized at runtime; the model chooses which adapters and queries are relevant. There is no mandatory mixed-source first pass, fixed order, registry sweep, or preferred geography.

Avoid turning generic labels such as “potential investors” or “high-net-worth individuals” into broad glossary searches. The model should develop a concrete hypothesis about a person, organization, asset, ownership/control relationship, activity or public route. Different runs may legitimately investigate entirely different domains and jurisdictions. Search results and registry hits remain leads until fetched and interpreted.

The operator objective has its own 1,600-character limit. Historical discovery context retains its separate 1,200-character limit; do not conflate the two.

## Launch: one target, at most three Boss control turns

1. Set `APEX_ATLAS_MAX_CONTROL_TURNS=3` in the API server environment. This existing ceiling limits post-discovery Boss control turns; it is not a cap on total Investigator actions or provider calls.
2. Open the deployed Apex Atlas UI, select **Standard** research depth, and click **Launch Apex Atlas**.
3. The UI launch helper submits `targetCount: 1`, `researchDepth: "standard"` and `targetTimeoutMs: 420000` to `POST /api/ingest/atlas-run`. The canonical server default is also `targetCount: 1`.

Use the normal authenticated UI path. Do not use mock mode, the smoke launch, legacy auto-pipeline routes, or an unauthenticated substitute.

## Post-run checks, in order

1. **Structured output:** there must be no `json_validate_failed` for the run. Check the `apex_agentic_llm_attempt` structured log events and `agentic_llm_daily_usage.lastProviderErrorCode`.
2. **Actual research:** confirm at least one successful `tool_observation` for `web_search`, `registry_search`, `visit` or `browser_fetch`. Search-result snippets alone are not fetched-page evidence.
3. **Usage ledger:** in `agentic_llm_daily_usage`, confirm a row for each distinct model used on the run's UTC date (provider + canonical model). Check request counts, estimated/actual tokens, daily budget and last status. A single model row can aggregate multiple roles.
4. **Prompt measurements:** in the per-attempt `apex_agentic_llm_attempt` logs, inspect `role`, `model`, `originalPromptChars`, `promptReductionChars` and `estimatedPromptTokens` for Investigator (`investigator`), Boss (`boss`) and Right-hand (`right_hand`). `estimatedPromptTokens` is a character-based estimate, not provider-reported token usage. These prompt-character fields are in per-attempt logs; the daily aggregate table does not store them.
5. **Final outcome:** inspect the job's final `result.terminal` snapshot and the target/discovery case's `status` and `currentAction`:
   - **Contact found:** `terminal.explicitCardPromotions > 0`.
   - **Lead in review:** `terminal.admittedTargetCount > 0` but no explicit card promotion; the candidate remains review-only.
   - **Inconclusive:** `terminal.evidenceBackedTerminal === false` or `terminal.caseAction === "canonical-evidence-terminal-incomplete"`.
   - **Operator cap reached:** `terminal.operatorTargetSpendingCapReached === true` and `terminal.caseAction === "canonical-operator-target-spending-cap"`.

The immutable `control_decision` event records the Boss action; `observation` events record admission and advisory observations; `tool_observation` events record actual tool observations. The final terminal snapshot itself is stored in the job result and reflected in the case's `currentAction`; the current code does not write a separate terminal event.

## What a failure looks like

| Symptom | Likely layer | Where to look |
|---|---|---|
| `json_validate_failed`, no usable Investigator action | Provider / response contract | `apex_agentic_llm_attempt` (`role`, `model`, `providerErrorCode`, `reason`); the Investigator response parser and structured-output request in `agentic-web-research-core.ts`. |
| No successful search or fetch observation | Gate or Investigator action selection | `tool_observation` events and the Investigator attempt log; check whether a provider/gate error occurred before a tool was dispatched, or whether the model chose a terminal action without researching. |
| TPM 429, local token-window wait or blocked request | Provider gate | `provider-gate.ts`; `rateLimitRemainingTokens`, reset fields and provider status in `apex_agentic_llm_attempt` / `agentic_llm_daily_usage`. Distinguish a short-window TPM limit from a daily TPD limit. |
| Daily token budget exhausted before egress | Gate / usage ledger | `agentic_llm_daily_usage` reservation and budget fields; `APEX_GROQ_DAILY_TOKEN_BUDGET_120B` or `_20B`; the attempt's `daily_token_budget_exhausted` status. |
| A name/source appears in research, but no candidate is admitted | Admission | The `observation` event with summary `Canonical discovery admission`, its `admittedCandidates` payload, and the surrounding `control_decision` event. Admission is an explicit model-owned decision, not a consequence of search-result count. |
| A contact is not promoted despite source-backed evidence | Terminal gate / persistence | Target `tool_observation` and claim evidence; `bureau-contact-persist-strict.ts` checks exact quote, same-observation person/value binding, non-aggregator support, identity and immutable promotion provenance. Inspect contact-evidence metadata and `entities.agenticContactProvenance`. |
| A usage row is missing or daily ledger persistence warns | Persistence | `apex_agentic_llm_daily_usage_persist_failed` log event, `DATABASE_URL`, and `agentic_llm_daily_usage`. Provider attempts are logged separately from durable daily aggregation. |
| Run ends at the operator target-investigation cap | Terminal gate / operator budget | Job `result.terminal.operatorTargetSpendingCapReached`, `caseAction` and the case's `currentAction`; this is a spending cap, not a relevance filter. |

## Outstanding scripted judgments (not changed in this PR)

- **Generic-inbox and placeholder lists in `ai-extractor.ts`: legacy-path follow-up, not a canonical-launch gate.** The canonical Atlas Investigator does not use this extractor for target-contact promotion; its card path uses model attribution plus same-observation quote verification. Do not treat the legacy local-part heuristic as person-specific meaning or as authority to promote a contact.
- **Hand-set evidence weights in `research-intelligence-engine.ts`: advisory only.** Observable provenance facts remain available; the Investigator system contract now explicitly states that deterministic weights, rankings, hypothesis statuses and suggested falsification/stopping assessments cannot decide relevance, admission, falsification requirements, attribution, promotion or stopping.

No dead-code cleanup is included. These judgments are recorded for a later, separately reviewed change.
