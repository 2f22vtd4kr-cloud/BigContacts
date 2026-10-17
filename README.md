# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is an OSINT research desk built to identify decision-makers, owners, founders, operators, and high-net-worth individuals connected to private companies and capital, then surface **real, attributable contact paths** from public sources.

> **Current acceptance status — 2026-10-17:** Apex Atlas is **not yet live-accepted**: the previous live investigations did not demonstrate a source-backed person passing admission and becoming a durable card. Core control-plane fixes were merged in `c4ddee7d65040e9ce46b119a8e38481da93e9c6e`; audit-capture hygiene was merged in `16ed16943c8815bb02285c33b86ad96786550cc0`. The 2026-10-17 “Fresh Run 05” trace is a deliberately detailed pre-launch/validation audit: its 65 jobless request/response pairs are explicitly non-run telemetry, and its original report ended before the live launch. Replit's declared next steps were to restart the rebuilt API, confirm the effective audit destination and lock state, then launch through the UI's default request. Do **not** treat those 65 pairs as research evidence, and do not mistake preflight telemetry for proof that the live run succeeded or failed. Continue with [the 2026-10-17 successor handoff](docs/apex-atlas-handoff/20_MASTER_SUCCESSOR_HANDOFF_2026-10-17.md) and [current status notes](docs/CURRENT_STATUS_2026-10-15.md). The detailed run trace must remain in the ignored local `private-audits/` workspace folder, not tracked on public `main`.

It is a model-led research bureau, not a fixed enrichment script:

- **Groq Boss** directs the case and selects the Investigator.
- **Groq Right-hand** provides independent bounded oversight.
- **Groq Investigator** owns the actual research trajectory.
- Deterministic runtime code enforces safety, authorization, provenance, identity, persistence, cancellation, and resource limits.

## Canonical branch

**`main` is the canonical working and integration branch for all future Apex Atlas work.**

The repository default branch is `main`. `main` contains `audit/genuine-five-green-final` as an ancestor; merge base is `7cb15619113cad7c19750bdcf7747e7bf39970a8`. The current `main` HEAD is the source of truth for future work. The newer Very Strong implementation/documentation work is therefore on `main`.

`audit/genuine-five-green-final` remains a historical architecture/regression milestone. Do not switch future work back to it merely because older documents call it the production/certification branch.

For a full agent continuation contract, read:

- `docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md`
- `docs/apex-atlas-handoff/20_MASTER_SUCCESSOR_HANDOFF_2026-10-17.md` — current live-run handoff and acceptance loop.
- `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`

## Current engineering state

The current `main` line contains the Very Strong engineering batch and the later Groq control-plane remediation, including:

- evidence-graph cognition in the Investigator context;
- bounded, lossless context compaction;
- information-gain and capability-semantic research assessment;
- adaptive discovery portfolios with diversity floors;
- optional independent Investigator trajectories;
- provider-native structured action outputs;
- source-family/source-class intelligence;
- failure observability for identity, attribution, source, stopping, injection, and system errors;
- explicit caller-owned transient-429 retry boundaries for Groq control/research roles;
- GPT-OSS request-contract hardening with `include_reasoning:false` and no `reasoning_format`;
- complete final Right-hand prompt bounding below the adapter's 20,000-character ceiling;
- Groq-only canonical control plane and retired Mistral/Gemini control transports;
- all configured Groq Investigator credential slots honored by the canonical entry gate;
- dedicated CI/static verification workflows.

These are architecture/engineering capabilities. They are **not** proof of empirical research superiority or live production readiness.

## Empirical runtime status — 2026-10-16

The live logs demonstrate that Groq Boss, Right-hand and the selected Investigator are executing the model-led control loop, returning structured decisions, changing direction, choosing capabilities and receiving fail-closed runtime feedback. Accepted searches/fetches happened; blocked actions did not create outbound requests. This is evidence of a functioning **AI-driven control loop**, not yet a fully accepted research bureau.

- **Run 04:** actual job execution; 20 Investigator iterations, 11 successful tool actions, 8 guard blocks and one HTTP 301 visit; zero findings, admissions or cards.
- **Run 05:** 30 reconstructed Investigator turns, 13 successful actions, 11 guard blocks, 5 other execution errors and one HTTP error. Six Groq HTTP 400 `json_validate_failed` responses occurred; several JSON-object retries recovered structured responses, but one retry failed and another produced unsupported registry IDs. The job's terminal state and final durable counts have not been verified.
- **Current bottleneck:** model output and scope-guard feedback must lead to productive, valid research, followed by fetched source evidence, evidence-backed named people, admission and durable cards. No evidence currently points to a downstream card renderer defect, because no candidate is shown crossing admission.
- **Last source-code CI snapshot:** all five release workflows passed on `4c09192d0b747635ad7fa830018d1e3d7831f47f`. Recheck workflows on the final documentation-updated `main` SHA; CI is not live research acceptance.

The current phase is targeted Bureau tuning and verification—not replacing the architecture or imposing a fixed search itinerary. Preserve AI ownership of research strategy and all fail-closed provenance/admission rules.

## Architecture in one view

```
CASE / OBJECTIVE
    ↓
Groq Boss
    ↓
model-owned Investigator research loop
    ↓
immutable observations + provenance
    ↓
Research Intelligence
    ↺ Groq Right-hand oversight when justified ↺
    ↓
Groq Boss next control action
    ↓
deterministic terminal/admission gate
```

