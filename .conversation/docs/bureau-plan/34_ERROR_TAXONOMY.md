# Volume 34 — Error Taxonomy

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

| Code | Layer | Operator meaning | Action |
|------|-------|------------------|--------|
| INTEGRITY_CRITICAL | health | no search or no dig LLM | fix keys |
| REDIS_EXHAUSTED_STICKY | ops | false 0/5 | PING recovery / restart API |
| LAUNCH_NOOP | jobs | jobId without work | memory fallback / lock |
| ZOMBIE_RUNNING | jobs | frozen stage | stop + sweeper |
| PARSE_FAIL | dig | bad model JSON | one repair retry |
| TOOL_KEY_MISSING | dig | observation only | do not fake success |
| PROMOTE_SKIP_COLLISION | card | identity risk | evidence kept |
| PROMOTE_SKIP_NO_URL | card | fail-closed | fix extractor |
| STATUS_TIMEOUT | ops | dig blocked event loop | yields/budgets |
| FAKE_LIVE | ui | idle shows LIVE | age-out spans |
| FORCE_REGRESSION | dig | force_ in trajectory | revert immediately |
