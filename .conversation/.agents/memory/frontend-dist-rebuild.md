---
name: Frontend dist rebuild
description: Served Apex UI assets can remain stale across API workflow restarts when the frontend dist directory already exists.
---

The API workflow does not rebuild the frontend when `artifacts/apex-finder/dist/public/index.html` already exists; a source UI fix can therefore be correct but invisible in preview until the client build runs explicitly.

**Why:** A profile navigation fix appeared ineffective because the API restart reused the previous production bundle rather than compiling the changed React source.

**How to apply:** After frontend source changes, run the Apex Finder client build before restarting the API workflow and verify the served DOM or screenshot, not only the TypeScript source.