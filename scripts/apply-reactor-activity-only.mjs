import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reactorPath = path.join(repoRoot, "artifacts/apex-finder/src/pages/reactor.tsx");

let s = fs.readFileSync(reactorPath, "utf8");

// Only an active Dig span may create a visible scheme node. Completed spans
// remain available in the desk/history but disappear from the live canvas.
s = s.replace(
  '  for (const s of spans) {\n    const blob = `${s.name}',
  '  for (const s of spans) {\n    if (String(s.status ?? "").toLowerCase() !== "active") continue;\n    const blob = `${s.name}',
);

// The old shell forced the whole page to 1600x960. The activity surface must
// fit the browser viewport; only the explicit Full map view may scroll.
s = s.replace('width:"100%", height:"100%", minWidth:1600, minHeight:960,', 'width:"100%", height:"100%", minWidth:0, minHeight:0,');
s = s.replace('overflow:"auto", position:"relative",', 'overflow:"hidden", position:"relative",');
s = s.replace('position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:420,', 'position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:0,');

// Render the compact live surface from a separate component so this patcher
// never has to splice a large JSX template into the page implementation.
const importAnchor = 'import { MobileReactorFlow } from "../components/mobile-reactor-flow";';
if (!s.includes('import { ReactorActivityOnly } from "../components/reactor-activity-only";')) {
  if (!s.includes(importAnchor)) throw new Error("reactor import anchor missing");
  s = s.replace(importAnchor, `${importAnchor}\nimport { ReactorActivityOnly } from "../components/reactor-activity-only";`);
}

const schemeAnchor = '        {/* Scheme canvas — horizontal + vertical pan via scroll (nodes extend past viewport) */}';
if (!s.includes('data-testid="scheme-activity-only"')) {
  if (!s.includes(schemeAnchor)) throw new Error("scheme canvas anchor missing");
  const activity = '        {schemeToolsOnly && <ReactorActivityOnly nodes={NODES.filter((n) => liveNodes?.has(n.id))} />}\n';
  s = s.replace(schemeAnchor, activity + schemeAnchor);
}

// The poster implementation is preserved, but never mounted in Live tools mode.
s = s.replace(
  '            position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:0,\n            overflowX:"auto",',
  '            position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:0,\n            display: schemeToolsOnly ? "none" : "block",\n            overflowX:"auto",',
);

// Never synthesize a visible target node from run phase. liveNodes comes from
// the currently-active span set; completed spans are history, not live activity.
s = s.replace(
  '        if (runStatus === "running" || runStatus === "paused") {\n          nodes.add("target");\n        }\n        for (const id of fromSpans) nodes.add(id);',
  '        for (const id of fromSpans) nodes.add(id);',
);
s = s.replace(
  '        if (fromSpans.size > 0) setLiveNodes(fromSpans);\n        else if (nodes.size > 0) setLiveNodes(nodes);\n        else setLiveNodes(new Set());',
  '        setLiveNodes(fromSpans);',
);

if (!s.includes('data-testid="scheme-activity-only"')) throw new Error("activity-only surface did not land");
if (!s.includes('setLiveNodes(fromSpans);')) throw new Error("span-only live state did not land");
fs.writeFileSync(reactorPath, s);
console.log("REACTOR_ACTIVITY_ONLY_APPLIED");
