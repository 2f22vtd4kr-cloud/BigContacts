# Retired case execution API contract

The canonical research server no longer exposes the legacy case execution operations that previously lived in `research/cases.ts`.

Retired operations return HTTP 410:

- `POST /api/research/bureau/cases/{caseId}/initial-research`
- `POST /api/research/bureau/cases/{caseId}/admit-candidate`
- `POST /api/research/bureau/cases/{caseId}/promote-target`
- `POST /api/research/bureau/cases/{caseId}/run-boss-review`

The replacement architecture is:

- case creation/read/event persistence → `research/case-data.ts`;
- model-owned discovery → `research/canonical-case-discovery.ts`;
- model-owned continuation → `research/canonical-case-continuation.ts`;
- explicit retired-endpoint quarantine → `research/legacy-case-execution-retirement.ts`.

The OpenAPI/generated client contract must be regenerated/reconciled so these historical operations are no longer advertised as active endpoints. Until that contract cleanup is complete, this document is the authoritative source-level retirement note.
