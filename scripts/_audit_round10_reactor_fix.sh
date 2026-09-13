#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('artifacts/apex-finder/src/pages/reactor.tsx')
s=p.read_text()
old='"Working on this person"'
count=s.count(old)
if count == 0:
    raise SystemExit('synthetic live-copy literal not found')
s=s.replace(old,'""')
p.write_text(s)
PY
if grep -nE 'Working on this person|Math\.min\(100,\s*42\)|width:\s*"42%"' artifacts/apex-finder/src/pages/reactor.tsx; then
  echo 'Synthetic Reactor live-state fiction remains' >&2
  exit 1
fi
