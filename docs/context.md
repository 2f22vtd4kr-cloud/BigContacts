# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-10-09  
> **Canonical branch:** `main`  
> **Status:** active architecture handoff; static correctness is not production/live-research certification.

## 1. Current architecture

Apex Atlas is an AI-powered public-web research bureau, not a deterministic enrichment workflow.

```
CASE / OBJECTIVE
    ↓
Groq Boss
    ↓
runtime Investigator capability selection
    ↓
selected Groq Investigator capability
    ↓
model-owned multi-step ReAct research
    ↓
actual tool/capability execution
    ↓
immutable observations + provenance
    ↓
evidence / hypotheses / contradictions / contacts
    ↺ Groq Right-hand review ↺ Groq Boss disposition
    ↓
deterministic terminal/admission/lifecycle rails
    ↓
durable case + UI projection
```

**Core law:** the model owns research strategy; deterministic code owns safety, authorization, provenance, identity, persistence, cancellation, resource budgets, and terminal/admission integrity.

There is no hidden identity → organization → contact recipe. Search, page retrieval, browser escalation, registries, domain inspection, footprint tools, disproof, revisits, and stopping are capabilities the Investigator may choose based on evidence and information gain.

## 2. AI role law

### Groq Boss

Groq Boss owns case direction, assignment, Investigator capability selection, continuation disposition, and high-level review. It does not browse and does not become the Investigator.

### Groq Right-hand

Groq Right-hand is an independent bounded oversight invocation. It critiques completed Investigator work, evidence gaps, contradictions, and the next research objective. It does not browse, select tools, or invent evidence.

### Investigator

The canonical Investigator adapter is Groq. The selected Investigator capability owns the research trajectory. Cognitive model routing happens inside that capability and does not select another credential or determine the research strategy.

Gemini, Mistral, and DeepSeek/NVIDIA control/Investigator transports are retired from the canonical path and must not be advertised as active capabilities unless a real adapter, availability contract, tests, and canonical integration are implemented.

## 3. Investigator capability and credential law

The runtime registry exposes up to six separately selectable Groq Investigator capabilities:

| Capability | Credential |
|---|---|
| `groq-investigator-1` | `GROQ_INVESTIGATOR_API_KEY` |
| `groq-investigator-2` | `GROQ_INVESTIGATOR_API_KEY_1` |
| `groq-investigator-3` | `GROQ_INVESTIGATOR_API_KEY_2` |
| `groq-investigator-4` | `GROQ_INVESTIGATOR_API_KEY_3` |
| `groq-investigator-5` | `GROQ_INVESTIGATOR_API_KEY_4` |
| `groq-investigator-6` | `GROQ_INVESTIGATOR_API_KEY_5` |

Only configured capabilities are advertised. Selecting one capability never authorizes silent rotation to another Investigator credential. Provider/model retries remain bounded and within the selected role/capability boundary.

Current Groq model routes are Qwen 3.8 27B, GPT-OSS 20B, and GPT-OSS 120B. Cognitive-task routing is downstream of capability selection.

## 4. Evidence law

Search results and snippets are **leads, not claim-grade evidence**.

A claim-grade finding requires, as applicable:

- a source URL actually observed by a non-search retrieval capability;
- exact source-span grounding;
- candidate identity attribution;
- source/provenance persistence;
- deterministic scope and identity validation;
- immutable event anchoring before card promotion.

Multi-source attribution is valid: identity may be established on one retrieved source and a contact value on another, provided both are explicitly cited and grounded.

No model assertion, search snippet, copied directory entry, guessed email pattern, or synthetic URL is proof by itself.

## 5. Research budgets and lifecycle

Hard safety ceilings remain bounded, including:

- Investigator iteration ceiling: 64;
- bounded observation and trajectory sizes;
- bounded provider/model request windows;
- global Atlas deadline;
- target Investigator acts charged against the parent Atlas Investigator budget;
- cancellation and job-lifecycle fences;
- transactional/idempotent oversight and observation events;
- fail-closed terminal handling.

A resource-limited, unavailable, cancelled, or provider-failed run cannot become a successful terminal merely because the model stopped.

## 6. Durable control loop

Every target act follows:

```
selected Investigator capability
  → model-owned act
  → actual tool execution
  → immutable observation
  → evidence/state update
  → Groq Right-hand
  → Groq Boss
  → continue / redirect / stop
```

Right-hand/Boss control decisions are durable and bound to the exact case, execution run, and control turn. A stale or mismatched control decision cannot steer a later act.

## 7. Context and compaction

Working context may be bounded for provider safety, but durable observations remain in the event ledger.

