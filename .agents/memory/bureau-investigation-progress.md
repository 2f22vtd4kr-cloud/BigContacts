---
name: Bureau investigation progress
description: Sentient contact-vector coverage for Case Bureau without rigid pipelines.
---

Apex Atlas Case Bureau tracks standard contact vectors (email, phone, LinkedIn, Instagram, Twitter/X, Telegram, TikTok, website, registries, username footprint) via `investigationProgress`.

**Auto-apply:** `node scripts/apply-bureau-progress.mjs` (also `scripts/post-merge.sh` step 5). Idempotent. Do not ask the human to paste manual wiring tasks.

**Why:** Boss and right-hand must not forget Instagram, Telegram, phones, Sherlock/Maigret, and registries while chasing one hypothesis.

**Rules:** Real public data only. All routes visible. Verified personal marked in UI. Adaptive gap-driven actions — not a fixed ordered pipeline.
