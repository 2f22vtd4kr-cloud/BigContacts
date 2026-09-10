import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
if (!fs.existsSync(targetPath)) throw new Error(`Free-ReAct opening repair: missing ${targetPath}`);

let source = fs.readFileSync(targetPath, "utf8");
const before = source;

// These are the two known opening seeds. They are replaced with neutral state;
// the first model turn then receives objective + durable context + capabilities
// without a deterministic tool instruction.
source = source.replace(/Begin\. Choose an initial web_search query — do not wait for instructions\./g, "No prior observation is available; choose the next action from the capabilities and case context.");
source = source.replace(/\(none — begin with web_search\)/gi, "(no prior observation)");

if (source === before) {
  if (/forced.*web_search|initial.*web_search/i.test(source)) {
    throw new Error("Free-ReAct opening repair: known opening defect remains but exact anchors were not found; refusing ambiguous mutation");
  }
  console.log("Free-ReAct opening repair: no known opening seed present; source already clean");
} else {
  fs.writeFileSync(targetPath, source);
  console.log("Free-ReAct opening repair: removed deterministic initial web_search seeds");
}

if (/Begin\. Choose an initial web_search query/i.test(source) || /\(none — begin with web_search\)/i.test(source)) {
  throw new Error("Free-ReAct opening repair: forced initial web_search seed remains after mutation");
}
