#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('artifacts/apex-finder/src/components/bureau-ops-stage.tsx')
s=p.read_text()
s=s.replace('"Working on this person"','"Live research activity"')
s=s.replace('  const t = (e.targetName || "this person").trim();','  const t = (e.targetName || "the current case").trim()')
# Explicit query contract: absent recorded query means absent query, never targetName.
s=s.replace('  const safeQuery = query && !isLogGarbage(query) && !isInternalLanePrompt(query)\n    ? query\n    : (e.targetName ? `${e.targetName}` : undefined);','  const safeQuery = query && !isLogGarbage(query) && !isInternalLanePrompt(query)\n    ? query\n    : undefined;')
s=s.replace('    query: unavailable ? (e.targetName ? `${e.targetName} (search offline)` : safeQuery) : safeQuery,','    query: unavailable ? undefined : safeQuery,')
p.write_text(s)
PY
if grep -nE 'Working on this person|query: unavailable \? \(e\.targetName|: \(e\.targetName \? `\$\{e\.targetName\}`' artifacts/apex-finder/src/components/bureau-ops-stage.tsx; then exit 1; fi
