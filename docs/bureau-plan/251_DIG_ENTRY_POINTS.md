# Volume 251 — Dig Entry Points Map

## Product rule

**Dig contacts** always means free ReAct dig on one or more known entities via
`POST /api/ingest/atlas-run` with `singleTargetId` (or sequential single targets).
It does **not** mean MCTS-only research sessions or `web-osint-enrich` as primary.

## Entry points (implemented)

| Surface | Control | Payload notes |
|---------|---------|---------------|
| Profile header / research tab / mobile | Dig contacts | `singleTargetId`, `discoveryFirst: false`, depth from selector |
| Profile dig banner | Stop dig | `stopAtlasPipeline` |
| Entities row (hover / mobile-visible) | Dig icon | same single-target body |
| Entities mobile card | Dig contacts · {depth} | same |
| Entities toolbar | Dig selected (≤5 sequential) | polls idle between targets |
| Entities dig banner | Stop dig + Reactor link | |
| Reactor Launch | Launch Apex Atlas | batch / discovery-first; depth selector when not overridden |

## After dig

1. Poll `atlas-status` until idle (or timeout).
2. `POST /api/entities/rehydrate-contacts` for that `entityId` (auto on profile/entities).
3. Refresh entity + evidence; open evidence panel when bag has rows.
4. Bump scoreboard `refreshKey` on ledger.

## Server guards

- `singleTargetId` set ⇒ API forces `discoveryFirst: false`.
- Single-target path routes to `runSingleTargetPipeline` (no discovery farm).
- MCTS Phase 10 skipped when dig already wrote phone/email/linkedin or non-empty outcome.

## Forbidden

- `force_*` dig hop controllers in agentic-web-research.
- Using template discovery as the dig for a known entity id.
