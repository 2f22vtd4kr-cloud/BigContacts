# Volume 205 — Cache Invalidation Map

| Event | Invalidate |
|-------|------------|
| promote / rehydrate | entities:list:*, dashboard:* |
| final review write | entities:list:*, dashboard:* |
| outcome honesty fix | entities:list:*, dashboard:* |
| atlas stop | atlas status cache, dig spans for job |
| entity update PATCH | entity detail + list |

## Bug

Stale list after dig looks like L-UI-HIDE. Always pair card writes with list cache clear.

