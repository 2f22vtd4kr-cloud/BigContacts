# Audit — Atlas discovery context continuity — 2026-09-10

## Finding
The canonical case-discovery route correctly runs `runBureauAgenticWebPass` with a durable discovery `caseId`, so the Investigator can see and persist shared case state.

The separate public `runCanonicalAtlasPipeline()` path currently invokes `runBureauAgenticWebPass` for its initial `"Discovery slot"` without a `caseId`. The Target Investigator leaf now rejects context-free target work, but this Atlas batch discovery lane is a distinct discovery-stage operation and currently has no durable case context of its own.

This is not a fixed-research-script defect: the model still owns the discovery trajectory. It is a state/coordination defect. The initial Atlas discovery trajectory should be durable so later target work and operator review can distinguish what the Investigator actually observed from the target investigations that followed.

## Required repair
Create or reuse a durable discovery case for the Atlas job before the initial Investigator discovery pass, persist the Investigator trajectory into that case file, and expose the resulting case identifier in the Atlas job/result metadata. The discovery context must remain state, not a prescribed sequence.

Do not solve this by synthesizing a context document in the Investigator or by adding mandatory research instructions.

## Status
Open audit leaf. The case-discovery endpoint already provides the reference implementation for the durable discovery-case lifecycle.
