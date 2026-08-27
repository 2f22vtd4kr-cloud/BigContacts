# Volume 150 — Scoreboard Culture (Beating the Single LLM)

## Why this is the north star

The operator’s frustration is empirical: **chat agent > Apex** on contact recovery. Argument ends when **COMPARE_*.md** shows Apex mean ≥ 1.0 on ≥8 fixtures with zero −1 and free dig spans present.

## Fixture design

- Mix: public-company officer, SC13 filer, private company principal, EU registry person, collision-prone common name, social-only control, org-only control, notice-line known.
- Store **baseline paste** (date, model, tools on) in repo under `docs/scoreboard/baselines/`.
- Never tune prompts only to fixtures (overfit); fixtures guard regressions.

## Run protocol

1. healthz integrity ok
2. fix-outcome-honesty optional
3. singleTargetId re-cook depth standard
4. scoreboard-snapshot
5. fill COMPARE table
6. note DigSpan: web_search/visit yes/no

## Score reminders

- 2 = attributable personal/notice direct with sources
- 1 = correct org or social-only with link
- 0 = empty / useless / baseline better
- −1 = wrong person

Org switchboard is **1**, not failure — unless baseline had personal and Apex had nothing.

## Cadence

Weekly COMPARE while climbing to milestone; after pass, on every harness change that touches dig/promote/UI.

