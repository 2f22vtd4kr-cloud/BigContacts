# Volume 194 — Context Window Hygiene for Free Dig

## Problem

Long trajectories fill context; models degrade or skip tools.

## Practices

- Summarize old steps in history (keep last K full, earlier compressed)
- Cap observation size per step
- Keep orientation short (surface map, not encyclopedia)
- Prefer one action per turn (already ReAct style)

## Forbidden “fixes”

- Removing tools from the menu to save tokens
- Ending dig early because context is large without promoting findings

