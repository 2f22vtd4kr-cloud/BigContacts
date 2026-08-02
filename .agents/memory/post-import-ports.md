---
name: Post-import port conflicts
description: Orphaned Node/Vite processes hold ports 8080 and 23695 after the manual "Start application" workflow is removed; must be killed before artifact-managed workflows can bind.
---

## Rule
After any session where a manual combined workflow (e.g. `PORT=8080 ... & PORT=23695 ...`) was used, killing that workflow leaves orphaned processes holding the ports. The artifact-managed workflows will fail with `EADDRINUSE` until those processes are cleared.

**Why:** Replit's workflow kill sends SIGTERM to the shell wrapper, but the background `&` child (one of the two servers) may not receive it and continues holding the port.

## How to apply
Before restarting artifact-managed workflows after removing a manual workflow:

```bash
kill -9 $(lsof -ti:8080 -ti:23695 2>/dev/null) 2>/dev/null; echo "ports cleared"
```

Then restart the artifact workflows normally. Verify with `curl localhost:8080/api/healthz`.
