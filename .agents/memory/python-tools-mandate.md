---
name: Python tools installation mandate
description: Holehe and Maigret must be installed and verified before any research; this is now enforced at three layers.
---

# Python OSINT Tools — Mandatory Installation (permanent rule)

## The rule
Holehe and Maigret MUST be installed and verified before any research run. The app must not begin enrichment if either tool is missing.

**Why:** Maigret was present in pyproject.toml and uv.lock but was never actually installed in the runtime environment across multiple re-imports. It was silently inert — the code gracefully degraded but the user expected it to work.

## Three enforcement layers (all added permanently)

1. **`scripts/post-merge.sh` step 4/4** — `bash scripts/install-python-tools.sh` runs automatically after every GitHub import merge, right after `pnpm install` and `db push`.

2. **`startup.ts` — `verifyAndInstallPythonTools()`** — fires on every API server boot, unconditionally (before the `ENABLE_AUTO_PIPELINE` check). Checks `python3 -c "import holehe; import maigret"`. If either fails, runs the install script. Logs `✅ Python OSINT tools verified` or `❌ installation FAILED`.

3. **`scripts/install-python-tools.sh`** — already existed; installs holehe + maigret via `python3 -m pip install -q`. theHarvester is skipped (requires Python ≥3.12, env has 3.11).

## How to apply
- On every session start: confirm `✅ Python OSINT tools verified: holehe ✓  maigret ✓` appears in API server logs.
- If missing: run `bash scripts/install-python-tools.sh` directly, wait for completion.
- Do NOT skip this check and proceed with research.
