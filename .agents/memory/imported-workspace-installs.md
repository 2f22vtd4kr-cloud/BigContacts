---
name: Imported workspace installs
description: Replit setup behavior for imported pnpm workspaces with stale internal registry tarball URLs.
---

For imported pnpm workspaces whose lockfile tarballs reference an unreachable internal proxy, a lockfile-disabled install against the public npm registry can restore dependencies without changing the repository lockfile.

**Why:** The imported workspace's lockfile may preserve proxy tarball URLs even when the registry setting is changed, causing dependency installation to time out before any packages are installed.

**How to apply:** Preserve the existing lockfile and workspace structure; use the repository's documented constrained pnpm install strategy with lockfile reading and writing disabled only when those proxy URLs are unreachable. Re-run the normal database push, builds, and integrity checks afterward.