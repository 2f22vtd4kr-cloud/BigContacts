---
name: Persistent API key health
description: Shared web-header behavior for monitoring the provider key pools that power OSINT
---

The web app keeps API-key health visible in the shared header on every route. The collapsed control must communicate healthy, degraded, down, or unreachable state without requiring navigation; the expanded panel shows provider-level active, rate-limited, and missing slot counts and links to full system diagnostics.

**Why:** Provider availability directly determines OSINT coverage, so a page-local status screen is too easy to miss during research.

**How to apply:** Read `/api/system/status` through the shared frontend status helper, poll at the endpoint’s 15-second cache cadence, preserve the last good status during transient failures, and make the control usable at desktop and mobile widths.