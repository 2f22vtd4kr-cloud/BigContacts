# Apex Atlas audit notes — 2026-09-12

## Adjustment A4 — workflow trigger evidence

The repository files for the single-target audit are manual-only, and the live audit is explicitly limited to `main` + its trigger path. GitHub nevertheless reported push-triggered failures for both workflows on the audit branch. Current evidence therefore treats these as a CI/workflow-control-plane anomaly requiring follow-up, rather than assuming the file-level trigger configuration is the whole story. The audit roadmap now treats unexpected workflow execution as a production resource/supply-chain concern.

GitHub's current documentation confirms that workflow runs use the workflow version present at the triggering commit and that push branch/path filters control whether push events trigger a workflow. This makes the observed mismatch worth resolving explicitly rather than ignoring it.

## Adjustment A5 — provider cache hardening implemented

Direct inspection of `provider-gate.ts` found that response caching had an entry-count bound but no aggregate byte bound, and the cache key ignored cookie/authenticated request contexts and common content-negotiation variants. A 512-entry cache with 1.5 MB responses could approach roughly 768 MB before runtime overhead.

The implementation now:

- applies a configurable aggregate response-cache byte budget (64 MiB default, bounded to 4–512 MiB);
- evicts oldest entries before inserting a response that would exceed the byte budget;
- refuses caching for Authorization, X-API-Key, or Cookie-bearing GET requests;
- separates common Accept/Accept-Language/User-Agent variants in cache identity;
- refuses caching responses carrying Set-Cookie or `Cache-Control: private/no-store`;
- keeps the existing entry-count limit and response-size cap.

A regression test covers cache eviction and credential/cookie isolation.

## Adjustment A6 — reproducible live audit

The live audit workflow now pins pnpm to 9.15.9 and installs from the committed lockfile with `--frozen-lockfile`. This preserves the operational smoke while preventing dependency drift from silently changing what was audited.
