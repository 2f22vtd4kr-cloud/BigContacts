---
name: GitHub sync branch workflow
description: When GitHub main diverges and managed pushes reject existing branches, publish a verified sync branch and open a PR.
---

The Replit-managed Git push helper can publish a new GitHub branch but may reject updating an existing `main` branch, while direct HTTPS pushes may lack credentials. If the remote main is an ancestor of the local merge commit, publish the local result to a uniquely named sync branch and open a pull request instead of force-pushing.

**Why:** The local checkout can contain valid commits and an internal backup ref without those commits being present on the user’s GitHub default branch. A clean local status is not proof of remote publication.

**How to apply:** Before declaring work wrapped up, inspect the GitHub remote, compare hashes, and verify publication with a remote ref or PR URL. Never claim `main` was updated unless the remote hash confirms it.