# Volume 273 — Evaluation Without Fake Wins

## Why this volume exists

Anthropic and other research stacks emphasize evaluation harnesses. Apex has a scoreboard rubric and COMPARE helpers. The failure mode is **declaring victory** under conditions that make the metric meaningless: integrity critical, empty n, or chat baseline without sources. This volume is the evaluation ethics ADRs for the bureau plan.

## Valid evaluation stack

| Layer | What it measures | Invalid when |
|-------|------------------|--------------|
| Unit / contract tests | Promote locks, outcome honesty, no force_* | Tests mock away promote rules |
| Scoreboard snapshot | Analytic −1…2 on recent cooked cards | `bureauIntegrity=critical`; n too small; pass forced in UI |
| Live milestonePass | Mean ≥1 on ≥8 with no −1 after real digs | Secrets broken; dig never run |
| COMPARE vs chat (vol 250) | Human-judged primary route quality | Auto-win; no URLs; integrity critical |

## Integrity gate is not optional

ScoreboardStrip **hides pass** when integrity is critical. That is intentional. Fix Serper/LLM/search posture first. Digging harder cannot green a red integrity lane.

## COMPARE discipline

1. Same approximate depth budget as Apex dig.
2. Require attributable URLs from the chat agent.
3. Mark `baselineBetterPrimary` only on clear human judgment.
4. Stamp **INVALID COMPARE — integrity critical** when healthz says so.

## Relation to Anthropic evals

Internal multi-agent evals measure breadth coverage on hard research questions. Apex scoreboard measures **contact route quality on people cards**. Do not import a breadth eval and call it contact success.

## Planning rule

No plan volume or PR description may claim “beats chat” or “milestone achieved” without citing integrity state + snapshot numbers. Prefer linking `scoreboard-snapshot` JSON excerpts in COMPARE docs under `docs/comparisons/`.
