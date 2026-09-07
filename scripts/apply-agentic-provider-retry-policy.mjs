import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(target, "utf8");

function patchProvider(name, startMarker, endMarker) {
  const start = s.indexOf(startMarker);
  const end = s.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`${name} retry-policy anchors missing`);
  let block = s.slice(start, end);
  if (!block.includes("agentic provider retry policy")) {
    const continuePattern = /(?<indent>\s*)continue;(?<tail>\s*\})/;
    const match = block.match(continuePattern);
    if (!match) throw new Error(`${name} provider rejection continue anchor missing`);
    const replacement = `${match.groups.indent}// agentic provider retry policy: a rate-limit/auth failure is not model-specific.\n` +
      `${match.groups.indent}if ([401, 403, 429].includes(resp.status)) {\n` +
      `${match.groups.indent}  if (resp.status === 429) return null;\n` +
      `${match.groups.indent}  break;\n` +
      `${match.groups.indent}}\n` +
      `${match.groups.indent}continue;${match.groups.tail}`;
    block = block.replace(continuePattern, replacement);
  }
  s = s.slice(0, start) + block + s.slice(end);
}

patchProvider(
  "Groq",
  "async function callGroqJson",
  "async function callMistralJson",
);
patchProvider(
  "Mistral",
  "async function callMistralJson",
  "/**\n * INVESTIGATOR_POOL_RETRY",
);

fs.writeFileSync(target, s);
console.log("Applied Investigator retry policy: stop provider-local model/key fan-out on 429/401/403; preserve one cross-provider transport fallback");
