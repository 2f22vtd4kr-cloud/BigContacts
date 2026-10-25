# ⭐ APEX ATLAS — GitHub-hosted live run fallback audit (2026-10-25)

**Purpose:** one real, bounded, UI-equivalent Apex Atlas run in an isolated GitHub Actions runtime because the connected Replit Agent status surface returned phase=paused with an empty response and could not reconcile the prior run. This fallback is a real application/API run; it is not a fixture, seeded card, or synthetic research result.

**Repository baseline:** 2f22vtd4kr-cloud/BigContacts, branch agent/apex-live-run-20261025, starting commit 655f52897287ee8f9944defc28e4c5ad4f670a83 (current main at branch creation).
**Tracked audit:** audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-25_GITHUB_LIVE_RUN_01.md.
**Current outcome:** pending; no card claimed at audit opening.

## Safety and architecture contract

- Use the existing canonical API launch route and exact default UI body: POST /api/ingest/atlas-run with {"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}.
- The CI runtime uses an ephemeral local PostgreSQL/Redis pair and configured GitHub Actions secrets. It does not share Replit's database or Redis lock. It therefore cannot overwrite or run concurrently against Replit state.
- Preserve the implemented Groq Boss → model-selected Groq Investigator free-ReAct → bounded Groq Right-hand oversight, with deterministic evidence provenance, identity/admission, resource limits, and durable persistence.
- Do not fabricate contacts or weaken admission to force a card. A run only passes when real model-directed web activity and at least one real source-backed discovered person are returned through the ordinary entity/card API, with integrity and provenance checks.
- Capture visible model request messages, structured visible responses, tool/action trace, source URLs and results where the implementation exposes them, provider/model identifiers, typed errors, and runtime/card counts. Provider-hidden reasoning is deliberately omitted by the audit writer; credentials and connection secrets are always redacted.
- The action's high-fidelity prompt trace is emitted as a run artifact outside the Git worktree. This tracked report remains the chronological user-visible audit. The model-audit writer strips provider-private reasoning and secret fields.

## Previous run / ambiguity record

### E000 — Baseline and launch ownership check

- GitHub main latest known commit when opened: 655f52897287ee8f9944defc28e4c5ad4f670a83, message “Audit parallel Apex run state and runtime access gap”.
- The earlier tracked Replit audit records job eb10bdd6-2c98-41db-94fc-52d599ca09fe accepted on 2026-10-25 at approximately 08:36 UTC, with the last recorded poll at 08:37:36 UTC showing status running, discovery phase 1/4, and zero inserts. No terminal state or card evidence followed in that audit.
- Repeated read-only Replit status questions for both connected projects returned phase=paused and an empty response. This connector did not expose a read of the actual app runtime, active lock, or database. It is therefore not possible to honestly label job eb10bdd6-2c98-41db-94fc-52d599ca09fe active or terminal based on current evidence.
- A separate investigation is performed here only because it runs against a separate ephemeral database/Redis lane in CI; it must not be presented as a reconciliation of the Replit job.

## Sequential run ledger

### E001 — Isolated runtime boot (record during workflow)

The workflow must install from the repository lock, initialize the ephemeral CI schema via the repository procedure, start the canonical API, and verify the API health before any launch request. Record the actual output and any environment/provider-configuration failure.

### E002 — Canonical UI-equivalent launch (record during workflow)

Issue exactly one launch request with the UI-default body above. Record the actual HTTP result and returned job ID. Do not retry if the response is ambiguous.

### E003 — Model-led discovery and research (record during workflow)

Read status and canonical Atlas trace for that same job ID. Record model/role IDs, visible prompts and model responses as present in the safe model audit, action/tool calls, search text, source URLs/snippets, typed provider failures, Boss-directed reassignment/fallback, and result counts. A query being issued is not evidence that a source was successfully read.

### E004 — Durable admission and card reconciliation (record during workflow)

Record the terminal status/outcome, discovered entity names and IDs, source/provenance metadata, evidence and contact-route counts, and the card/entity API response. Distinguish direct person routes, organization-scoped routes, and candidate/unverified contact routes. A failed/partial run is a failure, not an empty success.

### E005 — Final evidence (append after workflow result)

Include the real job ID, final workflow result, terminal counters, minimum-admission assertion, audit artifact link, persisted card/entity ID(s), public source URLs, and UI/API projection check. Leave unknown values explicitly unknown.

### E006 — Isolated GitHub live-run fallback blocked at credential preflight

- Observation timestamp (UTC): 2026-10-25 09:10:45–09:10:58.
- Workflow: Apex Atlas User-Requested Live Run (2026-10-25), run https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40179569398, job ID 121127510267, source commit b04bc6fe77b34f2a6ea55368f7ed0deb101740b8 on branch agent/apex-live-run-20261025.
- The isolated PostgreSQL/Redis containers became healthy. Before dependency installation, API startup, launch POST, or any external model/search call, the explicit secret-presence gate failed with: “Missing GitHub Actions secret for the Groq Boss role.” Runner logs showed the expected Groq Boss, Right-hand, and Investigator key slots were empty. Several search-provider integrations were configured, but the model-role credentials required to run the bureau were not available in GitHub Actions.
- The live audit script then correctly reported infra_prelaunch_failure / researchQuality=inconclusive because no launch existed. No API request was made, no model was called, no web query was run, no provider failover occurred, and no card/entity was created in this workflow.
- Independent corroboration: the other agent's Apex Canonical Runtime Proof run https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/40179498576 failed at the same fail-fast Groq Boss secret-presence step before its own canonical launch. Its one-target fast smoke was not a card run.
- Replit read-only status checks for both candidate project IDs again returned phase=paused with an empty response. get_publish_status returned found=false for both projects, so no already-published endpoint was available to query. These are limitations of the available tools; they do not prove the earlier Replit job is terminal.
- The failure is credential availability at the execution environment boundary, not evidence that an Investigator key was exhausted, invalid, or rate-limited. No secret values were printed, copied, rotated, or changed. The previous Replit runtime secrets were not available to this GitHub runner and cannot be transferred here by the current connected tools.
- This branch's isolated workflow was deliberately kept off main to avoid cancelling other agents' ongoing main-branch code-audit runs. The tracked report and the captured, credential-redacted model-request audit remain attached to the visible branch/action artifacts for diagnostics.

## Current truth

No full run has yet been verified. No card has been created by this fallback. The remaining path requires a runtime that can read the configured Replit provider secrets or authorized Groq Boss / Right-hand / Investigator credentials made available to the execution environment; without them, the intended model-driven Bureau cannot legally or honestly progress to discovery and card creation. Do not replace missing model roles with canned data, mock mode, synthetic cards, or a deterministic search script.
