---
name: Preserving Replit Git metadata
description: Import a full repository into an existing Replit checkout without replacing workspace-managed Git metadata.
---

When importing a repository into a blank Replit workspace that already has a `.git` directory, preserve that checkout and use a source remote, fetch, and branch switch/reset to bring in the repository's tracked files. Do not copy or replace the source repository's `.git` directory.

**Why:** Replacing the workspace Git metadata is blocked by Replit's safeguard; importing through the existing checkout preserves Replit's Git integration.

**How to apply:** Validate the source branch and commit first, then fetch the intended branch into the existing checkout. Preserve workspace-local setup and conversation data.
