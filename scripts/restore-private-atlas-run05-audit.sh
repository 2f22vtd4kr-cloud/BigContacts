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

if [[ -s "$source_path" ]]; then
  # Prefer the workspace copy so any uncommitted operator annotations survive.
  cp "$source_path" "$tmp_source"
elif ! git show "${source_commit}:${source_path}" > "$tmp_source"; then
  echo "[restore-private-atlas-audit] Could not recover the original report from the workspace or Git history." >&2
  exit 3
fi
if [[ ! -s "$tmp_source" ]]; then
  echo "[restore-private-atlas-audit] Recovered source audit is empty; refusing to proceed." >&2
  exit 4
fi

if [[ -s "$destination" ]]; then
  source_bytes="$(wc -c < "$tmp_source" | tr -d ' ')"
  destination_bytes="$(wc -c < "$destination" | tr -d ' ')"
  if (( destination_bytes <= source_bytes )) && head -c "$destination_bytes" "$tmp_source" | cmp -s "$destination" -; then
    cp "$tmp_source" "$tmp_combined"
    mv "$tmp_combined" "$destination"
    echo "[restore-private-atlas-audit] Existing destination was a prefix; preserved it and restored the fuller workspace report."
  elif (( destination_bytes >= source_bytes )) && head -c "$source_bytes" "$destination" | cmp -s "$tmp_source" -; then
    echo "[restore-private-atlas-audit] Destination already contains the recovered report as its prefix; leaving all data unchanged."
  else
    cat "$tmp_source" > "$tmp_combined"
    printf '\n\n## Existing private-path telemetry preserved during audit recovery\n\n' >> "$tmp_combined"
    cat "$destination" >> "$tmp_combined"
    mv "$tmp_combined" "$destination"
    echo "[restore-private-atlas-audit] Combined source report and existing destination content without discarding either."
  fi
else
  cp "$tmp_source" "$destination"
  echo "[restore-private-atlas-audit] Restored the original preflight report to the private ignored destination."
fi

printf '[restore-private-atlas-audit] Destination: %s\n' "$destination"
printf '[restore-private-atlas-audit] Lines: %s; bytes: %s\n' "$(wc -l < "$destination" | tr -d ' ')" "$(wc -c < "$destination" | tr -d ' ')"
printf '[restore-private-atlas-audit] Git ignored: '
git check-ignore -q "$destination" && echo "yes" || { echo "no"; exit 5; }
