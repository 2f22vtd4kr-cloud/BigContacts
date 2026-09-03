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
s = s.replace('position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:420,', 'position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:0,');

const importLine = 'import { ReactorActivityOnly } from "../components/reactor-activity-only";';
const importAnchor = 'import { MobileReactorFlow } from "../components/mobile-reactor-flow";';
if (!s.includes(importLine)) {
  if (!s.includes(importAnchor)) throw new Error("reactor import anchor missing");
  s = s.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

// Insert immediately before the existing poster comment. The activity surface
// reads recentSpans itself through the already-present schemeNodesFromSpans
// mapper, so phase maps/fallback nodes cannot leak into the live scheme.
const schemeMarker = "Scheme canvas — horizontal + vertical pan via scroll";
if (!s.includes("<ReactorActivityOnly nodes={NODES.filter")) {
  const markerAt = s.indexOf(schemeMarker);
  if (markerAt < 0) throw new Error("scheme marker missing");
  const lineStart = s.lastIndexOf("\n", markerAt) + 1;
  const activity = '        {schemeToolsOnly && <ReactorActivityOnly nodes={NODES.filter((n) => schemeNodesFromSpans(atlasState?.recentSpans).has(n.id))} />}\n';
  s = s.slice(0, lineStart) + activity + s.slice(lineStart);
}

// The poster implementation is preserved, but never mounted in Live tools mode.
const scrollMarker = 'data-testid="scheme-scroll-viewport"';
const scrollAt = s.indexOf(scrollMarker);
if (scrollAt < 0) throw new Error("scheme scroll viewport missing");
const styleAt = s.indexOf('style={{', scrollAt);
if (styleAt < 0) throw new Error("scheme scroll style missing");
const displayMarker = 'display: schemeToolsOnly ? "none" : "block",';
const nextBrace = s.indexOf('}}', styleAt);
if (nextBrace < 0) throw new Error("scheme scroll style terminator missing");
if (!s.slice(styleAt, nextBrace).includes(displayMarker)) {
  s = s.slice(0, styleAt) + s.slice(styleAt, nextBrace).replace('style={{', 'style={{\n            ' + displayMarker) + s.slice(nextBrace);
}

// The committed page still contains a malformed outer pollJobs try/catch
// boundary. Remove only that unused wrapper at build time; the inner contact
// hydration try/catch remains intact. This keeps the generated TSX parseable.
s = s.replace(
  '    try {\n      // Poll jobs, atlas status, AND key health in parallel',
  '      // Poll jobs, atlas status, AND key health in parallel',
);
s = s.replace(
  '      }\n    } catch { /* non-fatal */ }\n  }, []);',
  '      }\n  }, []);',
);

if (!s.includes(importLine)) throw new Error("activity component import did not land");
if (!s.includes("<ReactorActivityOnly nodes={NODES.filter")) throw new Error("activity component mount did not land");
fs.writeFileSync(reactorPath, s);
console.log("REACTOR_ACTIVITY_ONLY_APPLIED");
