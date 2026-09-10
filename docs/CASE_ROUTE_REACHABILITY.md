# Canonical case route reachability boundary

The live canonical research router is `artifacts/api-server/src/src/routes/research.ts`.

Its case-related graph is intentionally:

```text
research.ts
  ├── canonical-case-discovery.ts
  ├── canonical-case-continuation.ts
  ├── legacy-case-execution-retirement.ts
  └── case-data.ts
```

`research/cases.ts` is not imported or mounted by this graph. It remains in the repository only as quarantine material pending duplicate-tree/reachability cleanup.

This boundary matters because the old file contained a shadow research control plane: deterministic discovery templates, provider calls, registry selection, target parsing, secondary-surface expansion, and officer expansion. Those responsibilities must never be restored by re-mounting the file.

Any future case execution capability must enter through the model-directed Investigator control plane. Data-plane case persistence may remain deterministic, but it must not decide research strategy.
