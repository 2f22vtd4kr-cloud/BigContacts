---
name: Cross-project run reconciliation
description: Distinguish shared external job state from a newly provisioned project's durable database when importing an app.
---

A repository import and reuse of an external Redis URL do not imply that a newly created Replit project shares the previous project's durable database. Treat active-lock state, terminal job metadata, and durable database evidence as separate sources. If the prior database is unavailable, stop rather than infer final findings, admissions, contacts, or cards from an empty new database.

**Why:** External job state can survive while project-scoped database state does not, so an empty current database cannot prove what an earlier run persisted.

**How to apply:** Before resuming a historical run after project migration, query its authoritative job record and lock read-only, identify the database it wrote to, reconcile case/event/entity counts against the API and UI, and block a new run if those records are unavailable.
