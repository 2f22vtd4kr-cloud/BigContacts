# Volume 232 — Planner / Executor / Critic Applied to Apex

## Classic triad (literature + production)

| Role | Function |
|------|----------|
| **Planner** | Goal → subgoals / next action; no tool spam |
| **Executor** | Tools + observations; produces artifacts |
| **Critic / verifier** | Checks claims against sources / policy |

Optional: separate critic model (cross-model) because self-critique is weak without external feedback.

## Apex assignment

| Apex role | Triad slot |
|-----------|------------|
| Boss | Planner (case path) |
| Right-hand | Soft critic / advisor on plan (not on web facts) |
| Dig agent | Executor for **contacts** |
| Discovery agent | Executor for **candidate people** |
| Promote + sanitize + collision | Deterministic verifier gates (not LLM critic alone) |
| Final review | Optional LLM critic — must not null protected dig facts |
| Scoreboard / operator | Human critic of record |

## Design law

Executors may call tools. Planners and pure critics should not. Deterministic verifiers (sanitize, sourceUrl required, collision) outrank LLM enthusiasm.

## Anti-pattern we already paid for

Treating final-review or deep-web as executors that **overwrite** the primary contact executor without planner-level ownership rules.

