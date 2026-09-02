#!/usr/bin/env bash
set -euo pipefail
export CI=true
export PORT="${PORT:-8080}"
export ENABLE_AUTO_PIPELINE="${ENABLE_AUTO_PIPELINE:-false}"
export APEX_SKIP_SEMANTIC="${APEX_SKIP_SEMANTIC:-1}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
export NPM_CONFIG_REGISTRY="${NPM_CONFIG_REGISTRY:-https://registry.npmjs.org}"
# Single Upstash secret is enough: REDIS_URL_1 is the bureau permanent store.
# Healthz probes permanent Redis; without ENABLE_REDIS_ON_BOOT, manual mode
# defers connect and health looks "not_connected" until first Atlas launch.
export ENABLE_REDIS_ON_BOOT="${ENABLE_REDIS_ON_BOOT:-true}"
# Optional local-cache alias: if only REDIS_URL_1 is set, reuse it for REDIS_URL.
if [[ -z "${REDIS_URL:-}" && -n "${REDIS_URL_1:-}" ]]; then
  export REDIS_URL="${REDIS_URL_1}"
fi
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
echo "[replit-boot] $(git log -1 --oneline 2>/dev/null || echo unknown)"
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 1
pnpm --filter @workspace/db run push
if [[ ! -f artifacts/apex-finder/dist/public/index.html ]]; then
  pnpm --dir artifacts/apex-finder run build
fi
test -f artifacts/apex-finder/dist/public/index.html
pnpm --dir artifacts/api-server run build
exec pnpm --filter @workspace/api-server run start
