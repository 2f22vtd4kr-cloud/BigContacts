---
name: GitHub import proxy limits
description: Constraints and recovery options when importing a repository through the connected GitHub proxy.
---

When importing a repository through the connected GitHub integration, archive endpoints may return 403 and high-concurrency Git blob requests may return 429 even while the normal GitHub rate-limit endpoint reports capacity. Prefer a read-only `git fetch` when the repository is publicly reachable; otherwise batch text reads through GraphQL and reserve blob requests for binary or truncated files.

**Why:** The connector proxy can apply endpoint- and burst-specific limits that are not reflected in the standard GitHub core quota.

**How to apply:** Verify the exact branch and commit first, avoid retry storms, keep the complete import in a temporary directory until it is validated, and align local Git metadata only after the source snapshot is complete.