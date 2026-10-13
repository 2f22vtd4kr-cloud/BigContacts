---
name: Preserving Replit Git metadata
description: Import a full repository into an existing Replit checkout without replacing workspace-managed Git metadata.
---

When importing a repository into a blank Replit workspace that already has a `.git` directory, preserve that checkout and use a source remote, fetch, and branch switch/reset to bring in the repository's tracked files. Do not copy or replace the source repository's `.git` directory. Replit may block Git metadata writes unless the reviewed import sequence is run with `DANGEROUSLY_ALLOW_GIT=1`; use that only for the explicit remote/fetch/checkout operations.

**Why:** Replacing the workspace Git metadata is blocked by Replit's safeguard; importing through the existing checkout preserves Replit's Git integration. The additional opt-in is required for controlled writes to the existing `.git` metadata.

**How to apply:** Validate the source branch and commit first, then fetch the intended branch into the existing checkout. When Replit blocks the Git operation, scope `DANGEROUSLY_ALLOW_GIT=1` to that already-reviewed import sequence. Preserve workspace-local setup and conversation data.
