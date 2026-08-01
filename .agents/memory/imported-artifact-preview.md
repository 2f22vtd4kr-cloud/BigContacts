---
name: Imported artifact preview metadata
description: Environment behavior affecting preview screenshots after importing an existing artifact-based project
---

Imported projects may contain valid `.replit-artifact/artifact.toml` files and managed workflows while the artifact listing service still returns no registered artifacts. In that state, the preview screenshot helper cannot resolve the artifact directory even though the workflow is serving the app.

**Why:** The imported workspace can have working app routing without refreshed artifact registration metadata.

**How to apply:** Verify the app through its managed workflow logs, local/proxied HTTP health checks, and a production build; do not create duplicate artifacts or replacement workflows just to satisfy the screenshot helper.