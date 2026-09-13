#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('artifacts/apex-finder/src/pages/reactor.tsx')
s=p.read_text()
replacements = {
    'resultSummary: "Working on this person", timestamp, raw: text,': 'resultSummary: "", timestamp, raw: text,',
    'resultSummary: cleaned.length > 8 && cleaned.length < 160 ? cleaned : "Working on this person",': 'resultSummary: cleaned.length > 8 && cleaned.length < 160 ? cleaned : "",',
}
for old, new in replacements.items():
    if old not in s:
        raise SystemExit(f'target not found: {old}')
    s=s.replace(old,new,1)
p.write_text(s)
PY
if grep -nE 'Working on this person|Math\.min\(100,\s*42\)|width:\s*"42%"' artifacts/apex-finder/src/pages/reactor.tsx; then
  echo 'Synthetic Reactor live-state fiction remains' >&2
  exit 1
fi
