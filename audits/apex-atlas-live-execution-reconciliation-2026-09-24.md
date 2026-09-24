# Apex Atlas live execution audit reconciliation — 2026-09-24

Repository: 2f22vtd4kr-cloud/BigContacts
Audit import: c7f33578069f9ca222573eb6fdf084b67c86f2d9
Reconciliation current main: 72c9eea4e0e965234d24e78bafebbdb96bf44488

## Replit evidence reviewed

- Frozen install succeeded: pnpm 10.26.1, 596 packages, lockfile unchanged.
- Fresh development database was empty before schema initialization.
- Explicit `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` succeeded and required Apex tables/columns were present.
- Canonical API boot succeeded on port 8080; health was HTTP 200; Redis was reachable; provider configuration was present.
- Authenticated source API smoke: 15 passed, 2 skipped.
- The first API workflow start used the wrong working-directory-relative `cd BigContacts`; this was an audit workflow wiring error, not an application failure.
- Corrected source API subsequently booted.
- The web workflow initially used a nonexistent `pnpm --filter @workspace/apex-finder`; the repository's canonical command is `pnpm --dir artifacts/apex-finder`.
- The preview screenshot was unauthenticated. Protected browser API calls returned 401, causing the header to display OFF / DB —. This does not establish a database outage: the same audit had already established API health and Redis health.
- No fresh Atlas discovery run was launched because Replit credits were exhausted. Therefore no discovery/research/card lifecycle result is claimed.

## Code changes applied after reconciliation

1. Made the development auth bypass explicit in the Replit API workflow command.
2. Made the same development bypass robust for direct execution through `scripts/replit-boot.sh`, while preserving the production fail-closed guard in `api-auth.ts`.
3. Fixed the home hero geometry: the depth selector now occupies its actual 7.625rem track, the Launch control its 14.75rem track, with the intended 8px gap and a matching 22.875rem rail width.

## Database finding

The red/off-looking header state in the supplied screenshot is a browser-auth/runtime configuration false negative, not evidence that PostgreSQL is down. `WorkspaceStatus` requests authenticated `/api/ingest/job/active/atlas-run` and `/api/system/status`; without the development bypass those requests return 401 and the component falls back to OFF / DB —. The canonical `/api/system/status` route itself performs `SELECT 1` against PostgreSQL and reports its actual status when reachable.

## Gate

Still RED/UNVERIFIED for live execution. A 202/healthy API is not a completed Atlas run. The next runtime audit must verify the corrected development auth path, UI status, then run exactly one controlled canonical Atlas launch and trace discovery → research → evidence → promotion/cards → terminal state. Five consecutive green runtime audits have not been fabricated or inferred.
