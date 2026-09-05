# Apex Atlas / Bureau live audit — 2026-09-05

## Scope

This audit follows `docs/context.md` as the acceptance contract. It covers the
API-only Replit runtime, boot and health behavior, the bounded model-selected
discovery smoke, the observed Bureau trajectory, admission/persistence
honesty, and the decision about whether a single-target Dig was allowed to
start.

No source code or database records were deleted during this audit. The prior
ledger row was retained and was not counted as a new discovery admission.

## Runtime and source

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Branch: `main`
- Runtime tip: `bbbec2fb65f2cf2df5154f301094cc3c733e4ca3`
- Tip floor from `docs/context.md`: satisfied (`c2a8b93` or newer)
- Workflow restarted: `API Server`
- API workflow command: `bash scripts/replit-boot.sh`
- API port: `8080`
- Desk route: `/`
- API route: `/api/`
- `ENABLE_AUTO_PIPELINE=false`
- `INSTALL_PYTHON_OSINT=false`
- `APEX_SKIP_SEMANTIC=1`
- `RESEARCH_DEPTH=standard`
- No frontend or secondary API workflow was started

The API boot performed a database schema check with no changes, built the API,
served the desk static bundle, and started listening on port 8080. Semantic
warm-up was skipped as a non-fatal consequence of `APEX_SKIP_SEMANTIC` / the
small host. Auto-ingestion and contact-research resume were correctly skipped
because auto-pipeline is disabled.

## Health gate

Health was checked through the shared app route:

`GET /api/healthz` → HTTP 200

- `status`: `ok`
- `bureauIntegrity`: `ok`
- `bureauIntegrityReasons`: empty
- Redis: `ok`, one permanent Upstash slot connected
- `autoPipeline`: `false`
- Active search providers: Tavily, Exa, Serper
- Active Dig-capable LLM slots: `4`
- Companies House, Scrapfly, ZenRows, WhoisJSON: available
- Whoxy: absent, as required
- `agenticLlmLastOk`: `true`
- `agenticLlmLastModel`: `openai/gpt-oss-120b`

No secret values were recorded.

## Desk check

- `HEAD /` → HTTP 200
- Desk static HTML served from `artifacts/apex-finder/dist/public`
- Non-blank Apex Atlas Overview rendered successfully
- Visible UI showed the Apex Atlas desk, Launch Apex Atlas control, Reactor,
  Discover, entity count, and current ledger summary
- Screenshot captured at:
  `screenshots/apex-atlas-audit-2026-09-05.jpg`

## Static contract checks

| Check | Result |
|---|---|
| `pnpm run typecheck` | PASS |
| `pnpm run check:no-force-dig` | PASS |
| `pnpm run check:free-react` | PASS |
| `pnpm run check:discovery-quality` | PASS |
| `pnpm run check:agentic-runtime` | PASS |
| `pnpm run check:agentic-timeout` | PASS |
| Provider-role documentation guard | FAIL |

The provider-role documentation guard reported these stale documentation
defects:

- `docs/bureau-plan/02_FREE_REACT_AND_TOOL_SURFACE.md`: missing Gemini Boss declaration
- `docs/bureau-plan/10_TOOL_CATALOG.md`: missing Gemini Boss declaration
- `docs/bureau-plan/20_DIG_LOOP_STATE_MACHINE.md`: missing Gemini Boss declaration
- `docs/bureau-plan/20_DIG_LOOP_STATE_MACHINE.md`: missing NVIDIA right-hand declaration
- `docs/bureau-plan/227_BUREAU_CONTROL_FLOW.md`: stale provider/control-plane phrase
  `template fallback`

This is a documentation-contract failure, not a runtime integrity failure.
The source/runtime provider-role guard passed: Dig remained constrained to the
Groq → Mistral lane, while Gemini is Boss and NVIDIA NIM is right-hand advice.

## Restart behavior

At the time of reboot, a previously running job was present:

- Interrupted job: `14cf3f44-324f-4d7e-97f0-b18eb1028a71`
- Result after restart: `failed`
- Message: `Research job stopped before it finished (server restarted or process ended.)`

Boot cleared the ghost active-job lock. This is honest lifecycle behavior, but
it means a server restart during a live Bureau job loses that job's clean
completion state and must be recorded as an interrupted run.

## Fresh bounded discovery smoke

The new run was launched with the context's bounded proof shape:

```json
{
  "discoveryFirst": true,
  "targetCount": 3,
  "researchLimit": 2,
  "runResearch": true,
  "skipFaa": true,
  "broadCategories": 1,
  "batchSize": 10,
  "phaseJBatchSize": 5,
  "targetTimeoutMs": 180000,
  "researchDepth": "standard"
}
```

- Job: `31af88af-8173-4138-b479-74df378f82ea`
- Started: `2026-09-05T06:20:42.852Z`
- Finished: `2026-09-05T06:25:32.184Z`
- Runtime status: `done`
- Progress: `3/3`
- Errors: `0`
- `degraded`: `false`
- Discovery slots: `3`
- Status message reported: `6 searches`, `5 visits`

