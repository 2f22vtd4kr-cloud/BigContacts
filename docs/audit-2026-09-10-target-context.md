# Audit — Target Investigator context boundary — 2026-09-10

## Finding
The canonical `runTargetContactAgent` is the target-scoped Investigator entrypoint, but its `contextDocument` parameter was optional. A legacy/internal caller could therefore invoke the free-ReAct Investigator without the durable case state that Gemini, DeepSeek, and canonical Atlas are supposed to share.

That is an architectural integrity defect even when the immediate research result is otherwise valid: the Investigator can repeat resolved work, miss prior contradictions, or act without the current shared case memory.

## Repair
`runTargetContactAgent` now fails closed with `status: "unavailable"` when `contextDocument` is missing or empty. The canonical single-target runner already mounts the durable context explicitly, so the canonical path is unchanged except for being enforced at the leaf boundary.

A dedicated static check was added:

- `scripts/check-target-agent-context-boundary.mjs`

The unified Investigator architecture gate now also requires the same boundary and verifies the canonical runner passes `contextDocument`.

## Remaining implication
Legacy callers that still invoke `runTargetContactAgent` without durable context will now fail closed rather than silently creating a second context-free research control plane. They must be migrated to the canonical case runner or retired.

This is intentionally not solved by manufacturing context inside the Target Investigator. Context is orchestration state and must come from the durable case owner, not from a deterministic script at the research leaf.
