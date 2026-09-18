# Apex Investigator Failure Observatory

The observatory is a diagnostic surface, not a leaderboard. It consumes recorded research-run artifacts and preserves the distinction between:

- system failure,
- insufficient evidence,
- wrong answer,
- unsupported claim,
- misattribution,
- source-quality error,
- inefficient trajectory.

## Required failure record

Each material failure has a stable failure id, run/case identity, failure class, severity, supporting observation ids, description, root cause and optional regression case.

## Triage loop

1. Record the failure without rewriting the original trajectory.
2. Classify it using the canonical taxonomy.
3. Link the observations that demonstrate the failure.
4. Identify the smallest root cause supported by evidence.
5. Create a grounded regression case when the failure is generalizable.
6. Fix code/prompt/policy.
7. Re-run the affected case class and the full baseline.
8. Retain the before/after artifacts.

No failure record may be silently converted into a passing result.
