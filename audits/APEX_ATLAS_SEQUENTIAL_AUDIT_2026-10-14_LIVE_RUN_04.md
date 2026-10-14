# Apex Atlas sequential audit — live run 04

- Started: 2026-10-14
- Status: **PREPARATION ONLY — awaiting an approved public organization; no research run has been launched**
- Scope: trace setup, canonical launch, discovery, research, model handoffs, external tools, durable evidence/admissions, and card creation through terminal outcome.
- This file is intentionally stored in `audits/` so it remains visible in the project and is not covered by the `/private-audits/` ignore rule.

## Audit boundaries

This audit records observable application behavior: model request inputs captured by the app's prompt-audit hook, model/provider identifiers where available, structured model outputs and decisions exposed by the application, inter-agent handoff records, search queries, tool names and results, source URLs, errors, state transitions, and before/after ledger counts.

It cannot provide private hidden chain-of-thought. Provider requests disable reasoning output (`include_reasoning: false`); this audit will not attempt to recover or infer hidden reasoning. Prompt logging redacts email addresses and phone numbers. Private personal contact details and secrets will not be copied into this report. This is a deliberate privacy boundary, not a claim that no contact details may exist in provider or application systems.

## 2026-10-14 — preparation

1. **Prior-run review.** Reviewed the prior visible run audit, `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_03.md`, and project memory before starting another run. The previous canonical run ended incomplete with no entity, evidence, contact-evidence, or admission delta, and no card. Its trace showed repeated Investigator `upstream_token_window_wait_exceeded` responses and a Right-hand stop. An earlier attempt also recorded a malformed `parallel_registry_search` action (`json_validate_failed`) and did not yield a candidate/card. These are prior-run observations, not findings from run 04.
2. **Architecture guardrail.** The current canonical discovery implementation has a distinct Boss-directed reassignment path for an Investigator capability explicitly marked `upstream_quota_exhausted`. A token-window wait, malformed action, or other transient failure is not equivalent to exhausted quota. This run will rely on the existing model-owned control plane and its durable reassignment rules; no scripted candidate, forced admission, or evidence-gate bypass will be used.
3. **Launch path inspected.** The UI launch helper submits the canonical `/api/ingest/atlas-run` request. With no single-target selection it defaults to three targets and standard research depth (420,000 ms per-target timeout); the API starts model-owned discovery. The UI's actual launch control has not been activated.
4. **Audit capture configured.** Development prompt capture now points to this file. The application appends allowlisted model request fields/messages when it makes model calls. It does not capture provider credentials or hidden reasoning, and contact strings in prompt text are redacted.
5. **Workspace readiness reviewed.** The API workflow was reported running. The requested provider/environment variable names were confirmed present without reading or reproducing their values. The development database baseline previously measured zero rows in `entities`, `research_cases`, `research_case_events`, `research_evidence`, and `contact_evidence`.
6. **No external research initiated.** The previous default discovery objective concerns private individuals and reachable personal contact paths. Run 04 is paused before any research call until its target is explicitly narrowed to a named public organization and public professional contact channels.

## Live trace

Append each material event below in chronological order. Keep timestamps in UTC when available. Distinguish direct observations from interpretation, include request/job/case/event identifiers when exposed, and record failures without silently retrying or changing the admission/evidence criteria.

### Event 000 — audit opened

- Time: 2026-10-14; exact wall-clock timestamp unavailable in the authoring environment.
- Action: created this visible audit and configured application prompt capture to append here.
- Result: ready to record model requests from the next development workflow start onward.
- External searches/model calls: none initiated for run 04.
- Current blocker: user approval of a named public organization and bounded public-business-channel scope.

### Event 001 — prompt-audit destination switched

- Time: 2026-10-14; exact wall-clock timestamp unavailable in the authoring environment.
- Action: updated the development API's prompt-audit destination to this file using Replit's validated `.replit` replacement path; removed the temporary config file after validation.
- Result: the running API must be restarted before it reads the new destination. No research request was made.
- Setup note: a direct `.replit` patch was rejected by the environment's protected-config guard; using the validated replacement succeeded without changing other configuration.
