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
const roundLayout = read("artifacts/apex-finder/src/components/layout-round.tsx");

const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };

require(dashboard.includes("People worth knowing"), "Home must use the approved headline");
require(dashboard.includes("atlas-home-board-grid"), "Home must use the approved split desktop composition");
require(dashboard.includes("atlas-home-board-console"), "Home must use the framed launch console");
require(dashboard.includes("Strongest routes"), "Home must reserve the right-hand strongest-routes panel");
require(dashboard.includes("Bureau figures"), "Home must show the three bureau figures");
require(!dashboard.includes("atlas-home-board-people") && !dashboard.includes("atlas-home-research-leads"), "Home must not retain legacy feed sections absent from the board");
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
require(launch.includes('targetCount: opts?.targetCount ?? (variant === "primary" ? launchTargetCount : undefined)'), "target-count control must pass its value to the canonical launch function");
require(launch.includes("button-depth-"), "depth choices must be real interactive controls");
require(launch.includes("Web search") && launch.includes("Registries") && launch.includes("Footprint tools unavailable"), "Home console must expose the board source-kind row");
require(launchApi.includes("targetCount: opts.targetCount ?? 1"), "canonical launch API must retain its conservative fallback for non-Home callers");
require(shell.includes("LegacyLayout"), "classic interface must remain available as a rollback path");
require(!roundLayout.includes("LaunchAtlasButton"), "top bar must not duplicate the launch action");
require(roundLayout.includes('className="atlas-round-mobile-nav"'), "mobile primary navigation must remain visible as a tab bar");
require(roundLayout.includes("atlas-round-mobile-utilities"), "mobile utility navigation must remain available from the menu");
require(css.includes("position:fixed") && css.includes("bottom:0"), "mobile tab bar must be fixed to the bottom safe area");
require(dashboard.includes('queryKey: ["dashboard", "api-health"]'), "Home must detect API availability");
require(dashboard.includes("Saved copy remains visible"), "Home must preserve and label cached data during API outage");
require(launch.includes("atlas-home-api-down") && launch.includes("onRetryApi"), "launch console must expose a retryable API-down state");
const objective = launchApi.match(/DEFAULT_ATLAS_DISCOVERY_OBJECTIVE = "([^"]*)"/)?.[1] ?? "";
require(objective.length > 0 && objective.length <= 1600, "default mission must fit the canonical 1,600-character launch contract");
require(launch.includes("maxLength={1_600}"), "launch objective input must preserve the canonical 1,600-character limit");
require(launch.includes('variant === "primary" ? "" : DEFAULT_ATLAS_DISCOVERY_OBJECTIVE'), "Only Home starts empty; other launch callers retain the canonical default objective");
require(launch.includes('placeholder="Describe who you want to reach"'), "Home objective must use the board prompt");
require(launch.includes('variant === "primary" && !launchObjective.trim()'), "Home Launch must stay unavailable until an objective is entered");
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
