## 2026-11-07 registry seed integration (pending merge and operator import)

A versioned BRREG snapshot is being added to the canonical BigContacts repository: 5,572 screened active Norwegian AS company records, 336 managing-director role records linked to 330 organizations, and one unresolved Virtual Globetrotting visual asset lead. Company email/phone fields are organization-scoped only; managing directors remain review-only `PersonCandidate` records with no personal contact or wealth claim. Import is explicit via `POST /api/ingest/brreg-snapshot`; no startup auto-import or automatic research queue is added. See [REGISTRY_SEED_IMPORT.md](./REGISTRY_SEED_IMPORT.md).

The existing official FAA importer remains the aviation source path at `POST /api/ingest/faa`. Its registry entities/assets keep ownership unresolved, and the current patch removes personal mailing addresses and additional co-registrant names from persisted metadata. This is code-level behavior pending CI/merge, not a claim that the live Replit database has been seeded.

# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-10-30<br>
> **Canonical branch:** `main`<br>
> **Status:** model-led ReAct control loop demonstrated in live execution; end-to-end research/card creation is not yet live-accepted.

> **Current source/UI audit — 2026-10-30:** The current UI manual, System Status page, Data Sources specialist-worker panel, Replit preflight, and profile research-launch control are being brought into alignment with the canonical Groq architecture and actual API status contracts. The patch also removes retired provider arrays from the system-status snapshot and adds tests for conditional attested-worker exposure. Treat these changes as pending until GitHub confirms their PR is merged to `main`; do not use a feature branch as the Replit import source.
>
> **Latest known live-run evidence:** [2026-10-27 audit](../audits/apex-atlas-live-run-sequential-audit-2026-10-27.md). Its final captured checkpoint did not terminally reconcile the most recent job. Historical job IDs do not establish the current Replit active-job state. No Replit workspace/deployed SHA or active-job pointer has been verified by this GitHub-only work.
>
> **Python OSINT worker truth:** Holehe, Maigret, Sherlock, theHarvester, and SpiderFoot are worker-backed capabilities. The Investigator sees each exact action only after a fresh signed worker attestation, independently pinned immutable worker/proxy image digests, and isolated egress proof pass. Repository CI builds/tests images; it does not deploy or attest a live worker. Never bypass this gate or call an unavailable tool a no-hit.

