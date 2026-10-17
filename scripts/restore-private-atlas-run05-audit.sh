#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

source_commit="8f388dbd8be13cd18991e2f6de34ddf6c1af86e4"
source_path="audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_05.md"
destination="private-audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_05.md"

mkdir -p "$(dirname "$destination")"
if ! git check-ignore -q "$destination"; then
  echo "[restore-private-atlas-audit] Refusing to write: destination is not git-ignored: $destination" >&2
  exit 2
fi

tmp_source="$(mktemp "${TMPDIR:-/tmp}/atlas-run05-source.XXXXXX")"
tmp_combined="$(mktemp "$(dirname "$destination")/.atlas-run05-restore.XXXXXX")"
cleanup() {
  rm -f "$tmp_source" "$tmp_combined"
}
trap cleanup EXIT

if ! git show "${source_commit}:${source_path}" > "$tmp_source"; then
  echo "[restore-private-atlas-audit] Could not recover the original report from Git history." >&2
  exit 3
fi
if [[ ! -s "$tmp_source" ]]; then
  echo "[restore-private-atlas-audit] Recovered source audit is empty; refusing to proceed." >&2
  exit 4
fi

if [[ -s "$destination" ]]; then
  source_bytes="$(wc -c < "$tmp_source" | tr -d ' ')"
  destination_bytes="$(wc -c < "$destination" | tr -d ' ')"
  if (( destination_bytes >= source_bytes )) && head -c "$source_bytes" "$destination" | cmp -s "$tmp_source" -; then
    echo "[restore-private-atlas-audit] Original report is already the file prefix; leaving all data unchanged."
  else
    cat "$tmp_source" > "$tmp_combined"
    printf '\n\n## Existing private-path telemetry preserved during audit recovery\n\n' >> "$tmp_combined"
    cat "$destination" >> "$tmp_combined"
    mv "$tmp_combined" "$destination"
    echo "[restore-private-atlas-audit] Restored original report first and appended pre-existing destination content without discarding it."
  fi
else
  cp "$tmp_source" "$destination"
  echo "[restore-private-atlas-audit] Restored the original preflight report to the private ignored destination."
fi

printf '[restore-private-atlas-audit] Destination: %s\n' "$destination"
printf '[restore-private-atlas-audit] Lines: %s; bytes: %s\n' "$(wc -l < "$destination" | tr -d ' ')" "$(wc -c < "$destination" | tr -d ' ')"
printf '[restore-private-atlas-audit] Git ignored: '
git check-ignore -q "$destination" && echo "yes" || { echo "no"; exit 5; }
