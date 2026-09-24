# Apex Atlas Execution Audit — 2026-09-24 18:16 launch

## Provenance

This audit preserves the Replit Agent execution report supplied for the Apex Atlas development runtime.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Observed imported upstream SHA:** `bbc87507722034ef0ed836bbc99f518a556c0828`  
**Launch job ID:** `0dd276e0-6eb4-4968-ba7d-d9241ce7bd62`  
**Audit start:** 2026-09-24 17:59 Europe/Kyiv

Secret values are intentionally not recorded.

## Verified execution evidence reported by Replit

- All requested secret names were present; values were not read into the audit.
- Upstream `main` was imported without replacing the application architecture.
- `pnpm install --frozen-lockfile` succeeded before the build repair.
- Typecheck passed.
- The phone-priority focused test set passed: 6 files / 34 tests.
- Initial build failed because the Vite config dynamically imports `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner`, while the desk package did not declare those development dependencies.
- Replit repaired that workspace dependency state and the subsequent build passed.
- Development schema initialization succeeded against the previously empty development database.
- `research_cases.target_entity_id` and `entities.contact_outcome` were confirmed present.
- Canonical API health returned OK, Redis was OK, research keys were configured, and the Atlas lock was inactive.
- The original Launch Apex Atlas request was sent exactly once with:
  - targetCount=3
  - researchDepth=standard
  - targetTimeoutMs=420000
- The request returned HTTP 202.
- Job ID: `0dd276e0-6eb4-4968-ba7d-d9241ce7bd62`.

## Defect observed before launch

The original desk requested:

`GET /api/ingest/scoreboard-snapshot?limit=12`

The route was not mounted and returned HTTP 404.

The frontend component already existed and its contract was explicit, so this was a real upstream UI/API contract mismatch rather than a missing feature invented by the audit.

## Important audit limitation

The supplied audit ends immediately after HTTP 202 admission.

It does **not** contain:
- discovery completion/failure
- Gemini Right-hand result
- target case IDs
- Investigator run IDs
- research tool activity
- evidence events
- promotion/card creation
- subsequent cycles
- final job status
- terminal failure boundary

Therefore the 202 response must NOT be treated as a successful Atlas run.

## Remediation implemented after independent repository inspection

1. Declared the two Replit Vite plugins actually referenced by the existing Vite configuration in `artifacts/apex-finder/package.json` using the existing workspace catalog.
2. Restored the existing scoreboard contract at `GET /api/ingest/scoreboard-snapshot` using:
   - existing `entities` data
   - existing `contact_evidence` presentation logic
   - existing pure `scoreboard-rubric`
   - recent cooked entities only
3. The scoreboard route does not introduce a new research/scoring control plane.
4. No Bureau, discovery, Investigator, evidence, promotion, or Gemini architecture was replaced or duplicated.

## Runtime verification still required

A fresh Replit audit must:
- regenerate/verify the lockfile after the package manifest dependency declaration;
- build from a clean frozen-lockfile install;
- verify the scoreboard endpoint returns 200;
- verify the existing desk no longer shows “Scoreboard unavailable”;
- inspect the existing launch job `0dd276e0-6eb4-4968-ba7d-d9241ce7bd62` if its durable state remains available;
- if the job is terminal/expired, perform exactly one new canonical launch;
- trace the complete discovery → Right-hand → Investigator → evidence → promotion/card lifecycle;
- stop and record the first genuine failure boundary;
- never treat HTTP 202 as completion;
- update Notion with exact runtime evidence.

## Architecture constraint

No replacement UI/backend was created. No second Bureau/control plane was introduced. The scoreboard remediation is a thin route over existing persisted entity/contact-evidence data and the existing pure rubric.
