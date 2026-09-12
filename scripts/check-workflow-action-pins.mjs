import fs from "node:fs";
import path from "node:path";

const workflowDir = path.join(process.cwd(), ".github", "workflows");
const files = fs.readdirSync(workflowDir).filter((name) => /\.(ya?ml)$/.test(name));
const violations = [];
const usePattern = /uses:\s*([^\s#]+)/g;

for (const file of files) {
  const source = fs.readFileSync(path.join(workflowDir, file), "utf8");
  for (const match of source.matchAll(usePattern)) {
    const action = match[1];
    if (/^(?:docker|ghcr\.io|local\/)/.test(action)) continue;
    const ref = action.split("@")[1] ?? "";
    if (!/^[0-9a-f]{40}$/i.test(ref)) violations.push(`${file}: ${action}`);
  }
}

if (violations.length) {
  console.error("WORKFLOW ACTION PINNING: FAIL");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log(`WORKFLOW ACTION PINNING: PASS (${files.length} workflow files checked)`);
