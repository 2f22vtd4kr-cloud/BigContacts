# Repository Development Rules

## Main is authoritative

- `main` is the authoritative development and integration branch for this repository.
- All production fixes, architecture changes, tests, documentation, and agent work must ultimately be written into `main`.
- Agents must not treat another branch as the canonical home for completed work.
- A temporary branch may be used for experimentation, isolation, testing, or security work when necessary, but any completed change that is intended to affect the repository must be propagated into `main` before the work is considered complete.
- Before reporting completion, verify that the intended changes are actually present on `main`; do not report completion based only on a non-main branch.
- When porting changes from another branch, preserve the current contents of `main` and apply the intended changes rather than replacing or truncating unrelated work.
- After writing changes to `main`, re-read the affected files (or otherwise verify their exact repository contents) to ensure no file was truncated or partially written.
- Do not silently leave important fixes only on a feature, audit, security, or test branch.

## Apex Atlas audit work

- The Apex Atlas / Apex Finder repository work is governed by the user's current instructions and the architecture documentation in this repository.
- Do not merge or discard work merely because it originated on another branch; the requirement above means the final intended state belongs on `main`.
- Never claim tests, audits, builds, or workflows passed unless they were actually run and passed.