Evidence graphs use complete per-source records rather than synthesized/truncated act summaries. Model-facing summaries may be compacted; they must not silently become the epistemic source of truth.

## 8. Source independence and cognition

Apex distinguishes source families/classes and copied/aggregated material. Repeated source families are saturation signals, not independent corroboration.

The cognitive intelligence layer may use structured hypotheses, contradictions, source diversity, negative findings, action yield, and research questions to help the Investigator choose its next move. Search-result observations do not count as claim-grade evidence or hypothesis support.

## 9. Runtime/deployment truth

Canonical API boundary:

- API: port 8080
- desk: `/`
- API: `/api/`
- startup: `bash scripts/replit-boot.sh`

First-time schema initialization is explicit:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Schema mutation must not remain enabled during ordinary boot.

The repository must not claim live provider success, production readiness, or research quality from static tests alone. A controlled live run requires the canonical environment, initialized durable schema, healthy runtime, actual provider execution, and persisted evidence.

## 10. Active provider secret contract

The active preflight contract currently checks these 13 provider/integration names:

```
COMPANIES_HOUSE_API_KEY
EXA_API_KEY
GROQ_BOSS_API_KEY
GROQ_RIGHT_HAND_API_KEY
GROQ_INVESTIGATOR_API_KEY
HF_TOKEN
GROQ_INVESTIGATOR_API_KEY_1
REDIS_URL_1
SCRAPFLY_API_KEY
SERPAPI_KEY
SERPER_API_KEY
TAVILY_API_KEY
ZENROWS_API_KEY
```

Additional role-scoped Groq Boss, Right-hand, and Investigator suffix slots may be configured and are handled by their runtime registries. They are separate capabilities/credentials, not aliases for the base key.

Never request or print GitHub credentials, `DATABASE_URL`, retired Gemini/Mistral/DeepSeek control-plane credentials, WHOIS/WHOXY credentials, or secret values in chat.

## 11. Research-quality program

The Research Gauntlet is the empirical quality program. It measures identity precision/recall, contact attribution, claim support, unsupported claims, contradictions, source quality, negative findings, useful pivots, unnecessary calls, trajectory cost, and system failures separately.

Unknown/insufficient evidence is a valid outcome. Do not collapse research quality into a single smartness score.

Static architecture gates are necessary but do not establish empirical research superiority.

## 12. Release gate

Before production publication:

1. current `main` passes the required architecture/type/build/test gates;
2. schema initializes explicitly and normal boot runs with mutation disabled;
3. canonical API boots and health is verified;
4. Groq Boss and Groq Right-hand execute with role-scoped credentials;
5. a real Boss-selected Investigator capability executes a controlled research trajectory;
6. observations, provenance, evidence graphs, contacts, failures, and oversight persist durably;
7. controlled provider/tool/timeout/cancellation failures remain truthful;
8. UI renders canonical durable state rather than synthetic activity;
9. empirical Gauntlet/campaign evidence is collected and reported separately from structural correctness.

Until those gates are met, describe the system as architecturally reviewed rather than production-certified.

## 13. Security hardening note — 2026-10-09

The SSRF-safe fetch boundary checks parsed IP literals and DNS answers before pinning a request to the chosen resolved address. IPv4-mapped IPv6 destinations are evaluated against their embedded IPv4 address; non-global, transition and special-purpose ranges are rejected. Regression coverage now includes IPv6 documentation space and `5f00::/16` SRv6 SID space. This is a source-level safeguard, not proof of every third-party browser proxy's egress policy, a production network, or live Replit acceptance.

## 14. Historical material

Older provider-specific incidents and migration notes remain in repository history and archived documents. They are historical evidence only. They must not override this current section or reintroduce retired control-plane providers.


## 15. Operator authentication — disabled for current Replit deployment

Effective 2026-10-10, app-level operator sign-in and bearer-token authentication are intentionally disabled at the user's direction so autonomous Replit launches can reach discovery without a separate login/session/token step.

- The React desk mounts the product router directly.
- The active API route aggregator does not mount operator-auth routes or `requireOperatorAuth` middleware.
- Replit preflight checks active provider/integration secrets only; it does not require operator password, API bearer-token, or session-secret controls.
- Older operator-auth implementation files may remain in the repository but are not mounted in the active route/UI path.

This is an explicit deployment choice, not a claim that the API is protected: anyone who can reach the deployment URL can call operational endpoints. Do not expose this deployment to an untrusted public audience.

This change does not relax the canonical research workflow, provider-role/quota behavior, active-job lock, identity, source provenance, evidence/admission, cancellation, or durable persistence guards.
