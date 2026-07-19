#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
bash scripts/check-no-synthetic-data.sh
