# Volume 61 — Research Synthesis: How Apex Beats a Single Web Agent

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Purpose:** Connect agent/OSINT/observability literature to **concrete Apex engineering** so the product stops losing scoreboard comparisons.  
**Not:** word padding. Every section ends in **Apex must / must not**.

---

## 1. Why a “bureau on steroids” can still lose to one chat agent

A single capable model with web search wins when it can:

1. Invent the next query from the last page  
2. Open a primary source  
3. State a contact route with a URL  
4. Hedge when identity is ambiguous  

Apex loses the same contest when any of these fail:

| Single-agent strength | Apex failure mode seen in live work |
|----------------------|-------------------------------------|
| Free multi-hop search | `force_*` / playbook dig stole turns from `llmStep` |
| Answers in one narrative | Dig facts never **promoted** to the card |
| Natural hedging | `direct_contact_*` on org phones / wrong family |
| Always responsive UI | Status plane timed out under dig; fake LIVE when idle |

Literature is unambiguous: **tool-augmented agents need a free reason–act–observe loop**, and **multi-agent only helps when roles are real** (planner / actor / critic)—not when stages are renamed scripts.

**Apex must:** keep Investigator dig as true ReAct; treat promote + identity as product, not afterthought.  
**Apex must not:** reintroduce scripted dig controllers to “stabilize” results.

---

## 2. ReAct and tool-use paradigms (what the research says)

### 2.1 ReAct (Yao et al., ICLR 2023)

ReAct interleaves **Thought → Action → Observation** so the model plans and revises from tool results rather than hallucinating a full answer. It improved interactive decision tasks over imitation/RL baselines in the original work and became the default **prompted tool-use** control loop.

Implications for Apex:

- The dig loop in `agentic-web-research` is the right **shape**.  
- Any path that **skips Thought** (forced search then `continue` without `llmStep`) is anti-ReAct.  
- Observations must be rich enough (SERP titles/URLs, page CONTACT FACTS) or the next Thought is blind.

**Apex must:** one model decision per step on healthy runs; observations include URLs and extract summaries.  
**Apex must not:** force-hop machines that execute tools without a model turn.

### 2.2 Tool-use surveys (e.g. arXiv:2406.05804 and later agentic tool-use reviews)

Surveys distinguish:

- **Passive RAG** — retrieve then answer (not enough for OSINT multi-hop)  
- **Autonomous tool use** — model chooses tools (ReAct class)  
- **Autonomous + validation** — separate evaluator (CRITIC-style)  

Apex already has tools beyond search (registries, browser, footprint, RDAP). The failure was rarely “missing tool”; it was **model not free to choose** or **result not landing on the card**.

**Apex must:** expose the full healthy tool schema every dig step (orientation + parseAction).  
**Apex must not:** hide tools behind fixed stage order as the dig brain.

### 2.3 Planner vs pure ReAct

Recent “beyond ReAct” work argues pure step-by-step agents can fall into **local optima**, and proposes **planner–executor** splits: a planner sets goals/constraints; an executor runs tools under those goals.

Apex mapping:

| Literature role | Apex role |
|-----------------|-----------|
| Planner | **Boss (Gemini)** — objectives, stop criteria, final gate |
| Executor / actor | **Investigator dig** — free ReAct tool loop |
| Critic / reflector | **Right-hand (NVIDIA)** — narration, gaps, adaptive free step if Boss fails |
| Deterministic verifier | TypeScript promote, sanitizers, identity collision |

**Apex must:** Boss outputs **goals**, not tool DAGs.  
**Apex must not:** implement “planner” as a hardcoded EDGAR→CH→Serper sequence.

### 2.4 Reflexion / self-refine

Verbal feedback after failed attempts improves agents without weight updates. Apex analogue: stagnation observations, Boss re-brief after repeated empty visits—not force_related_search.

**Apex must:** soft STAGNATION hints into the trajectory.  
**Apex must not:** infinite soft-reject done loops that never allow completion when contacts exist.

---

## 3. Multi-agent systems (when hierarchy helps)

Industry and research checklists converge:

- Define **written responsibilities** per agent (name, job, tools, owner)  
- Start with few agents; add critic when quality is inconsistent  
- Hierarchical orchestrator–worker: orchestrator **does not** do all tool work  
- Generator–critic loops for quality  

Apex’s Boss / RH / dig split matches hierarchical + critic patterns **if prompts stay pure**. The bug class “adaptive RH called with final-card system prompt” is exactly **role contamination**—forbidden in multi-agent design.

**Apex must:** separate free-assign vs final-review NVIDIA paths.  
**Apex must not:** let dig capacity chain (Groq→…) be described as Boss.

---

## 4. OSINT methodology (discipline over tool lists)

Professional OSINT frameworks (planning → collection → analysis → reporting; variants with processing/validation) stress:

1. **Requirements first** — what question is the card answering?  
2. **Collection with provenance** — URL, time, method on every artifact  
3. **Entity resolution** — is this the same person across filings?  
4. **Analysis** — competing hypotheses; confidence language  
5. **Dissemination** — what evidence supports; what it does not  

Apex today:

| OSINT phase | Apex surface | Gap that caused comparison losses |
|-------------|--------------|-----------------------------------|
| Planning | Boss objective | Sometimes replaced by pipeline stage names |
| Collection | Dig tools + registries | Free dig OK when not scripted |
| Processing | Sanitizers, evidence rows | Nav chrome as “people”; trash phones |
| Analysis | Outcome + identity collision | Over-claim direct on org routes |
| Dissemination | **Entity card** | Empty card after successful collection |

