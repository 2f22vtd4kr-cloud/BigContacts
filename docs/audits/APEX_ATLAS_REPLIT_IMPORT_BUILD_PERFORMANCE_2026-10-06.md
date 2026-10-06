# Apex Atlas Replit Import / Build Investigation — 2026-10-06

## Incident

The Replit validation run spent approximately 24 minutes importing/building before the application could reach the API restart stage. The observed TypeScript gate then stopped startup on two compile errors.

This investigation separates three layers: repository import/cold dependency installation; repository validation/build work; application boot work.

## Confirmed repository causes

### A. Two real TypeScript defects were present on main

`AgenticTrajectoryRecord.model` is required, but the new prompt-budget regression fixture omitted it.

`runBureauAgenticWebPass()` obtains `mountedContext` as `string | null` and passed it directly to the Investigator optional text field. Strict null checking rejects that.

Both are now corrected.

### B. API build was being repeated during Replit boot

The API package build performs a large set of architectural/static gates and then runs esbuild.

The root workspace build recursively builds packages. Separately, `scripts/replit-boot.sh` unconditionally ran `pnpm --dir artifacts/api-server run build` before starting the already-built API.

Therefore a validation/build → boot sequence could execute the expensive API build twice.

### C. Frontend reuse already existed; API reuse did not

The boot script already skipped the Apex Finder build when `dist/public/index.html` existed. There was no corresponding API build reuse mechanism.

## Changes

- `agentic-web-research-core.test.ts`: complete the required trajectory `model` fixture field.
- `bureau-agentic-pass.ts`: normalize absent mounted durable context to `undefined`.
- `artifacts/api-server/build.mjs`: write a build stamp containing the git revision, clean/dirty state and build timestamp after a successful bundle.
- `scripts/replit-boot.sh`: reuse a stamped API build when the current repository is clean and the stamp matches `HEAD`; otherwise run the normal guarded API build.

The reuse rule is intentionally fail-safe: dirty working trees and mismatched revisions rebuild rather than reusing stale output.

## What cannot honestly be attributed to repository code

The 24-minute initial GitHub/Replit import may include repository transfer, Replit dependency discovery, package fetching/linking, cache population and native dependency preparation. The repository cannot observe those phases from source.

The lockfile is about 246 KB / 6,783 lines, so the lockfile itself is not unusually large. The workspace resolves a substantial dependency graph, including native/optional packages, but no source-level evidence available here proves that a specific dependency consumed the reported 24 minutes.

Replit documents that package installation can involve fetching, extraction and precompilation. citeturn1search10turn1search2

## Acceptance criterion

The next Replit run should distinguish import/install time, validation/typecheck time, actual API bundle time, and boot time.

Most importantly, once a successful API build exists for the same clean revision, boot must no longer rebuild it.

The two TypeScript failures are no longer expected from current main.

## Verification limitation

This environment cannot execute the Replit workspace. GitHub Actions currently exposes no workflow run for the current head, so CI green is not claimed.