> **Audit trace boundary (corrected 2026-10-25):** Both Replit development configurations enable model-visible request/response capture to .local/audits/APEX_ATLAS_MODEL_AUDIT_2026-10-25_REPLIT_RUN_01.md. Explicit contact-data capture is true for this private local trace only, so source-published professional email addresses and phone numbers remain available for attribution and pipeline-quality analysis. The .local directory is git-ignored; the audit writer refuses tracked raw-prompt destinations and always redacts credentials and secret-shaped values. Test prompt capture and visible/tracked-file opt-in remain false. The public tracked audits/*.md report must contain a sanitized chronology and source references, never raw contact values or a copy of the private trace. Provider-hidden chain-of-thought is never logged; visible prompts, completions, structured action rationale, tool calls, and job/case/run IDs are auditable.

> **Historical note — 2026-10-19:** The P018 report named in the earlier import audit had an incomplete runtime checkpoint; its unknown-state warning was later superseded by the reconciliations summarized above. Preserve the distinction between model-visible prompts, observed output, search leads, fetched evidence, admissions, and durable cards.

> **Run 04:** [full append-only audit](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_04.md). The first workflow restart timed out before boot, but a later restart succeeded and the dashboard launch ran. Run 04 terminal state: failed/incomplete at 20 Investigator iterations, zero findings/admissions/cards.
> **Run 05:** [separate reconstructed audit](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_05.md). Job `4b85fc7c-a239-478c-a455-94baf02ffdee`; 30 Investigator turns in the available trace, no candidate/card evidenced, terminal state and final database counts unverified after Replit credits ran out.
> **Run 06 (17 October):** [sanitized code/audit review](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_LIVE_RUN_06_REVIEW.md). Job `4903869d-4d4e-43e6-aca5-54f360234bd8` failed/incomplete at the 20-iteration ceiling with zero admissions/cards. Confirmed issues were false-positive scope blocks, missing geographic/local-language aliases, and a broken OffeneRegister adapter. A raw prompt trace had been committed with contact-data capture enabled; the raw trace is removed from the current tree, but deletion does not purge earlier Git history. New raw audit output is configured to the ignored `private-audits/` path.
> **Current verified status:** [CURRENT_STATUS_2026-10-15.md](CURRENT_STATUS_2026-10-15.md). Always re-check actual `main`, the newest audit, Actions and durable run state before acting.

## 0. Current empirical status

The live records confirm that Boss directs, Right-hand reviews, and the selected Investigator makes model-owned action and pivot decisions. The runtime actually executed accepted web actions and blocked unauthorized or out-of-scope proposals without outbound requests. This is evidence the architecture's live control loop runs; it is not evidence that the whole bureau is productive or accepted.

The live records show two distinct outcomes that must not be conflated. The 2026-10-27 audit demonstrated that exact source-backed organization leads can become durable review-only company cards during terminal reconciliation, even when the overall job ends failed/incomplete. Other attempts in that same audit failed before executing a search because provider capacity was unavailable, so no card was possible from those runs. This is not proof that every run will find a person or HNWI, and it does not justify weakening the person/wealth evidence gates. Continue to distinguish execution failure, search leads, observed sources, review-only cards, candidate admission, and UI projection.

Historical CI snapshot: SHA `4c09192d0b747635ad7fa830018d1e3d7831f47f` passed the five release workflows at that time. It is superseded by subsequent main changes; verify the exact current `main` SHA and Actions before every readiness claim.

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

The runtime registry exposes up to eight separately selectable Groq Investigator credential capabilities, plus the model-scoped `groq-investigator-20b` fallback:

| Capability | Credential |
|---|---|
| `groq-investigator-1` | `GROQ_INVESTIGATOR_API_KEY` |
| `groq-investigator-2` | `GROQ_INVESTIGATOR_API_KEY_1` |
| `groq-investigator-3` | `GROQ_INVESTIGATOR_API_KEY_2` |
| `groq-investigator-4` | `GROQ_INVESTIGATOR_API_KEY_3` |
| `groq-investigator-5` | `GROQ_INVESTIGATOR_API_KEY_4` |
| `groq-investigator-6` | `GROQ_INVESTIGATOR_API_KEY_5` |
| `groq-investigator-7` | `GROQ_INVESTIGATOR_API_KEY_6` |
| `groq-investigator-8` | `GROQ_INVESTIGATOR_API_KEY_7` |

Only configured capabilities are advertised. Selecting one capability never authorizes silent rotation to another Investigator credential. Provider/model retries remain bounded and within the selected role/capability boundary.

Current Groq model routes are Qwen 3.8 27B, GPT-OSS 20B, and GPT-OSS 120B. Cognitive-task routing is downstream of capability selection.

Provider recovery remains typed and bounded. A hard-quota reassignment requires the explicit `upstream_quota_exhausted` classification. Repeated `upstream_token_window_wait_exceeded` episodes after the bounded same-capability retries are tracked by a separate consecutive counter; after two consecutive token-window failures for the same selected capability, the runtime may request one durable Groq Boss-directed reassignment to a distinct configured Investigator capability. This is not hard-quota exhaustion and never authorizes manual or silent credential rotation. An episode that completed a successful research action before a later provider error resets the generic provider-unavailable streak, but it must not suppress the independent token-window threshold. If no viable replacement exists or the one permitted capacity reassignment has already been used, the case is parked for review. Invalid structured output, ordinary tool failures, and non-token provider errors do not count as token-window capacity failures.

## 4. Evidence law

Search results and snippets are **leads, not claim-grade evidence**.

A claim-grade finding requires, as applicable:

- a source URL actually observed by a non-search retrieval capability;
- exact source-span grounding;
- candidate identity attribution;
- source/provenance persistence;
- deterministic scope and identity validation;
- immutable event anchoring before card promotion.

Canonical discovery hands off a review-only lead when the Investigator explicitly promotes an exact named person and at least one successfully fetched, non-aggregator claim-grade source binds the full name and stated role within a bounded span, with an ownership/control/equity/investment clue supported by fetched page text. Search results and snippets alone cannot admit a lead. Copied text and duplicate publisher roots do not create independent corroboration. This first-source threshold is deliberately a review handoff, not a claim that wealth or identity is fully verified: target-scoped research must independently corroborate or falsify identity/ownership, test business/asset/exit materiality, consider counter-evidence, and verify a realistic public/professional/intermediary approach route before any wealth/contact conclusion. Additional independent sources are valuable research evidence but are not silently substituted for the later target-stage checks.

Split-source attribution may remain useful research context, but it does not by itself authorize a personal contact field. Trusted candidate-contact promotion requires at least one successful claim-grade observation that explicitly co-binds the exact person identity and exact contact value; additional independent sources may corroborate that same person-value claim.

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

Run 04 and Run 05 chronology is summarized at the top of this document and in [CURRENT_STATUS_2026-10-15.md](CURRENT_STATUS_2026-10-15.md). Run 04 was eventually launched after a successful workflow restart and terminated incomplete at 20 Investigator iterations with no admissions/cards. Run 05 did execute but its terminal state/final durable counts are not available in the captured audit. Resolve that job state before another launch; do not repeat the earlier compute-restart remedy unless fresh health/boot evidence shows a platform boot failure.

The repository must not claim live provider success, production readiness, or research quality from static tests alone. A controlled live run requires the canonical environment, initialized durable schema, healthy runtime, actual provider execution, and persisted evidence.

## 10. Active provider secret contract

The Replit preflight is presence-only; it never prints secret values and cannot establish provider validity, reachability, or quota.

The canonical Replit development workflow requires:
- `GROQ_BOSS_API_KEY`
- `GROQ_RIGHT_HAND_API_KEY`
- `GROQ_INVESTIGATOR_API_KEY`
- `REDIS_URL_1` (canonical durable store)
- At least one of `SERPER_API_KEY`, `TAVILY_API_KEY`, or `EXA_API_KEY`

Optional capability credentials include `COMPANIES_HOUSE_API_KEY`, `GROQ_INVESTIGATOR_API_KEY_1`, `SCRAPFLY_API_KEY`, and `ZENROWS_API_KEY`. Additional numbered Groq role slots may be configured independently. Missing optional credentials disable only their corresponding capabilities; the Investigator must not silently rotate away from a Boss-selected credential.

The Investigator registry maps `groq-investigator-1` to `GROQ_INVESTIGATOR_API_KEY`, `groq-investigator-2` to `GROQ_INVESTIGATOR_API_KEY_1`, continuing through `groq-investigator-8` to `GROQ_INVESTIGATOR_API_KEY_7`. The model-scoped `groq-investigator-20b` recovery capability uses the base Investigator credential; it is not an additional credential slot.

`HF_TOKEN` and `SERPAPI_KEY` are not active required capabilities. OpenCorporates is optional and credential-gated: expose it only when `OPENCORPORATES_API_TOKEN` or `OPENCORPORATES_API_KEY` is configured; its documented authentication uses `api_token`. Neither optional OpenCorporates key belongs in mandatory Replit preflight.

`DATABASE_URL` is supplied by Postgres/platform infrastructure and must not be requested from the operator. Never request or print GitHub credentials, retired Gemini/Mistral/DeepSeek/NVIDIA control-plane credentials, WHOIS/WHOXY credentials, or secret values in chat.

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


## 15. Operator authentication — development bypass, production enforcement

The active API route aggregator mounts `operatorAuthRouter` and `requireOperatorAuth`. The middleware bypasses app-level operator authentication only when the server-side `NODE_ENV` is exactly `development`.

The root `.replit` configuration sets `NODE_ENV=development` under `[userenv.development]`, so the normal Replit Project development workflow does not require operator-auth secrets. This bypass is limited to the development runtime; keep its endpoint private.

For production or any non-development runtime, operator authentication is enabled and fails closed. The matching Replit preflight requires:
- `APEX_OPERATOR_PASSWORD` — at least 16 characters;
- `APEX_API_AUTH_TOKEN` — at least 32 characters;
- `APEX_SESSION_SECRET` — at least 32 characters.

The middleware protects data and operational routes; if its configuration is missing, those routes return an auth-not-configured response. Do not describe operator authentication as globally disabled or remove the production preflight requirement.

This mode-specific auth behavior does not alter the canonical research workflow, provider-role/quota behavior, active-job lock, identity, source provenance, evidence/admission, cancellation, or durable persistence guards.