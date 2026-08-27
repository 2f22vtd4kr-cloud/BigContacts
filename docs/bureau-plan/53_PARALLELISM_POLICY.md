# Volume 53 — Parallelism Policy

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Within one target

Parallel SERP providers OK when model requested search. Visits sequential when URL depends on prior SERP.

## Across targets

Sequential default + yieldEventLoop between targets so status plane lives.

## Caps

Token, provider rate limits, footprint CLI concurrency ≤ soft cap.
