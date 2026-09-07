#!/usr/bin/env python3
"""Make discovery timeout outcomes explicitly degraded.

A discovery slot that reaches the agentic hard timeout is not a successful
completion. This patch is intentionally narrow: it changes only the
DiscoveryAgent status classification and leaves model-owned admission intact.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / "artifacts/api-server/src/src/lib/discovery-agent.ts"

text = D.read_text()
old = 'if (result.status === "unavailable" || result.status === "error") degraded = true;'
new = 'if (result.status === "unavailable" || result.status === "error" || result.status === "timeout") degraded = true;'

if old in text:
    D.write_text(text.replace(old, new, 1))
    print("PATCHED discovery timeout degradation")
elif new in text:
    print("ALREADY_PATCHED")
else:
    raise SystemExit("refusing to patch: expected discovery status gate was not found")

check = D.read_text()
if new not in check:
    raise SystemExit("timeout degradation patch did not land")
