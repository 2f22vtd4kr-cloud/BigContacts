import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJsonPaths = [];
const ignored = new Set(["node_modules", ".git", "dist", "build", ".cache", ".turbo"]);
const ALLOWED_SAFETY_MUTATOR = "scripts/apply-investigator-ui-source-boundary.mjs";
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

const scriptEntries = packages.flatMap(({ path: packagePath, scripts }) =>
  Object.entries(scripts).map(([name, value]) => ({ packagePath, name, value: String(value) }))
);
const scriptText = scriptEntries.map(({ packagePath, name, value }) => `${packagePath}:${name}=${value}`).join("\n");

const invokedMutators = [...scriptText.matchAll(/\b(?:node|pnpm|npm|yarn)\s+(?:[^\n]*\s)?(scripts\/apply-[a-z0-9-]+\.mjs)\b/gi)].map((m) => m[1]);
const disallowed = invokedMutators.filter((name) => name !== ALLOWED_SAFETY_MUTATOR);
if (disallowed.length) {
  failures.push(`package lifecycle/build/test scripts invoke disallowed source mutators: ${[...new Set(disallowed)].join(", ")}`);
}

const allowedUses = scriptEntries.filter(({ value }) => value.includes(ALLOWED_SAFETY_MUTATOR));
if (allowedUses.some(({ packagePath }) => packagePath !== "artifacts/apex-finder/package.json")) {
  failures.push(`${ALLOWED_SAFETY_MUTATOR} is executable outside artifacts/apex-finder/package.json`);
}
const safetyScriptPath = path.join(root, ALLOWED_SAFETY_MUTATOR);
if (!fs.existsSync(safetyScriptPath)) {
  failures.push(`missing allowlisted safety helper: ${ALLOWED_SAFETY_MUTATOR}`);
} else {
  const safetyScript = fs.readFileSync(safetyScriptPath, "utf8");
  // Keep this guard focused on the contract rather than exact regex syntax:
  // the helper must target only the Investigator source catalogue and state
  // that Investigator research is the supported research control plane.
  const hasBoundaryTarget = safetyScript.includes("artifacts/apex-finder/src/pages/data-sources.tsx");
  const hasCanonicalMarker = safetyScript.includes("Investigator research is the only supported research control plane");
  if (!hasBoundaryTarget || !hasCanonicalMarker) {
    failures.push(`${ALLOWED_SAFETY_MUTATOR} no longer matches the narrow UI research-boundary contract`);
  }
}

if (failures.length) {
  console.error("BUILD SOURCE MUTATION: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`BUILD SOURCE MUTATION: PASS — inspected ${packages.length} package.json script surfaces; arbitrary source mutators are forbidden and the sole allowlisted mutation is a safety-only Investigator UI boundary sanitizer`);
