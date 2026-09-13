#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('artifacts/apex-finder/src/pages/reactor.tsx')
s=p.read_text()
old='width: running ? "42%" : state?.runStatus === "done" ? "100%" : "0%",'
new='width: state?.runStatus === "done" ? "100%" : running && state?.phaseTotal && Number.isFinite(state.phaseProgress) ? `${Math.min(Math.max((state.phaseProgress / state.phaseTotal) * 100, 0), 100)}%` : "0%",'
if old not in s: raise SystemExit('target not found')
p.write_text(s.replace(old,new,1))
PY
