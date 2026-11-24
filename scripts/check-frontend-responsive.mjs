import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "artifacts", "apex-finder", "src");
const files = {
  layout: path.join(appRoot, "components", "layout.tsx"),
  legacyLayout: path.join(appRoot, "components", "layout-legacy.tsx"),
  roundLayout: path.join(appRoot, "components", "layout-round.tsx"),
  roundCss: path.join(appRoot, "flat-round.css"),
  reactor: path.join(appRoot, "pages", "reactor.tsx"),
  mobile: path.join(appRoot, "components", "mobile-reactor-flow.tsx"),
  css: path.join(appRoot, "index.css"),
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Missing frontend source: ${name} (${file})`);
}

const read = (file) => fs.readFileSync(file, "utf8");
const layout = read(files.legacyLayout);
const roundLayout = read(files.roundLayout);
const reactor = read(files.reactor);
const mobile = read(files.mobile);
const css = read(files.css);
const roundCss = read(files.roundCss);

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
  // The previous shell is intentionally retained as a rollback surface.
  ["legacy mobile drawer has viewport cap", /w-\[min\(300px,86vw\)\]/.test(layout)],
  ["legacy mobile header uses safe-area insets", /env\(safe-area-inset-(left|right|top)/.test(layout)],
  ["legacy main shell prevents flex-width blowout", /min-w-0/.test(layout)],
  ["legacy mobile nav is hidden behind laptop breakpoint", /lg:hidden/.test(layout)],
  ["legacy desktop nav has laptop breakpoint", /hidden[^\n]*lg:flex/.test(layout)],
  ["legacy mobile drawer fills the viewport", /mobile \? "h-full w-\[min\(300px,86vw\)\]"/.test(layout)],
  ["legacy mobile drawer closes on Escape and restores focus", /key === "Escape"/.test(layout) && /mobileMenuButtonRef\.current\?\.focus/.test(layout)],
  ["legacy skip link reaches the main landmark", /href="#main-content"/.test(layout) && /id="main-content"/.test(layout)],
  ["legacy collapsed desktop nav releases the content column", /desktopNavOpen \? "lg:pl-\[250px\]" : "lg:pl-0"/.test(layout) && /desktopNavOpen \? "lg:pl-\[274px\]" : "lg:pl-6"/.test(layout)],
  ["legacy sidebar is the default and Flat Round remains an explicit URL override", fs.existsSync(files.legacyLayout) && /return "legacy"/.test(read(files.layout)) && /requested === "round"/.test(read(files.layout))],

  ["legacy sidebar is the default while Flat Round remains available by explicit URL", /RoundLayout/.test(read(files.layout)) && /LegacyLayout/.test(read(files.layout)) && /return "legacy"/.test(read(files.layout)) && /requested === "round"/.test(read(files.layout))],
  ["Flat Round shell includes all five primary destinations", ["Overview", "Ledger", "Discover", "Connections", "Reactor"].every((label) => roundLayout.includes(`name: "${label}"`))],
  ["Flat Round shell uses horizontal desktop navigation and a mobile tabbar", /atlas-round-primary/.test(roundLayout) && /atlas-round-mobile-tabbar/.test(roundLayout) && /primaryNav.map/.test(roundLayout) && /aria-label="Primary navigation"/.test(roundLayout) && !/utilityNav|atlas-round-more-menu|Crosshair/.test(roundLayout)],
  ["sidebar preserves non-board utility routes without exposing them as navigation", /path="\/network\/graph"/.test(read(path.join(appRoot, "router.tsx"))) && /path="\/reactor\/topology"/.test(read(path.join(appRoot, "router.tsx"))) && !/utilityNav/.test(roundLayout)],
  ["mobile tabbar replaces desktop navigation at the phone breakpoint", /\.atlas-round-mobile-tabbar \{ display:none; \}/.test(roundCss) && /\.atlas-round-primary \{ display:none; \}/.test(roundCss) && /\.atlas-round-mobile-tabbar \{ position:fixed[^}]*display:flex/.test(roundCss)],
  ["Flat Round shell includes safe-area and constrained responsive layout", /safe-area-inset/.test(roundCss) && /min-width:0|min-w-0/.test(roundCss + roundLayout)],
  ["Flat Round design defines the paper and tincture palette", /#FAFAF8/.test(roundCss) && /#C8321E/.test(roundCss) && /#1F8A4D/.test(roundCss) && /#2757C6/.test(roundCss) && /#EDB92B/.test(roundCss)],
  ["Flat Round design respects reduced motion", /prefers-reduced-motion/.test(roundCss)],

  ["mobile reactor uses a dedicated flow surface", /MobileReactorFlow/.test(reactor)],
  ["reactor derives visible tools from observed spans", /schemeNodesFromSpans/.test(reactor)],
  ["reactor supports pointer panning", /setPointerCapture/.test(reactor)],
  ["reactor has reduced-motion handling", /prefersReducedMotion/.test(reactor) && /prefers-reduced-motion/.test(css)],
  ["mobile live state is telemetry-authoritative", /useReactorLiveTelemetry/.test(mobile) && /telemetryActivities/.test(mobile) && !/recentBureauMs|90_000|activeWindow/.test(mobile)],
  ["mobile flow has history instead of only current state", /showHistory/.test(mobile)],
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
