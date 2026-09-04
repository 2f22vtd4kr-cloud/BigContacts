---
name: Build hardening idempotence
description: Build-time Apex hardening scripts can repeat source-level comments across rebuilds.
---

Build-time hardening must be treated as source-mutating and verified for
idempotence before repeated API builds.

**Why:** The managed API build completed successfully but repeated a
source-level discovery guard comment, leaving unrelated uncommitted diffs.

**How to apply:** After a managed API build, inspect the working tree and
remove only repeated generated text before final verification; do not rerun the
build during that cleanup unless the hardening scripts have been made
idempotent.