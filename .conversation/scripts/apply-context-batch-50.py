#!/usr/bin/env python3
"""Append Batch 50 to docs/context.md and refresh tip floor."""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CTX = ROOT / "docs/context.md"

BATCH = """

### 2026-09-02 Batch 50 — Replit live setup feedback → repo fixes
A Replit Agent run (operator pasted the updated setup prompt into the Apex Atlas App) reached tip `6ea0d44`, installed after lockfile host rewrite to registry.npmjs.org, pushed DB schema, built desk/API, and passed `check:no-force-dig` / `check:free-react`. Operator stopped the bounded discovery seed before Dig/scoreboard; setup left in manual-launch mode with non-blank preview.

**Real defects exposed by that run (not operator error):**
1. `@workspace/api-server` `package.json` had `dev`/`build` but **no `start` script**, while `scripts/replit-boot.sh` ends with `pnpm --filter @workspace/api-server run start`. Boot could not start the API from the documented path.
2. Permanent bureau Redis (`REDIS_URL_1`) is deferred unless `ENABLE_AUTO_PIPELINE` or `ENABLE_REDIS_ON_BOOT` is true. With the safe floor `ENABLE_AUTO_PIPELINE=false`, healthz reported Redis `not_connected` even when Upstash `REDIS_URL_1` was correctly set — until an Atlas launch called `enablePermanentRedis()`. That confused the Replit health step.
3. Operators often configure only `REDIS_URL_1` (runbook allows alias). Local-cache `REDIS_URL` was empty; boot should alias when appropriate.

**Fixed on main:**
- `artifacts/api-server/package.json` — add `"start": "node --enable-source-maps ./dist/index.mjs"` (commit `881f662`).
- `scripts/replit-boot.sh` — default `ENABLE_REDIS_ON_BOOT=true`; if `REDIS_URL` unset and `REDIS_URL_1` set, export `REDIS_URL=$REDIS_URL_1` so a single Upstash secret satisfies health + permanent store (commit `c2a8b93`).

**Not claimed:** Replit did not complete seed admits or single-target Dig scoreboard. That remains operator-initiated proof. Desk syntax issue reported mid-build was fixed in the App workspace; if it reappears, treat as apply-script/checkout corruption and re-pull clean tip.

**Operator next:** `git pull origin main` (tip ≥ `c2a8b93`), rebuild API if needed, restart API Server only, re-check `/api/healthz`. Launch Apex manually when ready.
"""


def main() -> None:
    text = CTX.read_text()
    if "Batch 50" in text:
        print("ALREADY")
        return
    text = re.sub(
        r"\*\*Current tip floor:\*\*[^\n]+",
        "**Current tip floor:** `c2a8b93ff9e9743af3935d9563464952c656e43a` or newer "
        "(Batch 50 Replit boot: api-server start + REDIS_URL_1 on boot)",
        text,
        count=1,
    )
    CTX.write_text(text.rstrip() + BATCH)
    print("OK Batch 50")


if __name__ == "__main__":
    main()
