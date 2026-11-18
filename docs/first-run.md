# Apex Atlas first run

This is the operator sheet for one real, one-target run. It does not authorize bypassing operator authentication or changing credentials.

## Environment

Set these in the API server environment before launching:

| Variable | Recommended value | Purpose |
|---|---:|---|
| `APEX_GROQ_TPM_BUDGET` | `7000` | Local per-minute reservation ceiling only. Groq rate-limit response headers are observed and used to reconcile the provider's actual remaining-token window; this is not a claim that the provider grants 7,000 TPM. |
| `APEX_GROQ_DAILY_TOKEN_BUDGET_120B` | `180000` | Daily ceiling for GPT-OSS 120B. |
| `APEX_GROQ_DAILY_TOKEN_BUDGET_20B` | `180000` | Separate daily ceiling for GPT-OSS 20B. |

The two daily budgets are model-scoped, not one shared bucket. The durable `agentic_llm_daily_usage` ledger is keyed by UTC date, provider and canonical model.

### Investigator routing

- Set `APEX_ENABLE_GROQ_INVESTIGATOR_20B=true` to make the explicit `groq-investigator-20b` capability available to Boss.
- The opening Boss prompt already prefers `groq-investigator-20b` for routine discovery/action selection. Boss still makes the capability choice; the runtime does not silently rotate models.
- The explicit `groq-investigator-20b` capability is pinned to `openai/gpt-oss-20b`.
- Standard `groq-investigator-N` capabilities use `GROQ_AGENTIC_MODEL`, then `GROQ_MODEL`, then `GROQ_CHAT_MODEL`, then the default `openai/gpt-oss-120b`. To explicitly route standard Investigator capabilities to 20B, set `GROQ_AGENTIC_MODEL=openai/gpt-oss-20b`. This is an operator model override; it does not change the capability ID stored in the case.

### Boss, Right-hand and final review

- Groq Boss defaults to `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as its code-defined fallback.
- Groq Right-hand defaults to `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as its code-defined fallback.
- Final target review calls Groq Boss first and Groq Right-hand as its fallback. The `resolveGeminiBossModel` name is a compatibility alias; this path is Groq, not Gemini.
- There is currently **no environment variable that overrides the Boss or Right-hand model IDs**. Their environment variables configure credentials, not model routing: `GROQ_BOSS_API_KEY` (plus `GROQ_BOSS_API_KEY_1` through `_10`) and `GROQ_RIGHT_HAND_API_KEY` (plus `GROQ_RIGHT_HAND_API_KEY_1` through `_5`). Investigator credentials are `GROQ_INVESTIGATOR_API_KEY` (plus `GROQ_INVESTIGATOR_API_KEY_1` through `_7`).

Do not set an invented `GROQ_BOSS_MODEL` or `GROQ_RIGHT_HAND_MODEL`; those are not runtime overrides in the current code.

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

- **Generic-inbox and placeholder lists in `ai-extractor.ts`: CONVERT.** Keep syntax validation and any explicitly non-authoritative warning, but do not let local-part heuristics decide person-specific meaning or veto a valid model-attributed finding. The model owns attribution; runtime verifies the cited quote and contact syntax.
- **Hand-set evidence weights in `research-intelligence-engine.ts`: CONVERT.** Preserve observable provenance facts (source URL/class, independence, observed span and chronology), but treat hand-set weights as advisory context for model review, not deterministic relevance, admission, falsification or promotion authority.

No dead-code cleanup is included. These judgments are recorded for a later, separately reviewed change.
