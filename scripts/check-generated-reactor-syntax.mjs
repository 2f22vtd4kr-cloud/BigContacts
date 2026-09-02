import fs from "node:fs";
import { transformSync } from "esbuild";

const file = "artifacts/apex-finder/src/pages/reactor.tsx";
const source = fs.readFileSync(file, "utf8");
try {
  transformSync(source, { loader: "tsx", format: "esm", sourcemap: false });
  console.log("GENERATED_REACTOR_TSX_SYNTAX_OK");
} catch (error) {
  const line = Number(error?.location?.line || 0);
  if (line > 0) {
    const lines = source.split("\n");
    const start = Math.max(1, line - 12);
    const end = Math.min(lines.length, line + 12);
    console.error(`Generated Reactor syntax context (${start}-${end}):`);
    for (let i = start; i <= end; i++) console.error(`${i}: ${lines[i - 1]}`);
  }
  throw error;
}
