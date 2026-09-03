import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(repoRoot, "artifacts/apex-finder/src/pages/reactor.tsx");
const source = fs.readFileSync(file, "utf8");
const esbuildCandidates = [
  path.join(repoRoot, "node_modules/.pnpm/node_modules/esbuild/bin/esbuild"),
  path.join(repoRoot, "artifacts/apex-finder/node_modules/vite/node_modules/esbuild/bin/esbuild"),
];
const esbuild = esbuildCandidates.find((candidate) => fs.existsSync(candidate));
if (!esbuild) {
  throw new Error("Unable to locate the workspace-installed esbuild binary");
}
try {
  execFileSync(esbuild, [file, "--outfile=/tmp/reactor-syntax-check.js"], { stdio: ["ignore", "pipe", "pipe"] });
  console.log("GENERATED_REACTOR_TSX_SYNTAX_OK");
} catch (error) {
  const text = String(error?.stderr || "");
  console.error(text);
  const match = text.match(/reactor\.tsx:(\d+):(\d+)/);
  const line = match ? Number(match[1]) : 0;
  if (line > 0) {
    const lines = source.split("\n");
    const start = Math.max(1, line - 80);
    const end = Math.min(lines.length, line + 8);
    console.error(`Generated Reactor syntax context (${start}-${end}):`);
    for (let i = start; i <= end; i++) console.error(`${i}: ${lines[i - 1]}`);
  }
  throw error;
}
