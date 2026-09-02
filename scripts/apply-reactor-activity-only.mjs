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

const importLine = 'import { ReactorActivityOnly } from "../components/reactor-activity-only";';
const importAnchor = 'import { MobileReactorFlow } from "../components/mobile-reactor-flow";';
if (!s.includes(importLine)) {
  if (!s.includes(importAnchor)) throw new Error("reactor import anchor missing");
  s = s.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

// Insert immediately before the existing poster comment. Using the line index
// avoids brittle indentation/whitespace matching in the large page file.
const schemeMarker = "Scheme canvas — horizontal + vertical pan via scroll";
if (!s.includes("<ReactorActivityOnly nodes={NODES.filter")) {
  const markerAt = s.indexOf(schemeMarker);
  if (markerAt < 0) throw new Error("scheme marker missing");
  const lineStart = s.lastIndexOf("\n", markerAt) + 1;
  const activity = '        {schemeToolsOnly && <ReactorActivityOnly nodes={NODES.filter((n) => liveNodes?.has(n.id))} />}\n';
  s = s.slice(0, lineStart) + activity + s.slice(lineStart);
}

// Hide the poster in Live tools mode. Full map is still available by toggling
// the existing schemeToolsOnly control off.
const scrollMarker = 'data-testid="scheme-scroll-viewport"';
const scrollAt = s.indexOf(scrollMarker);
if (scrollAt < 0) throw new Error("scheme scroll viewport missing");
const styleAt = s.lastIndexOf('style={{', scrollAt);
if (styleAt >= 0) {
  const displayMarker = 'display: schemeToolsOnly ? "none" : "block",';
  const nextBrace = s.indexOf('}}', styleAt);
  if (nextBrace > 0 && !s.slice(styleAt, nextBrace).includes(displayMarker)) {
    s = s.slice(0, styleAt) + s.slice(styleAt, nextBrace).replace('style={{', 'style={{\n            ' + displayMarker) + s.slice(nextBrace);
  }
}

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

if (!s.includes(importLine)) throw new Error("activity component import did not land");
if (!s.includes("<ReactorActivityOnly nodes={NODES.filter")) throw new Error("activity component mount did not land");
if (!s.includes('setLiveNodes(fromSpans);')) throw new Error("span-only live state did not land");
fs.writeFileSync(reactorPath, s);
console.log("REACTOR_ACTIVITY_ONLY_APPLIED");
