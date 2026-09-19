import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const dashboard = read("artifacts/apex-finder/src/pages/dashboard.tsx");
const layout = read("artifacts/apex-finder/src/components/layout.tsx");
const reactor = read("artifacts/apex-finder/src/pages/reactor.tsx");
const mobile = read("artifacts/apex-finder/src/components/mobile-reactor-flow.tsx");
const css = read("artifacts/apex-finder/src/index.css");

const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };

require(dashboard.includes("atlas-home-actions"), "dashboard must use explicit home action rail");
require(dashboard.includes("atlas-home-primary-row"), "dashboard must use explicit primary row");
require(dashboard.includes("atlas-home-secondary-row"), "dashboard must use explicit secondary row");
require(dashboard.includes("ReactorMark"), "dashboard Reactor affordance must use ReactorMark");
require(css.includes(".atlas-home-actions"), "CSS must define explicit home action rail");
require(css.includes(".atlas-home-secondary-row"), "CSS must define explicit secondary rail");
require(!css.includes("nth-of-type(3)"), "home alignment must not depend on nth-of-type selectors");
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
