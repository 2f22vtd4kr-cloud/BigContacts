import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(repoRoot, "artifacts/apex-finder/src/pages/reactor.tsx");
const source = fs.readFileSync(file, "utf8");
const esbuild = path.join(repoRoot, "node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/bin/esbuild");
try {
  execFileSync(process.execPath, [esbuild, file, "--loader=tsx", "--outfile=/tmp/reactor-syntax-check.js"], { stdio: "inherit" });
  console.log("GENERATED_REACTOR_TSX_SYNTAX_OK");
} catch (error) {
  const text = String(error?.stderr || "");
  const match = text.match(/reactor\.tsx:(\d+):(\d+)/);
  const line = match ? Number(match[1]) : 0;
  if (line > 0) {
    const lines = source.split("\n");
    const start = Math.max(1, line - 12);
    const end = Math.min(lines.length, line + 12);
    console.error(`Generated Reactor syntax context (${start}-${end}):`);
    for (let i = start; i <= end; i++) console.error(`${i}: ${lines[i - 1]}`);
  }
  throw error;
}
