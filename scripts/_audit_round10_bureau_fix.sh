#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('artifacts/apex-finder/src/components/bureau-ops-stage.tsx')
s=p.read_text()
repls={
'    return "Working on this person";':'    return "Live research activity";',
'  const safeQuery = query && !isLogGarbage(query) && !isInternalLanePrompt(query)\n    ? query\n    : (e.targetName ? `${e.targetName}` : undefined);':'  const safeQuery = query && !isLogGarbage(query) && !isInternalLanePrompt(query)\n    ? query\n    : undefined;',
'    query: unavailable ? (e.targetName ? `${e.targetName} (search offline)` : safeQuery) : safeQuery,':'    query: unavailable ? undefined : safeQuery,',
}
for old,new in repls.items():
    if old not in s:
        raise SystemExit(f'missing bureau target: {old}')
    s=s.replace(old,new,1)
# The generic story helper must not invent a target name when the event omitted one.
s=s.replace('  const t = (e.targetName || "this person").trim();','  const t = (e.targetName || "the current case").trim();',1)
p.write_text(s)
PY
if grep -nE 'Working on this person|query: unavailable \? \(e\.targetName|: \(e\.targetName \? `\$\{e\.targetName\}`' artifacts/apex-finder/src/components/bureau-ops-stage.tsx; then exit 1; fi
