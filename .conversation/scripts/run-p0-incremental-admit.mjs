#!/usr/bin/env node
/**
 * Run the P0 incremental-admit patch from any workspace cwd.
 * pnpm --dir artifacts/api-server runs lifecycle scripts with the API
 * workspace as cwd, while apply-p0-incremental-admit.mjs resolves repo files
 * from process.cwd(). Normalize to the repository root before importing it.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(repoRoot);
await import("./apply-p0-incremental-admit.mjs");
