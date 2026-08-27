# Volume 137 — Purpose Reset: Why Apex Lost to a Single LLM

## The product sentence (non-negotiable)

**Apex Atlas is an OSINT desk for high-net-worth and high-access people, optimized for outreach.**

Success is not “jobs finished.” Success is:

1. A **better public contact surface on the card** than a strong single-model chat agent with web tools, on the same targets, same time budget class.
2. **Every attributable public route still visible** — personal preferred, but organization, IR, notice-line, gatekeeper, domain, and related-person routes **must not be discarded** merely because they are not personal mobiles.
3. Operator can **see dig work** (trajectory), **trust labels** (outcome + source), and **act** (copy, call, open LinkedIn) without hunting evidence bags.

If a Grok / Claude / ChatGPT Deep Research session puts a notice-line phone and two org emails on the table and Apex shows empty or issuer-only garbage, **Apex failed the product** — regardless of phase count, Redis health, or job status “done.”

## Root cause already admitted (and must stay admitted)

Earlier Apex builds **scripted and micromanaged** discovery:

- Forced hop lists (`force_related_person`, fixed “prefer action=visit” ladders).
- Adaptive directors that **stopped research** when models were “unavailable” instead of free search/visit.
- Parallel pipelines that **overwrote dig wins** with deep-web / issuer / final-review nulls.
- Outcome labels that scored **org dig as personal direct** (or the reverse), destroying scoreboard honesty.
- UI that **hid** secondary contacts or buried them in evidence-only dumps.

Those choices **eliminate the advantage** of having the same class of trained models **plus** durable tools, registries, DigSpan, multi-provider search, and card promotion. The model is not the bottleneck; **the harness is**.

Literature in 2025–2026 is unambiguous: agentic OSINT value comes from **ReAct-style free tool choice** over a **contracted tool surface**, with **evidence ledgers** and **human verification** — not from hardcoded playbooks that starve the model of agency. Surveys of agentic AI for OSINT stress human–AI co-pilot collection + analyst verification, not scripted ladders. Open ReAct OSINT agents (LangGraph-style, free read-only tools, deterministic evidence) beat “chat without tools” only when the agent **chooses** the next lens.

## What Apex must be (architecture intent)

| Layer | Intent |
|-------|--------|
| **Dig** | Free ReAct: `web_search` / `visit` / browser / domain / registry as the **model chooses**. No force_* controllers. |
| **Evidence** | Every non-trash vector lands in `contact_evidence` with source URL, scope, identity risk. |
| **Promote** | Best **personal** dig/notice claims go on card columns; **org** claims stay visible as org marks — never silent drop. |
| **Protect** | Agentic/notice phones and emails are not wiped by issuer, deep-web force, or final-review nulls. |
| **Show** | Live Desk / Entities: phoneSource, outcome honesty, secondary routes on the card surface, DigSpan trajectory. |
| **Prove** | Scoreboard vs single-LLM baseline on fixed fixtures; mean ≥ 1.0, zero wrong-person. |

## Frustration contract (operator → implementer)

When the operator says “Apex loses to a single LLM,” the implementer does **not**:

- Add more phases.
- Add more forced queries.
- Blame missing API keys without checking dig trajectory for actual `web_search`/`visit`.
- Declare “done” because `cookedAt` is set.

The implementer **does**:

1. Open DigSpan / atlas-status: did free dig run?
2. Open evidence: any phone/email with URLs?
3. Open card: was promote blocked or overwritten?
4. Compare to a chat agent paste for the same name — score honestly.

## Batch implementation rule for plan volumes 137+

Write plan **and** implement in **batches**. Each batch must move one of:

- Free dig fidelity,
- Card surface completeness,
- Overwrite protection,
- UI clarity,
- Scoreboard proof.

Never a batch that only adds documentation density without a shippable acceptance check.