### Observed model/tool trajectory

The run did execute the intended free-ReAct discovery surface:

- model decision spans: `llm_step`
- model wait spans: `llm_wait`
- web search actions: `web_search`
- page visits: `visit`
- page fetches: `page-fetch`
- provider/model spans included `qwen/qwen3.8-27b`
- the final status summary also identified `openai/gpt-oss-120b`

Observed research surfaces included:

- Serper search for a named principal / CEO around a family-office acquisition
- Serper search for a family-office principal and portfolio-company investment
- page visit to Matter Family Office / IWP Family Office combination
- page visit to Ocorian's family-office acquisition research
- additional public-web searches and visits with no fixed hop sequence

The live status included `25` recent spans and `12` Bureau records. No
`force_*` action, fixed hop, scripted playbook, Forbes-style target query, or
deterministic proxy-table candidate was observed.

### Admission and persistence result

The ledger before the run contained one row:

- ID `1`: `Ben Schnakenberg`
- `updatedAt`: `2026-09-05T06:11:21.728Z`
- `contactOutcome`: `organization_contact`

The ledger after the run contained the same single row with the same
`updatedAt`. No new entity ID was admitted by this smoke.

The final job message said:

> `1 entities | 0 hot leads | 1 contacts found. AI discovery: 0 source-backed model candidates from openai/gpt-oss-120b (6 searches, 5 visits, degraded=false)`

The important interpretation is that contact facts were encountered during
page research, but no source-backed model candidate crossed the discovery
admission boundary. The existing entity was not refreshed or counted as a new
admission.

## Canonical live-audit result

The repository audit script was run against this job's health, status, launch,
API log, and newly admitted entity set:

```text
FAIL: discovery-first proof produced 0 entities; require at least 1 real admitted person(s)
LIVE_AUDIT class=research_quality entities=0 sourceBackedContacts=0 direct=0 organization=0 candidates=0 collisionRisk=0
LIVE_AUDIT discoveryModel=true discoveryTools=true status=done
LIVE_AUDIT discoverySpans=25 bureauRecords=12
```

Canonical audit exit code: `1`.

## Dig decision

No single-target Dig was started from this fresh smoke.

Reason: the current discovery run produced zero newly admitted, auditable
person entities. Starting Dig against the prior `Ben Schnakenberg` row would
not prove the required current chain:

`model discovery → real person admission → free-ReAct Dig → honest card`

The prior row also remains organization-contact-only:

- `contactOutcome`: `organization_contact`
- direct personal routes: `0`
- organization-scoped routes: present
- collision-risk flags: present on the stored related routes

Not starting a Dig here is the correct fail-closed behavior under
`docs/context.md`; it avoids relabeling an old entity or a contact fact as a
fresh discovery proof.

## Scoreboard

Current scoreboard snapshot:

- `count`: `1`
- `mean`: `1`
- `milestonePass`: `false`
- `bureauIntegrity`: `ok`

This snapshot reflects the pre-existing ledger row and is not a valid fresh
discovery-first proof for this audit. No scoreboard pass is claimed.

## Findings

### Passing findings

1. API-only reboot and static desk serving work.
2. Database schema is reachable and unchanged.
3. Redis-on-boot works with the single configured `REDIS_URL_1`.
4. Health reports `bureauIntegrity=ok`.
5. The desk is non-blank and visually usable.
6. Free-ReAct, no-force, discovery-quality, provider-role runtime, and timeout
   source guards pass.
7. The live discovery run used model-selected LLM and web-tool activity.
8. No forbidden force-hop, fixed research sequence, or fabricated candidate was
   observed.
9. The runtime correctly refused to claim a discovery proof when no new entity
   was admitted.

### Blocking findings

1. **Live research-quality proof remains open.** The fresh 3-slot run admitted
   zero new entities, so the required named-person → Dig → honest-card chain
   was not proven.
2. **Status-to-ledger observability is confusing.** The job summary reports one
   entity and one contact, while the ledger delta is zero and the only row is
   unchanged. The system should make the distinction between “contact fact
   extracted while visiting a page” and “new entity admitted” explicit.
3. **Provider-role documentation is stale.** Three bureau-plan documents fail
   the provider-role documentation guard and should be aligned with:

   ```text
   Boss = Gemini
   Right-hand = NVIDIA NIM
   Dig = Groq → Mistral
   ```

4. **The interrupted prior job is not recoverable as a clean proof.** A restart
   while a job is active marks it failed and clears its ghost lock. This is
   honest, but operators must not treat the interrupted job as completed work.

## Verdict

**Runtime health: PASS.**

**Architecture/static autonomy contract: PASS, with documentation guard
failure.**

**Fresh live research proof: FAIL / not proven.**

**Production readiness: NO.**

The Bureau runs as a real model-directed discovery system and fails closed when
discovery does not yield a valid person. The remaining release gate is not a
cosmetic UI change: produce at least one fresh model-emitted, visited-source
named-person admission, then run and inspect a genuine Groq → Mistral free-ReAct
single-target Dig and its evidence-backed card result.