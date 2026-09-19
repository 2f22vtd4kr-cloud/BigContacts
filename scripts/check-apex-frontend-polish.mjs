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

const checks = [
  ["home CTA has explicit matching desktop rail width", /atlas-home-secondary-row[\s\S]{0,900}width: 14\.75rem/.test(css) && /atlas-home-launch[\s\S]{0,500}14\.75rem/.test(css)],
  ["home depth selector remains subordinate", /grid-template-columns:\s*7\.625rem 14\.75rem/.test(css)],
  ["Reactor uses product-specific mark", /ReactorMark/.test(dashboard) && /ReactorMark/.test(reactor) && /ReactorMark/.test(mark)],
  ["generic nuclear Reactor glyph is gone", !/☢|nuclear icon/i.test(reactor)],
  ["replay is evidence-grounded", /Recorded sources/.test(replay) && /sourceUrls|links/.test(replay) && /https?:\/\//.test(replay)],
  ["replay is bounded", /slice\(0, 40\)/.test(replay)],
  ["replay supports reduced-motion through shared CSS", /prefers-reduced-motion/.test(css) && /reactor-pressable/.test(replay)],
  ["mobile replay is archive-only", /showHistory && <ResearchReplay/.test(mobile)],
  ["mobile remains feed-first", /showTopology=\{false\}/.test(mobile)],
  ["live topology remains telemetry bounded", /<ReactorActivityOnly\b/.test(reactor) && /active tool spans only/.test(reactor)],
  ["desktop live desk has explicit accessible region", /role="complementary"/.test(reactor) && /aria-label="Apex Atlas Live Desk"/.test(reactor)],
  ["mobile controls retain touch-safe targets", /min-h-\[44px\]/.test(mobile)],
  ["focus ring remains explicit", /focus-visible/.test(css)],
  ["terminal state does not require animation", /atlasTerminal|reactor-terminal-banner/.test(reactor) && /prefers-reduced-motion/.test(css)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`\nApex frontend polish contract: ${checks.length} checks passed.`);
