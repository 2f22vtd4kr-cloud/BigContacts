# Volume 143 — Batch Implementation Roadmap (Plan → Ship)

## Cadence

Plan volumes continue toward **400k words** of **operative** specification (not filler). Implementation ships in **batches** of 1–3 days each, each with acceptance.

## Batch themes (ordered)

### B1 — Integrity freeze (mostly landed; keep regression)

- Free dig CI, source locks, final-review protect, promote honesty.
- Acceptance: check-no-force-dig; unit tests phone-source; no null wipe paths.

### B2 — Card surface completeness

- Present T2–T4 on entities without requiring personal.
- Rehydrate CTA on evidence-rich empty cards.
- Acceptance: fixtures with only org phone show org chip.

### B3 — UI trajectory & honesty

- DigSpan always visible during dig; integrity banner; scoreboard entry point.
- Acceptance: operator sees web_search spans without opening logs.

### B4 — Single-target operator path

- Launch singleTargetId + depth standard default; compare template fill.
- Acceptance: one-click re-cook documented; snapshot mean moves after re-cook.

### B5 — Search quality

- Provider failover telemetry; rank fusion notes; query diversity soft-nudge only.
- Acceptance: dig with one provider down still searches.

### B6 — Scoreboard culture

- ≥8 fixtures, baseline pastes stored, milestonePass tracked in repo COMPARE files.
- Acceptance: milestonePass true once — then guard with regression suite.

### B7 — Optional advanced tools

- Wayback resurrect, PDF-only filing extract improvements, MCP-style optional tools **behind** free dig, model-chosen.
- Acceptance: no tool auto-runs without model action.

## Word budget philosophy

400k words is a **ceiling for thoroughness**, not a vanity metric. Prefer:

- Acceptance tests,
- Failure taxonomies,
- UI contracts,
- External method citations with **Apex mapping**,

over repeating the same doctrine.

Every 10k words of plan should unlock **one batch** of code or one operator proof artifact.

