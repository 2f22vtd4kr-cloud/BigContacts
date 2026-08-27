# Volume 242 — Subagent Spawn Policy

## From Anthropic prompt principles (adapted)

Lead must delegate with:

- Explicit **objective**
- Explicit **output format**
- Explicit **tool list**
- Explicit **done condition**
- Effort rules so simple jobs don’t explode workers

## Apex spawn table

| Parent | May spawn | Max parallel (default) | Output |
|--------|-----------|------------------------|--------|
| Orchestrator | 1 dig per entity (serial or limited pool) | researchLimit concurrency | Card artifacts |
| Orchestrator | 1 discovery agent run | 1 (or 2 lanes max) | Candidates |
| Discovery lead (future) | Lane workers | 2–3 | Candidate batches |
| Boss | 1 case investigator per action | 1 | Case findings |
| Dig | **No subagents** — tools only | n/a | Findings |

## Rule

If two workers would write the same entity fields, **do not spawn the second**. Use source locks if historical paths still exist.

