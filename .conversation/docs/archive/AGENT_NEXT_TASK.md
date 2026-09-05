# Next task (Apex Atlas)

## After pull on Replit
```bash
pnpm install --frozen-lockfile
node scripts/apply-bureau-live.mjs
node scripts/apply-discovery-intake.mjs
# or: bash scripts/post-merge.sh
```
Restart Redis → API → apex-finder web.

## Verify
- Atlas discovery uses `buildSourcesToRun` (no fixed `.slice(0, N)` Europe-first)
- Reactor shows **BUREAU LIVE** panel (SSE `/api/ingest/bureau-stream` + poll)
- `appendJobLog` → `mirrorJobLogLine` (noise gate 40/10s)
- Tests: `discovery-intake.test.ts`, `bureau-live-log.test.ts`

## Still improving
- Structured `publishBureauEvent` from Case Bureau lanes (ask/response/provider)
- Discovery geo mix / admission caps under scale
- SSE reliability under load

App name: **Apex Atlas** (repo may still say BigContacts).
