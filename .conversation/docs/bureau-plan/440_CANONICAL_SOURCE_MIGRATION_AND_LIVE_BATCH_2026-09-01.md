# Volume 440 — Canonical Source Migration and Provider-Backed Batch

**Date:** 2026-09-01
**Status:** active — live batch running

## Completed in this cycle

- Re-read current `main` source and current Bureau control-plane artifacts before making changes.
- Found the previous runtime correctness failure: the compatibility hardener could exit after seeing `modelFindings`, which accidentally skipped the independent concurrent-run gate and left the canonical source behind the intended runtime contract.
- Strengthened the identity boundary for malformed title strings, camelCase extraction fragments, and explicitly named humans on organization-scoped sources.
- Updated the runtime correctness tests to inspect the current executable `modelFindings + trajectory` admission contract rather than an obsolete source string.
- Migrated the generated hardening into the canonical TypeScript source using a one-time CI migration, then removed the temporary migration workflow and trigger marker.
- Confirmed the provider-backed live workflow reaches static autonomy checks successfully on the canonical source.
- Confirmed provider generation preflight passes before live execution.
- Launched the actual 10-target discovery-first Bureau job against the current canonical source.

## Current live validation

The current provider-backed job is still in the Bureau polling stage. No research-quality result is being claimed until the terminal artifact is collected and audited.

Required terminal evidence:

1. model-selected discovery actions;
2. real named humans emitted by model `done` findings;
3. exact observed HTTPS sources;
4. free-ReAct target Dig trajectories;
5. honest card/contact promotion;
6. no malformed identities;
7. no Forbes/billionaire-list discovery strategy;
8. no deterministic proxy-table candidates;
9. stop reasons and provider behavior;
10. independent blind comparison on the actual admitted targets.

## Important interpretation

The concurrency gate is a global resource boundary only. It does not choose a query, URL, tool, pivot, target, or stopping point inside a model-owned run. `MAX_ITER`, timeout, provider availability, schema validation, identity/provenance gates, and persistence are harness responsibilities explicitly allowed by product law.

## Next step

When the batch terminates, extract its artifact, freeze the exact admitted target set, and run the independent baseline on those exact names without exposing Apex findings. Any Apex loss becomes a research/control-plane bug investigation, not a reason to add forced hops.
