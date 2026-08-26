# Replit boot (credit-efficient)

Public app is `/` (HTML desk). Never open `/api` as the app.

## One workflow
API Server only → `bash scripts/replit-boot.sh`

## Install once
```bash
export CI=true NODE_OPTIONS=--max-old-space-size=2048 APEX_SKIP_SEMANTIC=1
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org

pnpm install --no-frozen-lockfile --no-optional \
  --filter @workspace/api-server... \
  --filter apex-finder-local... \
  --filter @workspace/db...

pnpm add -D esbuild@0.27.3 esbuild-plugin-pino --filter @workspace/api-server --no-optional
pnpm add @esbuild/linux-x64@0.27.3 --filter @workspace/api-server --filter apex-finder-local --no-optional
pnpm add @rollup/rollup-linux-x64-gnu --filter apex-finder-local --no-optional
pnpm add lightningcss-linux-x64-gnu --filter apex-finder-local --no-optional || true
pnpm add @tailwindcss/oxide-linux-x64-gnu --filter apex-finder-local --no-optional || true

# Do NOT install transformers / onnx / sharp on free Replit
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
bash scripts/replit-boot.sh
```

## Launch lock
getActiveJob is Redis-only. Soft-zombie clears only if pointer still matches that jobId.
UI Launch retries once after stop + DELETE lock.
