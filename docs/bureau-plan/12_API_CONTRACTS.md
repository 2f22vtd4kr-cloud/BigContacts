# Volume 12 — API Contracts for Bureau Runtime

## 12.1 Health

`GET /api/healthz`

Must return JSON including at least:

- `status`
- `autoPipeline` (boolean; default false operationally)
- `bureauIntegrity` (`ok` | `degraded` | `critical`)
- `bureauIntegrityReasons` (string array)
- search provider slot counts including **Serper**
- dig LLM slot counts (Groq, Mistral, Gemini, NVIDIA as applicable)
- Redis permanent slot summary without burning free-tier via excessive side effects

**Operator gate:** do not start evaluation runs while `bureauIntegrity` is `critical`.

## 12.2 Canonical launch

`POST /api/ingest/atlas-run`

Body: `CANONICAL_ATLAS_LAUNCH_BODY` from `atlas-launch-defaults.ts` (file on disk wins).

Response:

- `202` + `jobId` on accept
- `409` + existing `jobId` if already running — do not start a second pipeline

UI Launch and `scripts/run-bureau.sh` must use the same body.

## 12.3 Status

`GET /api/ingest/atlas-status`

Must return:

- job status: `idle` | `running` | `paused` | terminal states as implemented
- progress message **normalized** (single phase taxonomy)
- current target name when running
- `recentSpans` (DigSpan ring buffer): tool/llm/stage/promote events
- must **not** block indefinitely on Redis; use budgets and fallbacks

## 12.4 Stop / pause / resume

- Stop: `DELETE /api/ingest/atlas-lock`
- Pause / Resume: dedicated routes when present on tip; must not 404 on current main if UI exposes buttons
- Stop must hard-idle Reactor; no fake LIVE after cancel

## 12.5 Bureau events

Publish path:

```
tool step → onLiveStep → publishBureauEvent
  → Redis bureau-events (optional)
  → job log BUREAU| line
  → schedule right-hand narration (non-blocking)
```

Events older than policy window must not display as LIVE when job is idle.

## 12.6 Entities

List and detail endpoints must reflect promoted card fields after dig (cache invalidation required).

## 12.7 Relationships

`POST` entity-entity edges run identity name-pair gate; collision without stable id → reject.

## 12.8 Contract tests (minimum)

1. healthz includes Serper in search honesty
2. launch 202 then status running or memory-fallback equivalent
3. stop → idle
4. status includes recentSpans array type
5. promote changes entities.phone when evidence qualifies