The comparison losses against careful open research were mostly **analysis + dissemination** (wrong issuer phone, empty promote, identity muddle)—not “Serper missing.”

**Apex must:** treat entity resolution and outcome taxonomy as first-class analysis.  
**Apex must not:** equate “more registry stages” with better intelligence product.

Corporate OSINT sources called out across methodologies (SEC EDGAR, Companies House, OpenCorporates, WHOIS/DNS, CT logs) are already in Apex’s tool/registry surface—**use them as model-chosen tools**, not as a forced tour.

---

## 5. Observability (why Reactor is part of winning)

Honeycomb Agent Timeline and OpenTelemetry GenAI conventions treat the **conversation** as the unit of debug: LLM calls, tool calls, agent handoffs, failures, bound by `gen_ai.conversation.id`. Tool failures are where agentic systems usually break.

Apex DigSpan + Live Desk are the product form of that idea:

- `jobId` ≈ conversation id  
- spans for tool / llm / stage / promote  
- idle must not show LIVE  
- operator must see **why** a dig produced an empty card  

**Apex must:** complete span coverage on every dig tool; age-out idle LIVE; map spans to scheme.  
**Apex must not:** fixed “step 2 of 6” UI that pretends dig length is known a priori.

---

## 6. Evaluation: how to prove Apex is best-in-class

Literature and production practice agree: agent systems need **regression suites**, not vibe checks.

### 6.1 Fixed fixture set

Public filers + common-name traps + org-only routes + prior failure names (Icahn/Guaranty dig-empty-card, Feinberg/Gund issuer-vs-firm, Czirr/Philip over-claim, deceased Pearl-class).

### 6.2 Metrics (product, not vanity)

| Metric | Why it matches “beat Grok” |
|--------|----------------------------|
| Personal precision | Single agents hedge; Apex must not over-claim |
| Org honesty | Issuer lines labeled organization_contact |
| URL coverage | OSINT provenance requirement |
| Empty-after-dig rate | Harness bug if dig extracted facts |
| Free-dig evidence | Trajectory shows invented queries |
| Status availability | Operable bureau under load |

### 6.3 Protocol

Same names, integrity ok, depth standard/deep, independent baseline without pasting Apex answers. Record tip SHA. File under `docs/comparisons/`.

**Apex must:** run this after material dig/promote changes.  
**Apex must not:** declare victory from commit count or plan word count.

---

## 7. Priority engineering order (research → code)

Derived from literature **and** Apex live failures:

### P0 — Stop losing the scoreboard

1. **Promote pipeline** (Vol 21): evidence → card; rehydrate; cache invalidate  
2. **Source priority**: agentic-web and notice-line beat EDGAR-Phone  
3. **Outcome honesty**: agentic-web-org → not direct_* without personal email  
4. **Identity collision** shared on card + graph  

### P0 — Keep dig free

5. Anti-script audit on every tip (Vol 15 / 27)  
6. Full tool schema in orientation + repair prompts  
7. DigSpan + jobId on all agentic entrypoints  

### P1 — Operability

8. Status Redis budgets + yields between targets/iters  
9. Zombie clear + honest idle  
10. One Redis free-tier posture  

### P1 — Planner/critic purity

11. Boss goals-only briefs  
12. RH free assign ≠ final review  
13. Stagnation soft hints / optional Boss re-brief  

### P2 — Product polish that supports trust

14. Reactor trajectory UI + scheme live-tools  
15. Pause/Stop layout  
16. Deceased/stale gate  

---

## 8. Explicit non-solutions (research-backed)

| Temptation | Why it fails |
|------------|--------------|
| More force hops “to guarantee coverage” | Destroys ReAct advantage; single agent wins |
| Prefer-list domain scoring as dig objective | Hidden script; surveys call this non-autonomous tool use |
| Ranking commit volume as quality | No benchmark uses VCS metrics |
| Adding agents without role contracts | Multi-agent papers warn coordination cost without clarity |
| Optimizing only registry volume | OSINT dissemination is the card, not the log |

---

## 9. Source anchors (for auditors)

**Agents / tool use**

- Yao et al., ReAct (ICLR 2023) — reason–act–observe  
- Surveys on LLM tool use / planning / feedback (e.g. arXiv:2406.05804 lineage)  
- Agentic LLM surveys organizing reason / act / interact (e.g. arXiv:2503.23037)  
- Planner-centric tool-augmented reasoning critiques of pure local ReAct (e.g. arXiv:2511.10037)  

**Multi-agent**

- Hierarchical orchestrator–worker; generator–critic patterns in MAS practice guides  
- Role specialization and critic loops in multi-agent design literature  

**OSINT**

- Planning → collection → analysis → reporting frameworks (OSINT methodology references)  
- Entity resolution as analysis, not another undifferentiated search  

**Observability**

- OpenTelemetry GenAI semantic conventions  
- Honeycomb Agent Timeline (conversation-bound tool/LLM/handoff views)  

---

## 10. Bottom line for Apex

The literature does **not** say “build a longer pipeline.” It says:

1. Free interleaved reasoning and tool use  
2. Optional planner/critic **roles** with clean boundaries  
3. Provenance and entity resolution  
4. Observable trajectories  
5. Evaluation on fixed tasks  

Apex’s architecture diagram already matches that. Live losses happened when **implementation violated the diagram**. This volume is the checklist to stop violating it—and to measure wins with cards, not commits.
