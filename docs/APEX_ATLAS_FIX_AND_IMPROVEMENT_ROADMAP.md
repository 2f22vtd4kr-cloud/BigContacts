# Apex Atlas — Fix & Improvement Roadmap

**Date:** 2026-09-02  
**Repo:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main`  
**Audited code tip:** `9767b2afa5f3a37e860db4ad31d0d5e1190dc2cb`  
**Product goal:** a truthful, autonomous AI OSINT research bureau: models choose queries, tools, pivots, and stopping; deterministic code enforces safety, provenance, identity, scope, budgets, and honest evidence presentation.

## 1. Executive verdict

Apex Atlas is **substantially closer to the intended architecture than the earlier static audits suggested**. The important architectural direction is now correct: discovery and Dig preserve model autonomy, the system has explicit provenance/identity boundaries, contact promotion is fail-closed, organization contacts are not silently treated as personal contacts, and the Reactor is no longer supposed to infer live research activity from telemetry/status keywords.

The remaining gap is not primarily another UI or orchestration redesign. It is **runtime proof**.

The live Replit workspace has now demonstrated that Apex can be brought up interactively, but the bounded live audit did **not** complete the decisive proof chain: real named-person admission → model-chosen Dig trajectory → source-backed findings → honest contact/card result → scoreboard evidence. The setup run also exposed and prompted fixes for the API start script and Redis-on-boot behavior.

Therefore:

> **Architecture: close. Runtime research proof: not yet closed. Production confidence: not yet earned.**

Do not declare Apex production-ready until the proof chain below is executed and recorded.

---

## 2. Non-negotiable architecture laws

These are acceptance constraints, not preferences.

1. **Free-ReAct remains real.** The model invents queries, selects available tools, observes results, pivots, and decides when it is done.
2. **Deterministic code is governance, not a research script.** It may enforce identity, provenance, scope, budgets, safety, persistence integrity, and card honesty. It must not prescribe the research sequence.
3. **Discovery admits people only from model-produced, well-formed person findings with usable source provenance.** Titles, sectors, rankings, company names, or generic prose are not people.
4. **Dig remains Groq → Mistral only.** Gemini is Boss/direction; NVIDIA is right-hand/advice. Neither is a Dig browser fallback.
5. **Reachability beats fame.** Discovery should seek plausible public/intermediary routes to useful principals/operators rather than mechanically enumerating famous or wealthy people.
6. **Generated search URLs are not evidence.** A search query URL can explain how a page was found; it cannot itself prove a person, role, contact, or claim.
7. **Contacts fail closed.** No invented phone/email/URL. No promotion without source-backed evidence.
8. **Scope stays honest.** Organization inboxes and notice-line numbers cannot become personal/direct contact routes without independent person-level evidence.
9. **Reactor activity is observation, not inference.** Named tool activity must be supported by actual Dig spans.
10. **Terminal state is not success.** `done`, timeout, failure, or cancellation must remain separate from evidence quality and card promotion.
11. **No hidden playbooks.** No force-hop chains, fixed discovery registries, scripted search lists, Grok-parity branches, or hard-coded research trajectory masquerading as model autonomy.
12. **Every consequential research result must be reconstructable from evidence and trajectory.**

These laws align with current agent architecture practice: production agent systems increasingly separate governance/control from runtime execution and treat structured trajectories, tool calls, provenance, and evaluation as first-class operational evidence. See current reference work on agent operating architectures and agent observability: https://arxiv.org/abs/2608.03214 and https://arxiv.org/abs/2607.29069.

---

## 3. What the audit established

### A. Control plane — largely correct

- Discovery continuity was audited.
- The model-only admission boundary is explicit.
- Deterministic checks validate identity/provenance rather than choosing the research target for the model.
- The Dig provider chain is constrained to Groq then Mistral.
- Boss/right-hand responsibilities are not used as hidden Dig browsing fallbacks.
- Persistence and contact promotion no longer treat an empty current pass as permission to promote unrelated historical evidence.
- Contact rehydration is not gated on one specific model terminal reason.

**Status: GREEN architecturally; runtime proof still required.**

### B. Evidence / provenance — strong direction

- Synthetic Google/Bing query URLs are rejected as claim provenance.
- EDGAR notice phone evidence is organization-scoped.
- Card promotion is fail-closed when current research produces no findings.
- Deliberate rehydration remains available when an operator explicitly requests it.

**Status: GREEN for invariants; RED until exercised against real live findings.**

### C. Reactor / Desk truthfulness — materially improved

The stale Reactor activity inference was removed from the live decision path. Named research nodes now derive from actual Dig spans; a target anchor may remain while a job is running, but named tools should not light merely because telemetry, stage, log text, or `activeToolId` contains a keyword.

This is important: the Desk is being made a view of observed work rather than a decorative claim that work happened.

**Status: GREEN statically; verify visually and with a real trajectory.**

### D. Replit boot path — newly exposed issues were concrete

The Replit setup run exposed two real operational defects:

1. The API server package lacked the documented `start` script even though the boot script expected one.
2. Redis health/permanent-store initialization could report `not_connected` under the safe `ENABLE_AUTO_PIPELINE=false` posture until permanent Redis was explicitly enabled, and operators may provide `REDIS_URL_1` rather than `REDIS_URL`.

These were fixed on `main` through the Batch 50 work recorded in `docs/context.md`: the API now has a start command, and the Replit boot path defaults Redis-on-boot and aliases `REDIS_URL_1` to `REDIS_URL` when appropriate.

**Status: fixed in repo; runtime confirmation still required.**

### E. The decisive gap — live research trajectory

The bounded Replit run did **not** complete the required research proof. It stopped before a complete discovery-first → Dig → scoreboard chain.

That means we still do not have hard evidence that a fresh runtime session will consistently produce:

`model discovery → real person admission → model-selected Dig actions → source-backed findings → honest card/evidence → measured scoreboard result`.

**Status: RED / OPEN.**

---

## 4. Roadmap — ordered by risk, not cosmetics

### Phase 0 — Freeze the architecture contract

**Priority: P0**

Before adding features, preserve the current laws.

Actions:
- Keep `check:no-force-dig`, `check:free-react`, and `check:discovery-quality` mandatory.
- Add no new deterministic discovery sequence merely to improve benchmark scores.
- Treat any regression toward force-hop, fixed registries, or inferred Reactor activity as a release blocker.
- Keep provider-role separation explicit and tested.

**Exit:** all three checks remain green on the current tip and after every subsequent change.

---

### Phase 1 — Prove the live runtime health path

**Priority: P0**

Actions:
- Start only the API server on port 8080.
- Confirm `/api/healthz` reports healthy integrity and connected Redis.
- Confirm the desk serves a non-blank `/`.
- Confirm the DB schema is usable.
- Confirm the runtime is using the intended current `main` tip.
- Record exact health output in the operator audit report without exposing secrets.

**Exit:** healthy API + healthy Redis + non-blank Desk + correct tip.

---

### Phase 2 — Prove discovery realism

**Priority: P0**

Run one tiny discovery-first seed only.

Inspect the actual trajectory, not merely the final database rows.

Pass conditions:
- The model chooses the research direction.
- A candidate is a real named person.
- Candidate admission is supported by real HTTPS source evidence.
- No ranking/list-only candidate is admitted merely because they are famous/wealthy.
- No title, sector, organization, or generic prose is admitted as a person.
- No scripted venue-owner/EDGAR/template sweep drives the target selection.
- No generated search URL is treated as person evidence.

**Exit:** at least one legitimate entity admitted with auditable discovery provenance.

---

### Phase 3 — Prove one free-ReAct Dig chain

**Priority: P0 / GO-NO-GO**

Run a single-target standard-depth Dig against a real admitted entity.

Required observations:
- Multiple model turns are possible.
- The model can choose `web_search`, `visit`, OSINT tools, and `done` from the available tool surface.
- The sequence is not a predetermined hop list.
- The model can pivot based on observed evidence.
- A failed or empty source does not force a predetermined next tool.
- The final stopping decision is independent from card success.

**Exit:** trajectory proves genuine model-selected research behavior.

---

### Phase 4 — Prove evidence-to-card honesty

**Priority: P0**

For the same single target, inspect every resulting contact/evidence record.

Pass conditions:
- Every personal/direct contact has a real source URL.
- Organization-level contacts remain organization-level.
- No contact is synthesized from a query URL, stale unrelated evidence, or an empty current pass.
- If research finds nothing usable, the card remains honest rather than being padded from historical data.
- Rehydration is explicit and does not silently alter the meaning of the current run.

**Exit:** a reviewer can click through the evidence chain and understand exactly why each displayed contact exists.

---

### Phase 5 — Make the scoreboard a trajectory evaluator

**Priority: P1**

The scoreboard should reward truthful research behavior, not merely terminal output.

Track at minimum:
- model turns;
- tool choices and actual tool spans;
- query diversity / meaningful pivots;
- source URLs visited;
- evidence count and evidence quality;
- person identity confidence;
- contact provenance;
- organization vs personal scope;
- terminal reason;
- cost / latency / token usage;
- final card honesty;
- whether the run satisfied the milestone.

Do not make the scoreboard depend on one exact sequence of tools. A good agent may discover the same answer through different valid trajectories.

**Exit:** repeated single-target runs can be compared by research quality and trajectory, not only by whether a field was populated.

---

### Phase 6 — Strengthen observability for forensic replay

**Priority: P1**

Current research in agent observability emphasizes structured traces containing model calls, tool invocations, retrievals, state changes, authorization decisions, costs, errors, and outputs. Flat logs are insufficient for debugging autonomous trajectories.

Actions:
- Ensure each research run has a stable run/job/trace identity.
- Preserve parent-child relationships between model and tool spans.
- Record provider/model identity, latency, token usage, tool name, arguments metadata, result status, and evidence references.
- Separate operator logs from research truth.
- Make the Reactor consume canonical spans rather than heuristic text.
- Add a replay/audit view that can reconstruct the run without exposing secrets.

**Exit:** an operator can answer “what happened, in what order, using which model/tool, against which evidence, and what changed?” from the trace alone.

---

### Phase 7 — Runtime resilience and provider behavior

**Priority: P1**

Only after the research chain works.

Actions:
- Measure Groq availability, latency, and failure modes in real Dig traffic.
- Verify Mistral fallback occurs only on legitimate provider failure and does not change the research contract.
- Verify provider failure does not cause deterministic tool-path substitution.
- Bound retries and wall-clock time.
- Preserve partial evidence when a later step fails.
- Ensure Redis failure is surfaced as an infrastructure condition rather than silently converting into fake research success.

**Exit:** controlled failures remain honest and recoverable.

---

### Phase 8 — Security hardening for agentic OSINT

**Priority: P1**

This is now a production concern, not a future luxury. Recent agent-security incidents and safety evaluations reinforce the need for isolation, least privilege, tool controls, and auditable trajectories.

Actions:
- Review every tool for SSRF, arbitrary URL access, credential leakage, prompt injection, and unsafe content handling.
- Treat web content as hostile input to the model.
- Prevent retrieved pages from changing system authority or tool permissions.
- Minimize secret exposure to tool processes.
- Enforce outbound/network limits where practical.
- Add explicit audit events for policy denials and permission boundaries.
- Test malicious pages that attempt to redirect the agent or exfiltrate credentials.

**Exit:** a hostile source cannot silently upgrade agent authority or cause secret disclosure.

---

### Phase 9 — Production evaluation harness

**Priority: P1**

Build a small, repeatable evaluation set of real-world-shaped research tasks.

Each task should score:
- identity correctness;
- discovery provenance;
- trajectory autonomy;
- source quality;
- contact correctness;
- scope correctness;
- evidence freshness;
- card honesty;
- cost and latency;
- graceful failure.

Include negative cases:
- person-shaped prose without a person;
- list-only celebrity/billionaire candidate;
- organization phone presented as personal;
- search-result URL presented as evidence;
- stale historical contact;
- prompt-injected webpage;
- empty research run;
- provider timeout;
- Redis outage.

**Exit:** regression results are repeatable and a change cannot silently trade architecture truth for a better-looking score.

---

### Phase 10 — Operator UX and launch discipline

**Priority: P2**

Only after Phases 0–9 are passing.

Actions:
- Make health state, research state, and evidence state visually distinct.
- Show when the system is researching vs waiting vs failed vs completed.
- Never illuminate tools that did not actually run.
- Make evidence source links obvious.
- Make organization/personal scope visible.
- Provide a clear “why this contact is here” trail.
- Keep production deployment configuration documented and reproducible.

**Exit:** an operator can understand system truth without reading source code.

---

## 5. Live proof protocol — the next actual mission

This is the shortest path to the goal. Do not substitute another broad refactor.

### Test A — Runtime

1. Pull latest `main`.
2. Start API server only.
3. Confirm healthz.
4. Open Desk.
5. Confirm non-blank UI.

### Test B — Discovery

1. Run exactly one tiny discovery-first seed.
2. Stop as soon as at least one legitimate entity exists.
3. Inspect trajectory.
4. Reject the run if a scripted/fixed discovery driver appears.

### Test C — Dig

1. Pick one admitted entity.
2. Run one standard-depth single-target Dig.
3. Let the model choose tools and pivots.
4. Wait for idle.
5. Record job ID and trajectory.

### Test D — Evidence

1. Inspect every finding.
2. Verify real source URLs.
3. Verify person/org scope.
4. Verify card output against evidence.
5. If evidence exists but the card is empty, use explicit rehydration and record that distinction.

### Test E — Scoreboard

Run the scoreboard against the same target.

**The release gate is not “the UI loaded.” It is the complete chain.**

---

## 6. Current maturity estimate

This is deliberately qualitative because the decisive live research run is not yet complete.

| Area | Current state | Confidence |
|---|---|---|
| Core control-plane architecture | Strong | High |
| Free-ReAct constraints | Strong | High static / medium runtime |
| Discovery identity boundary | Strong | High static / medium runtime |
| Provenance discipline | Strong | High static / medium runtime |
| Contact/card honesty | Strong design | Medium until exercised live |
| Reactor truthfulness | Corrected | Medium until observed live |
| Replit boot path | Fixed in repo | Medium until fresh runtime verification |
| Redis/runtime health | Improved | Medium |
| Live named-person discovery | Not fully proven | Low/medium |
| Live free-ReAct Dig | Not fully proven | Low |
| End-to-end research-to-card | Not proven | Low |
| Production readiness | **NO** | High confidence |

### Practical distance to the goal

**Architecture is roughly in the “final hardening / verification” stage.** The remaining work is disproportionately runtime validation rather than rebuilding the system.

The most important distinction is:

> We are no longer primarily trying to make Apex *look* agentic. We are trying to prove that it *behaves* agentically on a real research task and that the evidence shown afterward is truthful.

That is a much smaller and more meaningful remaining problem.

---

## 7. Definition of “Apex Atlas is there”

Apex Atlas reaches the target when an operator can submit a research objective and observe this without hidden scripting:

**Objective → model chooses a person → model searches → model visits/uses tools → model evaluates evidence → model pivots when useful → model stops → evidence is persisted → contacts are promoted only when justified → Desk displays only observed activity → scoreboard measures the actual trajectory.**

The system must be able to fail honestly:

**No legitimate person → no admission.**  
**No source-backed contact → no contact.**  
**No useful research → no padded card.**  
**Tool failure → visible failure/partial evidence, not fake success.**

That is the bureau standard.

---

## 8. Research basis for this roadmap

The roadmap also reflects current agent-system research: production architectures increasingly separate governance/control planes from runtime coordination; agent serving research emphasizes trajectory-level metrics and cross-component trace reconstruction; current observability practice treats structured model/tool/retrieval/state traces as the operational record rather than relying on flat logs. These are directly relevant to Apex because its central product claim is autonomous, auditable research rather than deterministic workflow automation.

References:
- Agent Operating System reference architecture: https://arxiv.org/abs/2608.03214
- Agentic serving and trajectory reconstruction: https://arxiv.org/abs/2607.29069
- Observability for delegated execution: https://arxiv.org/abs/2606.09692
- Current agent observability architecture guidance: https://observability.opensearch.org/docs/ai-observability/agent-tracing/

---

## 9. Final instruction to future work

**Do not start another cosmetic green cycle.**

The next engineering cycle should produce runtime evidence. If a live run fails, capture the exact failure, fix the smallest underlying defect, rerun the same proof, and preserve the trajectory evidence.

**Mission:** make the bureau truthful, then prove one real research chain.
