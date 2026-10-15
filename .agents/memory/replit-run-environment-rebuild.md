---
name: Run environment rebuild timeouts
description: Distinguish Replit run-environment rebuild failures from application startup failures.
---

When a workflow restart reports that the run environment timed out rebuilding, the configured app command may not have run at all. Workflow output can still show logs from an older process, so stale startup errors are not proof that the current code failed.

**Why:** During a fresh BigContacts import, multiple restarts timed out before the canonical boot command emitted logs, while the repository's frontend and API builds passed independently.

**How to apply:** Confirm the current workflow command and status, check whether any new command output exists, and run the repository build separately to isolate source failures. Replit's troubleshooting guidance recommends restarting compute from the command palette (Cmd/Ctrl+K) for a rebuild timeout; retry the managed workflow after that. Do not change application code based on old logs.
