---
name: Redis quota guardrails
description: Protect free-tier Upstash Redis from idle dashboard polling and exhausted-slot retry loops.
---

Free-tier Upstash is a command budget, not just a storage limit. Idle dashboards must use batched pointer reads and a cache interval at least as long as the UI poll interval; quota-exhausted slots must be disconnected and not probed repeatedly.

**Why:** Individual active-job reads and short status caches can multiply harmless page polling into a sustained command drain, while an exhausted ioredis connection can keep retrying in the background.

**How to apply:** Keep status endpoints on bounded in-process caches, use MGET for multi-job status views, and require an explicit process restart or operator action before retrying a monthly-capped Redis slot.