# Volume 272 — ReAct Loop Ownership

## Why this volume exists

ReAct (reason + act) is the inner loop of Apex dig. Industry multi-agent systems compose *multiple* ReAct (or tool-using) workers under a lead. Apex failed historically when outer workflow and secondary scripts **interrupted** the dig loop mid-trajectory or **pre-decided** the next tool. This volume states ownership so trajectory debugging (vol 247) has a single subject.

## ReAct contract for dig

1. **Thought** (model): given observations so far, choose next action or stop.
2. **Action**: tool call (web_search, visit, browser_fetch, …).
3. **Observation**: normalized result text; must include enough identity context to avoid off-target extraction.
4. Repeat until budget, timeout, or model stop.

The model owns (1). The tool layer owns executing (2) and returning (3). The outer workflow owns **starting** the loop with orientation and **ending** with promote—not choosing the intermediate tools.

## Observation discipline (tie to vol 239)

Observations should carry:

- Query or URL that produced them.
- Snippets sufficient to judge **identity fit** (same person vs namesake).
- Explicit absence signals (“no public phone found in page”) rather than empty strings that look like errors.

Poor observations cause the model to hallucinate next queries or extract the wrong person. Fixing observation quality is higher leverage than adding agents.

## Trajectory as debug, not control

DigSpans and bureau live events are **mirrors** of the loop for operators and postmortems. They must not become a second controller that forces the next hop from the UI. Reactor trajectory views are readouts (vol 257).

## Multi-agent interaction

If a future subagent runs ReAct on a **different facet** (e.g. discovery lane), it has its own loop and context window. It must not share promote locks with an active dig on the same entity. Handoff is: lane output → candidate entity → **new** dig job or queue item.

## Implementation anchors

- `agentic-web-research.ts` — free tool choice; `check-no-force-dig`.
- `target-contact-agent.ts` — orientation, persist findings, rehydrate.
- `spanFromLiveStep` on dig and discovery paths.

## Planning rule

Any PR that adds a fixed sequence of tools “to help the model” is a regression unless it is a **soft orientation** in the prompt. Prefer better observations and depth budget.
