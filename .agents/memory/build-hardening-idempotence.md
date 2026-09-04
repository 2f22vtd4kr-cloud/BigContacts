---
name: Build hardening idempotence
description: Build-time Apex hardening scripts can repeat source-level comments across rebuilds.
---

Build-time hardening must be treated as source-mutating and verified for
idempotence before repeated API builds; use a semantic source marker rather
than a brittle regex fragment when deciding whether a guard is already present.

**Why:** The managed API build completed successfully but repeated a
source-level discovery guard comment because its presence check did not match
the emitted source, leaving unrelated uncommitted diffs.

**How to apply:** After changing a hardening script, run it twice and confirm
the source diff is unchanged; after a managed API build, inspect the tree
before final verification.