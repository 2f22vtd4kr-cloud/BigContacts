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
  ["mobile live state requires recent bureau activity", /recentBureauMs/.test(mobile) && /90_000/.test(mobile)],
  ["mobile flow has history instead of only current state", /showHistory/.test(mobile)],
  ["page shell clips horizontal overflow", /overflow-x: clip/.test(css)],
  ["page shell wraps long content", /overflow-wrap: anywhere/.test(css)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}

// Guard against the exact UX regression called out in Volume 15: the live UI
// must not invent a fixed six-step trajectory. This is intentionally a source
// check, not a runtime claim about the model.
const fixedStepLanguage = /(?:step|window)\s+\$?\{?\w*\}?\s*(?:of|\/)\s*(?:6|6\b|planned)/i;
if (fixedStepLanguage.test(reactor) || fixedStepLanguage.test(mobile)) {
  console.error("FAIL  fixed-step/window language detected in production reactor source");
  failed = true;
} else {
  console.log("PASS  no obvious fixed-step/window progress copy in production reactor source");
}

if (failed) process.exit(1);
console.log(`\nFrontend responsive contract: ${checks.length + 1} checks passed.`);
