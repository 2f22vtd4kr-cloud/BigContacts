---
name: Contact persistence guardrails
description: Durable rule for keeping alternate writes and merges from bypassing public-contact validation.
---

Every path that persists or restores contact data must sanitize email, phone, and social values before writing PostgreSQL, evidence, Redis, or metadata. Never trust an incoming cached confidence score or a module-local score; recompute personal Access confidence from the cleaned vectors and entity type.

**Why:** Alternate enrichment routes, Redis restore, startup maintenance, and entity merge logic can otherwise reintroduce stale or invalid contacts after the primary enrichment path has been hardened.

**How to apply:** Keep the shared validators at every persistence boundary. On merges and maintenance, recompute contact outcome and `isHot` from the sanitized person-level direct vectors; organization contacts and generic/shared channels must remain outside personal Access.