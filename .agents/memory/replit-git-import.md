---
name: Preserving Replit Git metadata
description: Import a full repository into an existing Replit checkout without replacing workspace-managed Git metadata.
---

When importing a repository into a blank Replit workspace that already has a `.git` directory, preserve that checkout and use a source remote, fetch, and branch switch/reset to bring in the repository's tracked files. Do not copy or replace the source repository's `.git` directory, and do not clear the workspace before the protected Git import succeeds: Replit's Git safeguard does not roll back earlier file operations in the same shell command. Stage and validate the source first, attach the source remote, fetch the intended branch, then clean only after fetch succeeds and reset to that branch. Use `DANGEROUSLY_ALLOW_GIT=1` only for those reviewed remote/fetch/clean/reset operations, and preserve workspace-local setup and conversation data.

**Why:** Replacing the workspace Git metadata is blocked by Replit's safeguard; importing through the existing checkout preserves Replit's Git integration. The safeguard protects `.git` but does not make a compound shell command transactional, so cleanup must not happen before the fetch is ready to reset.

**How to apply:** Validate the source branch and commit first, fetch it into the existing checkout, then perform scoped cleanup and reset. When Replit blocks a Git operation, scope `DANGEROUSLY_ALLOW_GIT=1` to that reviewed sequence. Keep `.local`, cache, conversation, and dependency state outside cleanup.
