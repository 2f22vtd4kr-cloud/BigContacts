#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('artifacts/apex-finder/src/pages/reactor.tsx')
s=p.read_text()
old='width: running ? "42%" :'
new='width: state?.runStatus === "done" ? "100%" : running && Number.isFinite(state?.phaseProgress) && Number(state?.phaseTotal) > 0 ? `${Math.min(Math.max((Number(state.phaseProgress) / Number(state.phaseTotal)) * 100, 0), 100)}%` : "0%",'
if old not in s:
    raise SystemExit('target not found')
s=s.replace(old,new,1)
# The original expression supplied its own done/idle suffix; remove that now-redundant suffix if present.
s=s.replace(' : state?.runStatus === "done" ? "100%" : "0%",\n            background:', '\n            background:', 1)
p.write_text(s)
PY
