import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const files = {
  css: "artifacts/apex-finder/src/index.css",
  dashboard: "artifacts/apex-finder/src/pages/dashboard.tsx",
  reactor: "artifacts/apex-finder/src/pages/reactor.tsx",
  mobile: "artifacts/apex-finder/src/components/mobile-reactor-flow.tsx",
  replay: "artifacts/apex-finder/src/components/research-replay.tsx",
  mark: "artifacts/apex-finder/src/components/reactor-mark.tsx",
};
for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing frontend polish source: ${name}`);
}
const css = read(files.css);
const dashboard = read(files.dashboard);
const reactor = read(files.reactor);
const mobile = read(files.mobile);
const replay = read(files.replay);
const mark = read(files.mark);

const layout = read("artifacts/apex-finder/src/components/layout.tsx");

const checks = [
  ["dashboard desktop sidebar is content-height overlay rail", /absolute left-0 top-0/.test(layout) && /h-fit/.test(layout)],
  ["dashboard main canvas is independent of sidebar rail", /w-full min-w-0 flex-col/.test(layout) && /md:pl-\[250px\]/.test(layout) && /md:pl-0/.test(layout)],
  ["dashboard lower sections reclaim the sidebar column", /atlas-dashboard-wide/.test(dashboard) && /--atlas-sidebar-width:\s*250px/.test(css) && /--atlas-sidebar-offset/.test(css) && /inline-size:\s*100vw/.test(css) && /margin-inline-start:\s*calc\(-1 \* \(var\(--atlas-sidebar-offset, var\(--atlas-sidebar-width\)\) \+ 1\.5rem\)\)/.test(css)],
  ["dashboard shell does not clip its full-bleed rows", layout.includes("isDashboardRoute") && layout.includes('const desktopContentPadding = desktopNavOpen ? "md:pl-[250px]" : "md:pl-0";') && !layout.includes("overflow-x-hidden") && dashboard.includes("md:pl-[274px]")],
  ["dashboard hero copy is explicitly start-aligned", /atlas-dashboard-hero-copy/.test(dashboard) && /margin-inline-start:\s*0/.test(css)],
  ["home CTA has exact matching desktop rail width", /--atlas-command-width:\s*14\.75rem/.test(css) && /width:\s*calc\(var\(--atlas-depth-width\) \+ var\(--atlas-hero-gap\) \+ var\(--atlas-command-width\)\)/.test(css) && /width:\s*var\(--atlas-command-width\)/.test(css)],
  ["home depth selector remains subordinate", /--atlas-depth-width:\s*7\.625rem/.test(css) && /grid-template-columns:\s*var\(--atlas-depth-width\) var\(--atlas-command-width\)/.test(css)],
  ["Reactor uses product-specific mark", /ReactorMark/.test(dashboard) && /ReactorMark/.test(reactor) && /ReactorMark/.test(mark)],
  ["generic nuclear Reactor glyph is gone", !/☢|nuclear icon/i.test(reactor)],
  ["replay is evidence-grounded", /Recorded sources/.test(replay) && /sourceUrls|links/.test(replay) && /sourceUrlsFor/.test(replay)],
  ["replay is bounded", /slice\(0, 40\)/.test(replay)],
  ["replay supports reduced-motion through shared CSS", /prefers-reduced-motion/.test(css) && /reactor-pressable/.test(replay)],
  ["mobile replay is archive-only", /showHistory && <ResearchReplay/.test(mobile)],
  ["mobile remains feed-first", /showTopology=\{false\}/.test(mobile)],
  ["live topology remains telemetry bounded", /<ReactorActivityOnly\b/.test(reactor) && /schemeNodesFromSpans/.test(reactor) && /schemeToolsOnly/.test(reactor)],
  ["desktop live desk has explicit accessible region", /role="complementary"/.test(reactor) && /aria-label="Apex Atlas Live Desk"/.test(reactor)],
  ["mobile controls retain touch-safe targets", /--atlas-touch:\s*44px/.test(css) && /reactor-touch-target/.test(css) && /reactor-mobile-safe/.test(css)],
  ["focus ring remains explicit", /focus-visible/.test(css)],
  ["terminal state does not require animation", /atlasTerminal|reactor-terminal-banner/.test(reactor) && /prefers-reduced-motion/.test(css)],
  ["desktop shell updates document title by route", /document\.title/.test(layout) && /Apex Atlas/.test(layout)],
  ["desktop shell exposes a bypass link", /Skip to main content/.test(layout) && /id="main-content"/.test(layout)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`\nApex frontend polish contract: ${checks.length} checks passed.`);
