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

// The old shell forced the whole page to 1600x960. The live activity surface
// must fit the browser viewport; only the explicit Full map view may scroll.
s = s.replace('width:"100%", height:"100%", minWidth:1600, minHeight:960,', 'width:"100%", height:"100%", minWidth:0, minHeight:0,');
s = s.replace('overflow:"auto", position:"relative",', 'overflow:"hidden", position:"relative",');
s = s.replace('position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:420,', 'position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:0,');

// Default Live tools mode is a compact, span-driven activity surface. The old
// poster stays available only behind the explicit Full map toggle.
const schemeAnchor = '        {/* Scheme canvas — horizontal + vertical pan via scroll (nodes extend past viewport) */}';
if (!s.includes('data-testid="scheme-activity-only"')) {
  if (!s.includes(schemeAnchor)) throw new Error("scheme canvas anchor missing");
  const activity = [
    '        {schemeToolsOnly && (() => {',
    '          const activeNodes = NODES.filter((n) => liveNodes?.has(n.id));',
    '          const cols = Math.min(4, Math.max(1, activeNodes.length));',
    '          const gap = 18;',
    '          const cardH = 66;',
    '          const rows = activeNodes.length ? Math.ceil(activeNodes.length / cols) : 1;',
    '          const canvasH = Math.max(150, rows * cardH + Math.max(0, rows - 1) * gap + 48);',
    '          return (',
    '            <div data-testid="scheme-activity-only" aria-label="Live activity scheme" style={{',
    '              flex:1, minHeight:0, width:"100%", overflow:"hidden",',
    '              display:"flex", alignItems:"center", justifyContent:"center",',
    '              padding:"18px 28px 26px", boxSizing:"border-box",',
    '            }}>',
    '              {activeNodes.length === 0 ? (',
    '                <div data-testid="scheme-activity-empty" style={{',
    '                  width:"100%", maxWidth:720, minHeight:140, border:"1px dashed rgba(156,255,26,0.16)",',
    '                  borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",',
    '                  color:"#40556f", fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase",',
    '                  background:"rgba(12,18,30,0.32)",',
    '                }}>NO LIVE TOOL ACTIVITY</div>',
    '              ) : (',
    '                <div style={{',
    '                  width:"100%", maxWidth:1040, minHeight:canvasH, display:"grid",',
    '                  gridTemplateColumns:"repeat(" + cols + ", minmax(0, 1fr))",',
    '                  gridAutoRows:cardH + "px", gap, alignContent:"center",',
    '                }}>',
    '                  {activeNodes.map((n) => {',
    '                    const status = rodStatus(n.id, atlasState, liveNodes);',
    '                    const statusColor = rodStatusColor(status, n.color);',
    '                    return (',
    '                      <div key={"activity-" + n.id} data-testid={"scheme-activity-node-" + n.id}',
    '                        aria-label={n.label + ", " + status} style={{',
    '                          minWidth:0, height:cardH, borderRadius:n.type === "reactor" ? 10 : 7,',
    '                          border:"1px solid " + statusColor + "66", background:statusColor + "0d",',
    '                          boxShadow:"0 0 18px " + statusColor + "18, inset 0 0 14px " + statusColor + "0a",',
    '                          display:"flex", alignItems:"center", gap:9, padding:"0 12px",',
    '                          overflow:"hidden", boxSizing:"border-box",',
    '                        }}>',
    '                        <div style={{ width:28, height:28, flexShrink:0, borderRadius:5,',
    '                          border:"1px solid " + statusColor + "55", background:statusColor + "12",',
    '                          display:"flex", alignItems:"center", justifyContent:"center", color:statusColor }}>',
    '                          <n.Icon style={{ width:14, height:14 }} />',
    '                        </div>',
    '                        <div style={{ minWidth:0, flex:1 }}>',
    '                          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.05em", color:statusColor,',
    '                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.label}</div>',
    '                          <div style={{ marginTop:3, fontSize:9, color:statusColor + "aa",',
    '                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.sub}</div>',
    '                        </div>',
    '                        <span style={{ width:7, height:7, flexShrink:0, borderRadius:999, background:statusColor,',
    '                          boxShadow:"0 0 9px " + statusColor }} />',
    '                      </div>',
    '                    );',
    '                  })}',
    '                </div>',
    '              )}',
    '            </div>',
    '          );',
    '        })()}',
    '',
  ].join("\n");
  s = s.replace(schemeAnchor, activity + schemeAnchor);
}

// The poster implementation is preserved, but never mounted in Live tools mode.
s = s.replace(
  '            position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:0,\n            overflowX:"auto",',
  '            position:"relative", width:"100%", maxWidth:"100%", flex:1, minHeight:0,\n            display: schemeToolsOnly ? "none" : "block",\n            overflowX:"auto",',
);

// Never synthesize a visible target/core node from run phase. liveNodes comes
// only from currently-active spans; completed spans are not visual activity.
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
