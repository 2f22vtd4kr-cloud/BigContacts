import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "artifacts", "apex-finder", "src");
const files = {
  model: path.join(src, "lib", "reactor-live-model.ts"),
  store: path.join(src, "lib", "reactor-live-store.ts"),
  activity: path.join(src, "components", "reactor-activity-only.tsx"),
  surface: path.join(src, "components", "reactor-live-surface.tsx"),
  bureau: path.join(src, "components", "bureau-ops-stage.tsx"),
  page: path.join(src, "pages", "reactor.tsx"),
  mobile: path.join(src, "components", "mobile-reactor-flow.tsx"),
  hook: path.join(src, "lib", "use-bureau-live.ts"),
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Missing Reactor Live source: ${name} (${file})`);
}

const read = (file) => fs.readFileSync(file, "utf8");
const model = read(files.model);
const store = read(files.store);
const activity = read(files.activity);
const surface = read(files.surface);
const bureau = read(files.bureau);
const page = read(files.page);
const mobile = read(files.mobile);
const hook = read(files.hook);

const legacyCanvasMarker = "Scheme canvas — standby/explanatory only; live mode uses telemetry activity above";
const activityMarker = "<ReactorActivityOnly";
const staticCanvasIsExplicitlyStandby = /!isLive\s*&&\s*\(\s*(?:<>\s*)?\{\/\*\s*Scheme canvas/.test(page) && page.includes(legacyCanvasMarker);
const staticCanvasIsAfterLiveSurface = (() => {
  const liveAt = page.indexOf(activityMarker);
  const canvasAt = page.indexOf(legacyCanvasMarker);
  return liveAt >= 0 && canvasAt > liveAt;
})();
const pageNoLongerBuildsDuplicateLiveEventModel = !/const reactorLiveEvents\s*=|deskEvents\.map\(\(event/.test(page);

const checks = [
  ["live model has explicit research-query extraction", /explicitResearchQuery/.test(model)],
  ["live model rejects non-HTTP evidence", /https\?:/.test(model) && /sourceList/.test(model)],
  ["live model normalizes DigSpan collections once", /normalizeLiveActivities/.test(model)],
  ["shared live store uses useSyncExternalStore", /useSyncExternalStore/.test(store) && /subscribe/.test(store)],
  ["shared store uses canonical active-job and trace projections", /job\/active\/atlas-run/.test(store) && /atlas-trace/.test(store)],
  ["shared store explicitly documents retired atlas-status", /atlas-status was intentionally retired/.test(store)],
  ["graph consumes shared telemetry store", /useReactorLiveTelemetry/.test(activity)],
  ["graph renders only active tool spans", /status === "active" && activity\.spanType === "tool" && Boolean\(activity\.tool\)/.test(activity)],
  ["graph has no private polling loop", !/setInterval\(|fetch\([^\n]*atlas-status/.test(activity)],
  ["live surface consumes shared telemetry store", /useReactorLiveTelemetry/.test(surface)],
  ["live surface has an explicit evidence-only empty state", /will never invent browser actions, queries, findings/.test(surface)],
  ["live surface renders semantic events", /eventIsRenderable/.test(surface)],
  ["live surface uses a reactor-specific cooling-tower mark", /CoolingTowerMark/.test(surface) && /Reactor Live/.test(surface)],
  ["browser scene is backed by an event URL", /event\.url/.test(surface)],
  ["browser scene labels an actual recorded action", /Actual research action/.test(surface)],
  ["recorded input is explicitly labelled", /Recorded action input/.test(surface)],
  ["source links come from event evidence", /sourceList\(event\)/.test(surface)],
  ["topology only claims observed nodes and hand-offs", /Nodes appear when the Bureau actually records that lane/.test(surface) && /observed hand-offs/.test(surface)],
  ["supplemental Bureau polling fences stale responses", /let generation = 0/.test(hook) && /myGeneration !== generation/.test(hook) && /controller === myController/.test(hook)],
  ["desktop/mobile legacy stage remains evidence-aware", /sourceUrls|links/.test(bureau)],
  ["desktop live mode has a telemetry ActivityOnly surface", /<ReactorActivityOnly\b/.test(page)],
  ["legacy desktop scheme is standby/explanatory only", staticCanvasIsAfterLiveSurface && staticCanvasIsExplicitlyStandby],
  ["desktop page has one live event source of truth", pageNoLongerBuildsDuplicateLiveEventModel],
  ["mobile live path exposes real telemetry state", /liveNodes/.test(mobile) && /recentSpans/.test(mobile)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log(`\nReactor Live integrity contract: ${checks.length} checks passed.`);
