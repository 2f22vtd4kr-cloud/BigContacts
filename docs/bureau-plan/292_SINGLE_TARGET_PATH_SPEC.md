# Volume 292 — Single-Target Path Spec

## Contract

`singleTargetId` research:

- `discoveryFirst: false` (client and server)
- `researchLimit: 1`, `targetCount: 1`
- Free dig owns contact columns until idle
- MCTS/extra contact phases skip when dig already wrote phone/email/LinkedIn or a real outcome
- Stop via atlas-lock; DigSpans clear on stop
- Auto-rehydrate after idle when UI initiated dig

## Entry points

Profile Dig contacts · Entities row/card Dig · Dig selected · API atlas-run with singleTargetId

## Depth

`fast` | `standard` | `deep` maps to iteration/timeout profiles only—not tool playbooks.
