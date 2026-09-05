# Volume 269 — Plan Volume Depth Standard

## Problem

Thin checklist volumes (≪200 words) lose the architectural argument that the bureau plan exists to preserve: **why** Apex maps (and refuses) industry multi-agent patterns. Operators and future agents then re-propose rejected designs.

## Standard for architecture volumes

| Class | Target length | Contents |
|-------|---------------|----------|
| ADR / pattern map | **400–900 words** | Sources, mapping table, correct/incorrect examples, code anchors, non-goals |
| Contract / API | **250–500 words** | Normative rules, tables, failure modes |
| Checklist / inventory | **150–350 words** | Allowed to be shorter if purely status |
| Glossary | Short entries OK | Link to ADR volumes |

## Required sections for pattern volumes

1. **Why this volume exists** (trigger)
2. **External pattern** (Anthropic / ReAct / OSINT / OTel as applicable)
3. **Apex translation** (what we adopt)
4. **Explicit non-mapping** (what we refuse)
5. **Implementation anchors** (paths, env, routes)
6. **Planning rule** (what to do next time)

## Retroactive note

Volumes 251–263 prioritized shipping the dig-desk map quickly; several are below ADR depth. Volumes 264+ restore depth. Prefer **expanding** thin volumes in place over infinite new micro-vols when the topic already has a number.
