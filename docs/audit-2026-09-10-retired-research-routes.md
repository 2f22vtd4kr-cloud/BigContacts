# Retired research route cleanup

The canonical API boundary now returns `410 Gone` for the known legacy enrichment research routes. Two operator surfaces still reference retired research paths:

- `artifacts/api-server/src/lib/startup.ts` schedules legacy deep-web OSINT and other deterministic research passes.
- `artifacts/apex-finder/src/pages/jobs.tsx` exposes retired jobs including `sync-hot-flags`, `deep-web-osint`, and `bulk-hybrid-research`.

These must be removed from the scheduler and UI rather than relying on the API boundary to reject them at runtime. The desired end state is that only the canonical Atlas launch surface can start research, while deterministic maintenance tasks remain explicitly non-research and scope-safe.

Do not add the new `scripts/check-retired-research-routes.mjs` to CI until the stale references are removed; it is intentionally a failing audit probe for this leaf.
