#!/usr/bin/env bash
# Fail if dig controller force_* patterns reappear in agentic dig path (Vol 15 / 27 / 101).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIG="$ROOT/artifacts/api-server/src/src/lib/agentic-web-research.ts"
if [[ ! -f "$DIG" ]]; then
  echo "missing $DIG"
  exit 1
fi
if grep -nE 'force_(company|related|visit|search|hop)|GROK-PARITY|force_company_surface' "$DIG"; then
  echo "FAIL: force_* dig controller pattern found in agentic-web-research.ts"
  exit 1
fi
echo "OK: no force_* dig controllers in agentic-web-research.ts"
