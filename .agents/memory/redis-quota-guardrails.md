---
name: Redis quota guardrails
description: Protect free-tier Upstash Redis from idle dashboard polling and exhausted-slot retry loops.
---

Free-tier Upstash is a command budget, not just a storage limit. Idle dashboards must use batched pointer reads and a cache interval at least as long as the UI poll interval; quota-exhausted slots must be disconnected and not probed repeatedly. A slot can report ready at boot and still exhaust on the first live job.

**Why:** Individual active-job reads and short status caches can multiply harmless page polling into a sustained command drain, while an exhausted ioredis connection can keep retrying in the background. A green startup health check is not proof that a monthly command quota remains available for research.

**How to apply:** Keep status endpoints on bounded in-process caches, use MGET for multi-job status views, and require an explicit process restart or operator action before retrying a monthly-capped Redis slot. If a live run logs command-level exhaustion, stop the run and have the operator replace the canonical Redis secret offline before restarting.