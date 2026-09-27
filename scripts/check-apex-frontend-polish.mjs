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
  workspaceStatus: "artifacts/apex-finder/src/components/workspace-status.tsx",
  errorNotice: "artifacts/apex-finder/src/components/apex-error-notice.tsx",
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
const workspaceStatus = read(files.workspaceStatus);
const errorNotice = read(files.errorNotice);
const reactorTouchSource = read("artifacts/apex-finder/src/components/mobile-reactor-flow.tsx");

const layout = read("artifacts/apex-finder/src/components/layout.tsx");
const router = read("artifacts/apex-finder/src/router.tsx");
const tabletSurfaces = [
  "artifacts/apex-finder/src/pages/duplicates.tsx",
  "artifacts/apex-finder/src/pages/entities.tsx",
  "artifacts/apex-finder/src/pages/graph.tsx",
  "artifacts/apex-finder/src/pages/research.tsx",
  "artifacts/apex-finder/src/pages/profile.tsx",
  "artifacts/apex-finder/src/pages/deep-search.tsx",
].map(read);

const checks = [
  ["dashboard desktop sidebar is content-height overlay rail", /absolute left-0 top-0/.test(layout) && /h-fit/.test(layout)],
  ["atlas grain is attached to the visible app canvas", /className="relative min-h-\[100dvh\]/.test(layout) && /className="atlas-noise relative z-0 flex/.test(layout) && /\.atlas-noise\s*\{[\s\S]*background-image:\s*url\("data:image\/svg\+xml/.test(css)],
    ["route canvas is shrinkable at every viewport", /\.atlas-page \{/.test(css) && /width:\s*100%/.test(css) && /max-width:\s*100%/.test(css) && /min-width:\s*0/.test(css)],
  ["all routed frontend surfaces remain registered", ["/", "/search", "/profiles", "/network", "/jobs", "/reactor", "/research", "/manual", "/profile/:id", "/improvements", "/data-sources", "/duplicates", "/osint-tools", "/status"].every((route) => router.includes(`path="${route}"`))],
  ["tablet desk switches use laptop breakpoint", tabletSurfaces.every((source) => !/(?:hidden|flex|flex-row) md:(?:hidden|flex|flex-row)/.test(source))],
  ["tablet desks avoid legacy md geometry", !tabletSurfaces[5].includes("md:w-80") && !tabletSurfaces[0].includes("md:rotate-0")],
["dashboard main canvas is independent of sidebar rail", /w-full min-w-0 flex-col/.test(layout) && /lg:pl-\[250px\]/.test(layout) && /lg:pl-0/.test(layout) && /const contentPadding = desktopContentPadding;/.test(layout)],
  ["dashboard rows stay inside the shell canvas", /atlas-dashboard-wide/.test(dashboard) && /max-width:\s*100%/.test(css) && /min-width:\s*0/.test(css) && !/inline-size:\s*100vw/.test(css) && !/atlas-sidebar-offset/.test(css)],
  ["dashboard has no rail-overlap compensation", !dashboard.includes("md:pl-[274px]") && /atlas-dashboard-wide/.test(dashboard)],
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
  ["mobile Reactor controls use 44px touch targets", /reactor-touch-target/.test(reactorTouchSource) && (reactorTouchSource.match(/reactor-touch-target/g) || []).length >= 5 && /min-h-\[44px\]/.test(reactorTouchSource)],
  ["focus ring remains explicit", /focus-visible/.test(css)],
  ["terminal state does not require animation", /atlasTerminal|reactor-terminal-banner/.test(reactor) && /prefers-reduced-motion/.test(css)],
  ["desktop shell uses laptop breakpoint for rail", /lg:flex/.test(layout) && /lg:pl-\[274px\]/.test(layout) && /lg:pl-6/.test(layout)],
  ["mobile shell remains available below laptop width", /lg:hidden/.test(layout) && /lg:hidden/.test(layout) && /lg:flex/.test(layout)],
  ["global error notice is bounded on short/mobile screens", /max-h-\[38dvh\]/.test(errorNotice) && /sm:max-h-\[min\(52dvh,360px\)\]/.test(errorNotice)],
  ["global mobile menu meets 44px touch target", /min-h-\[44px\]/.test(layout) && /min-w-\[44px\]/.test(layout) && /data-testid="button-open-menu"/.test(layout)],
  ["workspace status trigger meets 44px touch target", /min-h-\[44px\]/.test(workspaceStatus) && /data-testid="button-workspace-status"/.test(workspaceStatus)],
  ["global error notice actions meet 44px touch targets", (errorNotice.match(/min-h-\[44px\]/g) || []).length >= 2 && /min-w-\[44px\]/.test(errorNotice)],
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
