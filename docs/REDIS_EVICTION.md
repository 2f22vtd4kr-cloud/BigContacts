# Redis TTL & eviction policy (Apex Atlas)

## App policy (code)

All cache-shaped keys get **EX TTL** so managed Redis can use **volatile-ttl** / **volatile-lru**.

| Class | TTL | Source |
|-------|-----|--------|
| Local cache | 30–120s (default 60s) | `setCache` / `REDIS_TTL_POLICY.LOCAL_DEFAULT_SECONDS` |
| Permanent cache writes | 7d default if no ttl | `permSet` |
| Jobs + logs + active pointer | 7d | `JOB_TTL` |
| Contact enrichment cache | **90d** (was infinite) | `contactCacheSet` |
| Health PING probe | 30s ok / 8s fail | process memory only |
| atlas-status / getActiveJob | 1.5s / 2s | process memory only |

## Upstash / free tier

- **maxmemory-policy** is controlled by the vendor; free DBs still enforce **command quotas**.
- Infinite-TTL keys (old contact cache) never left the working set → storage creep + no voluntary eviction.
- New contact keys expire after 90 days.

## Self-hosted recommendation

```
maxmemory-policy volatile-ttl
```

(or `volatile-lru` if access-frequency matters more than exact expiry order)

Do **not** use `noeviction` with unbounded permanent keys.

## Not Sentinel

Eviction ≠ high availability. Failover is provider HA or Redis Sentinel (separate topic).
