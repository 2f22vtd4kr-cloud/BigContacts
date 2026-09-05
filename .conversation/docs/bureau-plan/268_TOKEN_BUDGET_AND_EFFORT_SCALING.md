# Volume 268 — Token Budget and Effort Scaling

## Anthropic lesson

Multi-agent research can consume on the order of **15×** single-chat tokens. The justification is breadth coverage under time constraints — not prestige of “having agents.”

## Apex effort scaling (implemented knobs)

| Knob | Scales |
|------|--------|
| `researchDepth` fast/standard/deep | Dig iterations + hard timeout |
| `researchLimit` / Dig selected ≤5 | How many identities get dig |
| `discoveryFirst` + discovery agent timeout | Breadth spend before dig |
| Sequential single-target | Avoids N parallel dig contexts |

## What we refuse to scale

- Parallel contact writers per entity (token spend **and** ownership bugs).
- Forced hop scripts that burn tools without observation learning.
- MCTS after dig already succeeded (skip rule saves both tokens and latency).

## Operator honesty

Deep dig on twelve names is expensive. The desk shows depth selectors deliberately. Scoreboard should not demand deep on every row — standard digs that produce attributable routes score well under vol 87.

## Future meter (post-scoreboard)

Vol 244 sketched per-job cost board. Implement only after live milestonePass so cost UI does not become a distraction from empty cards.
