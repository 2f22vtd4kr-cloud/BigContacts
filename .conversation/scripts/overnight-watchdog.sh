#!/usr/bin/env bash
# Keeps overnight-autoresearch alive for the night. Restarts on crash.
# Stop: touch /tmp/apex-overnight-STOP
set -euo pipefail
ROOT="${APEX_ROOT:-/tmp/BigContacts}"
STOP="${STOP_FILE:-/tmp/apex-overnight-STOP}"
LOG="${WATCHDOG_LOG:-/tmp/apex-watchdog.log}"
MAX_HOURS="${MAX_HOURS:-12}"
START_TS=$(date +%s)
END_TS=$((START_TS + MAX_HOURS * 3600))

export APEX_ROOT="$ROOT"
export MAX_HOURS
export GITHUB_PAT="${GITHUB_PAT:-}"
export DATABASE_URL="${DATABASE_URL:-postgresql://apex:apex_local_dev@127.0.0.1:5432/apex}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export PORT=8080
export ENABLE_AUTO_PIPELINE=false
export NODE_ENV=development
export BROWSER_FETCH_MAX_PER_CASE=8

mkdir -p /tmp
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) watchdog start max_hours=$MAX_HOURS" >>"$LOG"

ensure_api() {
  if curl -s -m 2 -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ | grep -vq 000; then
    return 0
  fi
  pkill -f 'dist/index.mjs' 2>/dev/null || true
  sleep 1
  cd "$ROOT/artifacts/api-server"
  nohup node --enable-source-maps --max-old-space-size=640 ./dist/index.mjs >>/tmp/api.log 2>&1 &
  echo $! >/tmp/api.pid
  for i in $(seq 1 25); do
    sleep 1
    if curl -s -m 2 -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ | grep -vq 000; then
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) api up" >>"$LOG"
      return 0
    fi
  done
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) api failed to start" >>"$LOG"
  return 1
}

while true; do
  if [[ -f "$STOP" ]]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) STOP file present — exiting" >>"$LOG"
    exit 0
  fi
  NOW=$(date +%s)
  if (( NOW >= END_TS )); then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) max hours reached — exiting" >>"$LOG"
    exit 0
  fi

  ensure_api || { sleep 30; continue; }

  if pgrep -f 'overnight-autoresearch.mjs' >/dev/null 2>&1; then
    sleep 60
    continue
  fi

  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) starting overnight-autoresearch" >>"$LOG"
  cd "$ROOT"
  # remaining hours for child
  REM_H=$(python3 -c "print(max(0.1, ($END_TS - $(date +%s))/3600))")
  MAX_HOURS="$REM_H" nohup node scripts/overnight-autoresearch.mjs >>/tmp/overnight-stdout.log 2>&1 &
  echo $! >/tmp/overnight.pid
  sleep 90
done
