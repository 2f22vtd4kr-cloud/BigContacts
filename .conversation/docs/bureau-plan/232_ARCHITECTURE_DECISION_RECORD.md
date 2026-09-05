# Volume 232 — ADR: Default Topology for Contact Recovery

## Status

Accepted (plan binding)

## Context

Apex historically risked “bureau theater”: Boss + right-hand + investigators + parallel enrichers all near the contact problem. External multi-agent evidence (2025–2026) shows multi-agent helps **parallel** work and **hurts** many **sequential** tasks. Contact recovery for one named person is sequential ReAct (search → visit → extract → done).

## Decision

1. **Default contact path = single dig agent + tools pool** (orchestrator schedules it).
2. **Boss + right-hand = Case Bureau only**, optional.
3. **Discovery = separate single agent** (or degraded templates), not Boss.
4. **Deterministic promote/present** = quality gate pipeline, not another LLM role.
5. **Parallel fan-out enrichers** must not write phone/email when dig owns the card.

## Consequences

- Live Desk must work and look complete **without** Boss spans on single-target runs.
- Architecture docs and UI legend must not imply Boss is always on the critical path.
- Token cost drops; debuggability rises (one dig trajectory).
- Case Bureau remains available for multi-step narrative cases.

## Rejected alternatives

- Always-on hierarchical Boss over dig (extra latency, sequential interference).
- Swarm of dig clones merging phones (collision/audit nightmare).
- Right-hand with web tools (role collapse into second digger).

