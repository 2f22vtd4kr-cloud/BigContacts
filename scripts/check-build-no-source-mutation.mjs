import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJsonPaths = [];
const ignored = new Set(["node_modules", ".git", "dist", "build", ".cache", ".turbo"]);
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === "package.json") packageJsonPaths.push(full);
  }
}
walk(root);

const failures = [];
const packages = [];
for (const packagePath of packageJsonPaths) {
  try {
    const parsed = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    packages.push({ path: path.relative(root, packagePath), scripts: parsed.scripts ?? {} });
  } catch (error) {
    failures.push(`could not parse ${path.relative(root, packagePath)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const scriptText = packages.flatMap(({ path: packagePath, scripts }) => Object.entries(scripts).map(([name, value]) => `${packagePath}:${name}=${String(value)}`)).join("\n");
const workflowDir = path.join(root, ".github", "workflows");
const workflowText = fs.existsSync(workflowDir)
  ? fs.readdirSync(workflowDir).filter((name) => /\.(?:yml|yaml)$/.test(name)).map((name) => fs.readFileSync(path.join(workflowDir, name), "utf8")).join("\n")
  : "";

// A workflow may legitimately mention apply-* files in path filters so that
// changing a migration helper triggers the verification gate. Only executable
// command forms constitute a build-time source mutation.
const workflowCommands = workflowText.split(/\r?\n/).map((line) => line.replace(/#.*$/, "")).join("\n");
const invokesMutator = /\b(?:node|pnpm|npm|yarn)\s+(?:[^\n]*\s)?scripts\/apply-[a-z0-9-]+\.mjs\b/i.test(workflowCommands);
const packageInvokesMutator = /\b(?:node|pnpm|npm|yarn)\s+(?:[^\n]*\s)?scripts\/apply-[a-z0-9-]+\.mjs\b/i.test(scriptText) || /execFileSync\([^\n]*apply-[a-z0-9-]+\.mjs/i.test(scriptText);

if (packageInvokesMutator || invokesMutator) {
  failures.push("a package lifecycle/build/test script or GitHub workflow invokes a source-mutating scripts/apply-*.mjs helper");
}

if (failures.length) {
  console.error("BUILD SOURCE MUTATION: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`BUILD SOURCE MUTATION: PASS — inspected ${packages.length} package.json script surfaces and GitHub workflows; no apply-* source mutator is executable from build/test automation`);