**Tools are capabilities, not stages.** There is no mandatory identity → organization → contact hop recipe.

## Product law

- Public evidence only.
- No invented people, contacts, relationships, URLs, or wealth.
- Organization inboxes remain organization-scoped unless attribution is independently evidenced.
- Unknown/insufficient evidence is a valid outcome.
- Tool/provider failures remain failures.
- Prompt injection from public pages is untrusted content.
- Python-backed network OSINT remains fail-closed until enforceable sandbox egress exists.
- The UI is a projection of canonical evidence state; it must not become a parallel source of truth.
- The Reactor must show real backend events, never synthetic research activity.

## Research-quality program

The Research Gauntlet is the empirical quality program. The historical grounded registry is 38 cases, schema `research-gauntlet-v1`, version `1.1.1`, with ground truth frozen as of 2026-09-18. The repository also contains later extension/campaign work that future agents must inspect directly rather than relying on this summary.

Metrics remain separate:

- identity precision/recall;
- false-positive identity rate;
- claim support correctness;
- unsupported claim rate;
- contact precision/recall;
- contradiction recall;
- source-quality correctness;
- negative-finding calibration;
- useful pivots;
- unnecessary calls;
- successful observations;
- trajectory length;
- system failures.

Do not collapse these into a single “smartness” or winner score.

## Runtime

Canonical API boundary:

- API: `8080`
- desk: `/`
- API: `/api/`
- canonical startup: `bash scripts/replit-boot.sh`

First-time schema initialization is explicit:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Do not leave schema mutation enabled for ordinary runtime boot.

Run 04 (`audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_04.md`) is the newest audit attempt, but it is **BLOCKED_BEFORE_LAUNCH**, not a research run. Replit reported `timed out waiting for run environment to rebuild` before `cd ../.. && bash scripts/replit-boot.sh` began; `/api/healthz` returned 502 and the available API log timestamp predates the attempt. No API process, Atlas job, model request, web search, visit, finding, evidence, admission, or card was produced. This is not a confirmed Apex application-code failure: the canonical boot command did not execute. Replit's recorded safe action is `Cmd/Ctrl+K` → `Restart compute`, then retry the existing API Server workflow once. Do not repeatedly restart the workflow against the same unrestarted compute.

The latest actually executed research investigation remains Run 03, job `8eb7c47b-dc94-46d6-a851-133104a6a806`, which failed/incomplete at the 20-Investigator-iteration ceiling with 1 successful page visit, 0 findings, 0 admissions/inserts, and 0 cards. Its summary says 8 searches while the enumerated turns support 6 provider search requests; preserve that discrepancy. The fetched GrowthCap page yielded no named target or attributable contact. No candidate passed admission, so Run 03 does not show a downstream card-projection failure.

The Replit-added model request audit logger captures visible outbound messages, response schemas/tool definitions, structured visible outputs and transport outcomes while omitting hidden-reasoning fields. Its redaction now covers Google `AIza…` keys, query `x-api-key`/token parameters and provider-prefixed labels such as `GROQ_API_KEY=value` as well as the existing Groq/OpenAI/HF/GitHub token shapes. Run 04 never reached a model request, so this logger is not yet live-verified. At parent SHA `c6bc63dd0fb1d1b5f7636e3240e4320213bf6bcb`, frontend/discovery gates passed but Atlas CI and Audit 1 failed because one new regression assertion still expected `explicit configured "registry" ID` while runtime correctly emitted the required `supported "registry" ID` wording. This follow-up updates that assertion. Re-query gates on the resulting `main` SHA; do not claim CI or five-audit certification is green until those runs finish. CI does not establish live research success.

## Runtime secret contract

Never print or commit secret values. Do not ask the user for GitHub credentials when repository access is already connected.

## Canonical documents

- `docs/CURRENT_STATUS_2026-10-15.md` — latest audited run, verified fixes, CI snapshot, and next live-acceptance criteria.
- `docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md` — current override at the top, followed by explicitly historical handoff material.
- `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md` — mandatory repository study, HEAD-check, and newest-audit selection procedure.
- `docs/context.md` — living architecture, runtime status pointer, deployment truth, and release gates.
- `docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md` — historical continuation background; its dated body is subordinate to current status, source, and newest audit.
- `docs/BUREAU_REACT_ARCHITECTURE.md` — role law and canonical ReAct boundary.
- `docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md` — Very Strong implementation and remaining hardening.
- `docs/APEX_RESEARCH_GAUNTLET_V1.md` — empirical research-quality protocol.
- `docs/REPLIT_NEW_ACCOUNT_SETUP.md` — deployment/import contract.
- `docs/RUN_BUREAU.md` — canonical operational run procedure.
- `docs/APEX_ATLAS_CEO_RELEASE_REVIEW_2026-09-20.md` — CEO/lead-engineer release gate and risk review.

## Product principle

**Every contact should be a person you can justify from the public record — not a guess that looks like one.**

Architecture makes that behavior enforceable. Only controlled live investigations can prove that Apex consistently achieves it.

<!-- Recovery verification remains empirical: static green gates do not replace the canonical Replit launch. -->
