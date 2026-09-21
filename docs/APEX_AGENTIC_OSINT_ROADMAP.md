# Apex Atlas / Apex Finder — Agentic OSINT Engineering Roadmap

**Status:** active implementation plan — 2026-09-18

## Mission
Build Apex as an evidence-first AI investigation bureau, not an enrichment script. The Investigator owns research trajectory; deterministic code enforces safety, provenance, budgets, lifecycle and promotion integrity.

## Architecture law
User objective → Gemini Boss + Gemini Right-hand oversight → Groq/Mistral Investigator → model-selected action → validated real capability → immutable observation/provenance → claims, identity hypotheses and contradictions → durable evidence graph/event ledger → oversight → next Investigator act.

Gemini never browses or acts as Investigator. There is no Gemini/DeepSeek/NVIDIA Investigator fallback. Tools are capabilities, never mandatory stages.

## Roadmap

### 0. Truth baseline
Inventory the repository, trace all active/legacy research entry points, freeze the exact SHA under test, and make architecture invariants executable.
**Gate:** no stale-SHA certification; no hidden active legacy controller.

### 1. Canonical evidence substrate
Make observations durable first-class objects. Preserve original and normalized URLs, retrieval timestamps, source class, extraction method and scope. Require every claim, identity promotion, contact, contradiction and failure to resolve to real observations.
**Gate:** no trusted assertion without a resolvable evidence path.

### 2. Free-ReAct research
Keep Groq/Mistral as the Investigator pool. The model chooses searches, page visits, pivots, revisits and stopping. Budgets are ceilings, not recipes. External content remains untrusted.
**Gate:** no hidden fixed search sequence.

### 3. Identity hypothesis graph
Represent competing identities, supporting/disconfirming evidence, temporal role changes and same-name/same-company collisions. Promotion requires evidence-backed validation.
**Gate:** model prose cannot become identity truth.

### 4. Oversight/control plane
Gemini Boss owns assignment/disposition; Gemini Right-hand critiques acts. Persist decisions and act digests. Fail closed on required oversight loss. Cancellation fences later mutation.
**Gate:** control decisions are replayable and cannot fabricate research reality.

### 5. Capability layer
Use a typed capability registry for search, page/browser retrieval, DNS/RDAP, registries and approved OSINT executors. Each capability declares schemas, safety policy, provenance contract and resource bounds. Python network OSINT remains fail-closed until real sandbox egress exists.
**Gate:** adding a tool cannot create a mandatory workflow stage.

### 6. Adversarial safety
Continuously test prompt injection, malicious redirects, SSRF, oversized responses, duplicate/copy sources, stale contacts, impersonation, collisions, contradiction handling, replay and cancellation.
**Gate:** failures are reproducible and classified.

### 7. Evidence-first workstation
Project canonical case/evidence state into trajectory, observation, claim, identity, contradiction, oversight and failure views. UI never becomes a second research controller.
**Gate:** every material finding can be inspected back to evidence.

### 8. Empirical evolution
Run frozen 50-case ground truth with 3 matched trials each (150 real runs). Preserve raw trajectories. Score identity, attribution, claim support, contact, contradiction, source quality, abstention and operational behavior separately.
**Gate:** no single smartness score; no benchmark credit without evidence.

### 9. Reliability/scale
Add idempotent event ingestion, lease recovery, resource accounting, controlled concurrency, artifact retention, campaign sharding and longitudinal failure clusters.
**Gate:** interrupted campaigns resume/fail cleanly without cross-trial contamination.

### 10. Release
Require exact-final-SHA architecture, typecheck/build, API/Bureau/research/safety, Gauntlet, campaign, Failure Observatory and five-green/prompt/research-quality CI evidence. Keep PR #338 open until its explicit certification process says otherwise.

## Change loop
READ → TRACE → AUDIT → RUN → INSPECT RAW FAILURE → FIX ROOT CAUSE → ADD REGRESSION → RE-RUN → EMPIRICALLY VERIFY → CERTIFY EXACT SHA.

## Current execution order
1. Finish the active 50×3 campaign and inspect artifacts, not just exit status.
2. Fix defects exposed by real trajectories/evidence.
3. Harden canonical discovery admission so durable evidence accompanies admitted entities.
4. Add anti-scripted-research checks to the permanent Bureau contract.
5. Keep campaign execution paths identical between package scripts and CI.
6. Require complete 50-case validation for release/certification.
7. Repeat all relevant CI against the exact final SHA.
8. Only then advance workstation and longitudinal observatory work.

## Non-negotiables
A benchmark improvement caused by deterministic target-specific search rules is an architectural regression. A correct abstention is not a failure. A system failure is not an insufficient-evidence finding. Old successful SHAs never certify newer commits.
