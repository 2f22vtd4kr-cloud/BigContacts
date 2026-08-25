# Replit boot (do not improvise)

## Hard rules
- API **only** on port **8080** (serves desk at `/` and API at `/api/`)
- Desk package name: **`apex-finder-local`**
- Build desk: `pnpm --dir artifacts/apex-finder run build`
- Build API: `pnpm --dir artifacts/api-server run build`
- **No** Frontend workflow · **No** preview on `/api` · **No** Whoxy
- **One** Redis: `REDIS_URL_1`
- `ENABLE_AUTO_PIPELINE=false`
- Do **not** hand-edit dependency version ranges
- ONNX / transformers are **optional** — skip with `--no-optional` if memory is tight

## Install (filtered, public npm)
```bash
export CI=true
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org
pnpm config set fetch-timeout 600000
pnpm config set network-concurrency 1

# Prefer WITH optional so esbuild/rollup Linux binaries install:
CI=true pnpm install --registry=https://registry.npmjs.org --no-frozen-lockfile --fetch-timeout=600000 \
  --filter apex-finder-local... --filter @workspace/api-server... --filter @workspace/db...

# If memory dies on optional ML, retry same command with --no-optional
# then add platform binaries only:
#   pnpm add --filter @workspace/api-server @esbuild/linux-x64
#   pnpm add --filter apex-finder-local @rollup/rollup-linux-x64-gnu
```

## Build + run
```bash
pnpm --filter @workspace/db run push || true
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
# Start API Server workflow only on 8080
curl -sS http://127.0.0.1:8080/api/healthz | head -c 500
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/
```

## Secrets (one batch)
`REDIS_URL_1` `DATABASE_URL` `GROQ_API_KEY` `GEMINI_API_KEY` `NVIDIA_NIM_API_KEY`  
`SERPER_API_KEY` `TAVILY_API_KEY` `EXA_API_KEY` `EXA_API_KEY_2` `SERPAPI_API_KEY`  
`SCRAPFLY_API_KEY` `ZENROWS_API_KEY` `COMPANIES_HOUSE_API_KEY` `WHOISJSON_API_KEY`  
`MISTRAL_API_KEY` `HF_TOKEN` `ENABLE_AUTO_PIPELINE=false`  
**No WHOXY.**

## Stop when
Desk HTML at `/` + healthz 200. Do not Launch research unless asked.
