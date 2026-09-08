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

const legacyCanvasMarker = "Scheme canvas — standby/explanatory only; live mode uses telemetry activity above";
const activityMarker = "<ReactorActivityOnly";
const staticCanvasIsExplicitlyStandby = /!isLive\s*&&\s*\(\s*<div[^>]*data-testid=\"reactor-standby-scheme\"/.test(page) && page.includes(legacyCanvasMarker);
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
  ["shared store reads atlas-status recentSpans", /atlas-status/.test(store) && /recentSpans/.test(store)],
  ["graph consumes shared telemetry store", /useReactorLiveTelemetry/.test(activity)],
  ["graph renders only active tool spans", /status === "active" && activity\.spanType === "tool" && Boolean\(activity\.tool\)/.test(activity)],
  ["graph has no private atlas-status polling loop", !/setInterval\(|fetch\([^\n]*atlas-status/.test(activity)],
  ["live surface consumes shared telemetry store", /useReactorLiveTelemetry/.test(surface)],
  ["live surface refuses bureau prose when a run has no observed spans", /running job with no observed spans/.test(surface)],
  ["live surface renders semantic events rather than raw logs", /eventIsRenderable/.test(surface)],
  ["browser scene is backed by an event URL", /event\.url/.test(surface)],
  ["browser scene labels recorded action explicitly", /Actual research action/.test(surface)],
  ["tool input is presented as recorded input", /Recorded tool input/.test(surface)],
  ["source links are rendered from event evidence", /sourceList\(event\)/.test(surface)],
  ["desktop/mobile legacy stage remains evidence-aware", /sourceUrls|links/.test(bureau)],
  ["desktop live mode has a telemetry ActivityOnly surface", /<ReactorActivityOnly\b/.test(page)],
  ["legacy desktop scheme is present only as standby/explanatory UI", staticCanvasIsAfterLiveSurface && staticCanvasIsExplicitlyStandby],
  ["desktop page has one live event source of truth", pageNoLongerBuildsDuplicateLiveEventModel],
  ["mobile live path exposes real telemetry state", /liveNodes/.test(mobile) && /recentSpans/.test(mobile)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}

if (/chain[- ]of[- ]thought|hidden reasoning|private reasoning/i.test(surface)) {
  console.error("FAIL  hidden reasoning language detected in Reactor Live surface");
  failed = true;
} else {
  console.log("PASS  Reactor Live surface does not expose hidden reasoning");
}

if (failed) process.exit(1);
console.log(`\nReactor Live integrity contract: ${checks.length + 1} checks passed.`);
