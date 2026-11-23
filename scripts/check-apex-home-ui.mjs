import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const dashboard = read("artifacts/apex-finder/src/pages/dashboard.tsx");
const layout = read("artifacts/apex-finder/src/components/layout-round.tsx");
const reactor = read("artifacts/apex-finder/src/pages/reactor.tsx");
const mobile = read("artifacts/apex-finder/src/components/mobile-reactor-flow.tsx");
const css = read("artifacts/apex-finder/src/flat-round.css");
const launch = read("artifacts/apex-finder/src/components/launch-atlas-button.tsx");
const launchApi = read("artifacts/apex-finder/src/lib/launch-atlas.ts");
const shell = read("artifacts/apex-finder/src/components/layout.tsx");

const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };

require(dashboard.includes("People worth knowing"), "Home must use the approved headline");
require(dashboard.includes("atlas-home-board-grid"), "Home must use the approved split desktop composition");
require(dashboard.includes("atlas-home-board-console"), "Home must use the framed launch console");
require(dashboard.includes("Strongest routes"), "Home must reserve the right-hand strongest-routes panel");
require(dashboard.includes("Bureau figures"), "Home must show the three bureau figures");
require(dashboard.includes("Research leads in review"), "Home must preserve provisional research leads");
require(!dashboard.includes("atlas-home-secondary-row"), "Home must not add shortcut buttons absent from the design board");
require(!dashboard.includes("ScoreboardStrip"), "operator scoreboard must not displace the designed Home composition");
require(css.includes(".atlas-home-board-grid"), "CSS must define the board's two-column Home layout");
require(css.includes("repeating-conic-gradient"), "launch console must use the checky field pattern");
require(css.includes("repeating-radial-gradient"), "launch console must use the wave field pattern");
require(css.includes("#FAFAF8") && css.includes("#C8321E") && css.includes("#1F8A4D") && css.includes("#2757C6") && css.includes("#EDB92B"), "CSS must preserve the board's paper and four semantic tinctures");
require(css.includes("@media (max-width:760px)"), "Home must define the 390px mobile composition");
require(dashboard.includes("complete path is available"), "Home must not imply a relationship route without a complete evidenced path");
require(launch.includes("launchTargetCount"), "launch console must expose the target-count control");
require(launch.includes("Math.min(25"), "target-count control must cap at 25");
require(launch.includes("targetCount: opts?.targetCount ?? launchTargetCount"), "target-count control must pass its value to the canonical launch function");
require(launch.includes("button-depth-"), "depth choices must be real interactive controls");
require(launchApi.includes("targetCount: opts.targetCount ?? 1"), "canonical launch API must retain its conservative fallback for non-Home callers");
require(shell.includes("LegacyLayout"), "classic interface must remain available as a rollback path");
require(layout.includes("icon: ReactorMark"), "sidebar Reactor navigation must use ReactorMark");
require(!layout.includes("icon: Cpu"), "sidebar Reactor navigation must not use generic CPU icon");
require(reactor.includes("Icon:ReactorMark"), "desktop Reactor topology core must use ReactorMark");
require(!/\bCpu\b/.test(reactor), "Reactor page must not use generic CPU iconography");
require(mobile.includes('showTopology={false}'), "mobile Reactor surface must remain feed-first without topology");

if (failures.length) {
  console.error("Apex home UI contract failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}

console.log("Apex home UI contract passed.");
