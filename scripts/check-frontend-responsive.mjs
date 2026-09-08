import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "artifacts", "apex-finder", "src");
const files = {
  layout: path.join(appRoot, "components", "layout.tsx"),
  reactor: path.join(appRoot, "pages", "reactor.tsx"),
  mobile: path.join(appRoot, "components", "mobile-reactor-flow.tsx"),
  css: path.join(appRoot, "index.css"),
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Missing frontend source: ${name} (${file})`);
}

const read = (file) => fs.readFileSync(file, "utf8");
const layout = read(files.layout);
const reactor = read(files.reactor);
const mobile = read(files.mobile);
const css = read(files.css);

const sourceFiles = [];
function collectSourceFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) sourceFiles.push(full);
  }
}
collectSourceFiles(appRoot);
const appSource = sourceFiles.map(read).join("\n");

const checks = [
  ["mobile drawer has viewport cap", /w-\[min\(300px,86vw\)\]/.test(layout)],
  ["mobile header uses safe-area insets", /env\(safe-area-inset-(left|right|top)/.test(layout)],
  ["main shell prevents flex-width blowout", /min-w-0/.test(layout)],
  ["mobile nav is hidden behind md breakpoint", /md:hidden/.test(layout)],
  ["desktop nav has md breakpoint", /hidden[^\n]*md:flex/.test(layout)],
  ["mobile reactor uses a dedicated flow surface", /MobileReactorFlow/.test(reactor)],
  ["reactor derives visible tools from observed spans", /schemeNodesFromSpans/.test(reactor)],
  ["reactor supports pointer panning", /setPointerCapture/.test(reactor)],
  ["reactor has reduced-motion handling", /prefersReducedMotion/.test(reactor) && /prefers-reduced-motion/.test(css)],
  ["mobile live state is telemetry-authoritative", /useReactorLiveTelemetry/.test(mobile) && /telemetryActivities/.test(mobile) && !/recentBureauMs|90_000|activeWindow/.test(mobile)],
  ["mobile flow has history instead of only current state", /showHistory/.test(mobile)],
  // Layout owns the page-level clipping surface with overflow-hidden. Individual
  // horizontal strips intentionally opt into overflow-x-auto where needed.
  ["page shell clips horizontal overflow", /overflow-hidden/.test(layout)],
  ["page shell wraps long content", /break-words|break-all|overflow-wrap\s*:\s*anywhere/.test(appSource)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}

const fixedStepLanguage = /(?:step|window)\s+\$?\{?\w*\}?\s*(?:of|\/)\s*(?:6|6\b|planned)/i;
if (fixedStepLanguage.test(reactor) || fixedStepLanguage.test(mobile)) {
  console.error("FAIL  fixed-step/window language detected in production reactor source");
  failed = true;
} else {
  console.log("PASS  no obvious fixed-step/window progress copy in production reactor source");
}

if (failed) process.exit(1);
console.log(`\nFrontend responsive contract: ${checks.length + 1} checks passed.`);