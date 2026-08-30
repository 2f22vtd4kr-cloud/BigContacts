# Apex Atlas — Free-ReAct Regression Specification

## Purpose
Prevent recurrence of the class of failures in which model/tool observations are converted into fake person identities or a deterministic pipeline silently dictates research behavior.

## Invariants
1. The model selects the next research action.
2. Tool wrappers execute the selected action without rewriting it into a preferred query or hop.
3. Observations retain URL, title, source type, organization/person scope, and relevant surrounding evidence.
4. Candidate admission is an identity/provenance safety gate only.
5. Organization contacts cannot be promoted as personal contacts merely because an email/phone exists.
6. A malformed label cannot become a person through field concatenation.
7. No forced `force_*` action may be used as a substitute for model judgment.
8. No fame/richness ranking may determine discovery admission.
9. Practical reachability is a research objective and reasoning consideration, not a scripted blacklist.
10. Every batch is auditable through structured telemetry.

## Required adversarial cases
The test corpus must include pages containing strings resembling:
- `com EMAIL`
- `President PERSON`
- `State St`
- `Operational Enablement`
- `Product Comparisons Sage Products`
- generic job titles
- organization names
- navigation labels
- email/phone field names
- billionaire/Forbes list boilerplate

Expected result: no malformed string is admitted as a person solely from those labels.

## Autonomy tests
Tests must verify that changing model-selected queries/tools does not fail the system, provided the action is within the declared tool contract. Tests must reject only unsafe or invalid outputs, not enforce a preferred research route.

## Causal audit
When a malformed target is observed, determine which boundary created it:
A. source extraction
B. observation serialization
C. model output
D. candidate parser
E. identity validation
F. persistence mapping
G. card rehydration
H. telemetry rendering
The fix belongs at the earliest causal boundary that can prevent recurrence without constraining legitimate model research.

## Batch comparison
For each 10-target run, preserve the exact target IDs/names and source evidence, then perform an independent same-target research pass. Compare direct public routes, intermediary routes, source provenance, identity correctness, unsupported assertions, missed routes, and cost/tool efficiency. Never alter the Bureau target set to make the comparison favorable.

## Completion gate
A Bureau release is not considered healthy merely because builds and workflows pass. It must demonstrate clean identity binding, genuine model-selected actions, source-backed findings, correct organization/person scope, structured telemetry, and acceptable independent comparison results.
