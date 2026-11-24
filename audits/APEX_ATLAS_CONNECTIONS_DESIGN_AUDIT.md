# Apex Atlas Connections Design Audit

## Handoff purpose
This is the cumulative implementation record for the Connections page. It is intended to let a later coding agent reproduce or inspect every frontend change without access to this session's preview. Entries are appended as each change is completed; do not defer the audit until the end.

## Scope and safety contract
- Repository: `2f22vtd4kr-cloud/BigContacts`.
- Base: `main` at `9ab88886d2f0ef2ef90ba1a0bc91b699e62994d7`.
- Working branch: `ui/connections-design-board-2026-11-24`.
- Reference: https://design-board-812905.netlify.app/
- Scope: Connections at `/network`, its shared shell/brand visible on this page, the existing shortest-path finder, and this audit.
- Keep API endpoints, generated clients, database/schema, authentication, workers, bureau/research orchestration, job lifecycle, and all backend behavior unchanged.
- Do not start the API, database, worker, bureau, research, or any launch action. Only frontend source may be changed.
- Keep the five existing top-level destinations only: Overview, Ledger, Discover, Connections, Reactor. Do not add tabs or routes.
- Design-board sample contacts, counts, names, saved routes, route statuses and evidence are decorative examples, not production data. Never hardcode them.
- Live relationship records, counts, IDs, evidence and shortest-path results must remain API-authoritative. Render honest loading, empty and unavailable states.
- Preserve the classic interface and all existing utility routes as rollback paths.
- Changes in the shared shell affect other pages' presentation only; they must not change their route destinations or page behavior.

## Baseline
- Main is at the same imported source revision recorded by the Replit handoff: `9ab88886d2f0ef2ef90ba1a0bc91b699e62994d7`.
- The Connections page source is `artifacts/apex-finder/src/pages/board-connections.tsx`.
- Its records come from `useListRelationships`; the path finder uses `useListEntities` and `useGetConnectionPath`.
- The current page places the title above both columns, the path finder inside the left relationship console, and the relationship list on the right. The board places the title/relationship register on the left and path/relationship results on the right.
- The current shared shell uses an outlined shield, desktop sidebar and mobile drawer. The board uses a clean quartered shield and horizontal five-destination navigation.
- The backend exposes entity/asset relationship records and an on-demand pairwise shortest-path query; it does not expose a personal contacts collection or saved-route feed. Do not imitate the board's specimen contacts or route cards.
- No API or research workflow was started during this audit.

## Implementation log

### Step 0 — audit initialized
- Created this file before source changes so each subsequent step can be recorded immediately.
- No application source changed in this step.

