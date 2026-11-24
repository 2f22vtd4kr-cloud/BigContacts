# Reactor frontend audit — design-board completion handoff

## Scope and safety

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Base: PR #943 branch `ui/design-board-faithful-2026-11-23`, head `73b4b9ff0092f90eea70a57ffd58fcd163c0e279`
- Work branch: `agent/reactor-board-finish-2026-11-24`
- Page: `/reactor` only; preserve `/reactor/topology` as its existing utility route.
- Reference: `https://design-board-812905.netlify.app/`
- Backend, API contracts, schemas, routes, database, workers, research logic, and evidence admission are out of scope and must remain unchanged.
- Never launch a research run, start the bureau, or fabricate events, people, sources, routes, metrics, or outcomes.
- The classic UI and all existing navigation destinations remain intact.
- This handoff is cumulative. Every patch below records the exact source change and its reason.

## Baseline — current GitHub branch

The current PR #943 branch already contains the board-mode Reactor Logbook and Run console projection, including chronological canonical telemetry, filters/search, run status, retry, metrics, and the full-topology utility link. The earlier Replit handoff describes a different imported snapshot and its layout patches are not present verbatim in the current GitHub branch. Do not transplant its unrelated navigation changes.

Confirmed current source locations:
- `artifacts/apex-finder/src/pages/reactor.tsx`
- `artifacts/apex-finder/src/flat-round.css`
- `artifacts/apex-finder/src/components/apex-error-notice.tsx`

Current board-mode console is rendered by `DesktopReactor` around lines 1683–1723. It is currently a plain rule-only aside with no board shield or patterned frame. The existing Reactor API-down state and Retry control are already inline.
The global error notice currently displays every classified API error, which can duplicate the inline Reactor API-down state.

## Patch log

### Baseline review — no source changes yet

- Confirmed latest PR #943 head and created a separate work branch from that exact commit.
- Reviewed the existing Reactor board-mode implementation and styles.
- The earlier Replit audit is treated as historical handoff only; current GitHub source is authoritative.
- No backend workflow, API, database, worker, bureau, or research run was started.
- Rendered visual comparison is not yet verified in this environment. Source-level changes must not be described as screenshot-verified.
