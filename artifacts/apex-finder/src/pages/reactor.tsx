import { useState, useEffect, useRef } from "react";
import {
  Plane, Building2, Globe, Search, Brain, Zap, Network,
  Target, Cpu, Radio, Activity, BarChart2, Shield,
  TrendingUp, Eye, RefreshCw, GitMerge, Layers, Crosshair, MapPin,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface NodeDef {
  id: string; label: string; sub: string;
  cx: number; cy: number; w: number; h: number;
  type: "input"|"registry"|"discovery"|"ai-cyan"|"ai-lime"|"analysis"|"core"|"reactor"|"output";
  Icon: React.ElementType; color: string;
}
interface EdgeDef { id: string; from: string; to: string; adaptive?: boolean }
interface Wave   { nodes: string[]; edges: string[]; label: string; adaptive?: boolean }

// ── Node layout (desktop coords) ─────────────────────────────────────────────
const NODES: NodeDef[] = [
  { id:"target",  label:"TARGET INPUT",    sub:"Entity · Query",             cx:800,  cy:68,  w:200, h:52,  type:"input",    Icon:Crosshair, color:"#e8e0cc" },
  { id:"faa",     label:"FAA REGISTRY",    sub:"Aircraft Owners",            cx:162,  cy:178, w:148, h:60,  type:"registry", Icon:Plane,      color:"#38bdf8" },
  { id:"edgar",   label:"EDGAR / SEC",     sub:"Corporate Filings",          cx:390,  cy:178, w:148, h:60,  type:"registry", Icon:BarChart2,  color:"#38bdf8" },
  { id:"hmlr",    label:"UK LAND REG",     sub:"Property Records",           cx:618,  cy:178, w:148, h:60,  type:"registry", Icon:MapPin,     color:"#38bdf8" },
  { id:"ch",      label:"COMP HOUSE",      sub:"UK Officers",                cx:846,  cy:178, w:148, h:60,  type:"registry", Icon:Building2,  color:"#38bdf8" },
  { id:"hnwi",    label:"HNWI SCAN",       sub:"Wealth Profiles",            cx:1074, cy:178, w:148, h:60,  type:"registry", Icon:TrendingUp, color:"#38bdf8" },
  { id:"occrp",   label:"OCCRP ALEPH",     sub:"Sanctions · Crime",          cx:1302, cy:178, w:148, h:60,  type:"registry", Icon:Shield,     color:"#38bdf8" },
  { id:"inhouse", label:"IN-HOUSE",        sub:"Wikidata · DNS · GitHub",    cx:202,  cy:298, w:168, h:60,  type:"discovery",Icon:Search,     color:"#fb923c" },
  { id:"webdisc", label:"WEB DISC.",       sub:"DuckDuckGo · Bing",          cx:627,  cy:298, w:168, h:60,  type:"discovery",Icon:Globe,      color:"#fb923c" },
  { id:"deepweb", label:"DEEP WEB",        sub:"Multi-source OSINT",         cx:1052, cy:298, w:168, h:60,  type:"discovery",Icon:Eye,        color:"#fb923c" },
  { id:"opensky", label:"LIVE FLIGHT",     sub:"OpenSky Network",            cx:1460, cy:298, w:148, h:60,  type:"discovery",Icon:Radio,      color:"#fb923c" },
  { id:"perp0",   label:"PERPLEXITY",      sub:"Phase 0 · Live Research",    cx:244,  cy:420, w:178, h:62,  type:"ai-cyan",  Icon:Zap,        color:"#22d3ee" },
  { id:"groq",    label:"GROQ LLM",        sub:"Llama 3.3 · Extraction",     cx:800,  cy:420, w:178, h:62,  type:"ai-lime",  Icon:Brain,      color:"#a3e635" },
  { id:"perpfu",  label:"PERPLEXITY+",     sub:"Adaptive Follow-up",         cx:1356, cy:420, w:178, h:62,  type:"ai-cyan",  Icon:RefreshCw,  color:"#22d3ee" },
  { id:"semantic",label:"SEMANTIC ENGINE", sub:"MiniLM · Embeddings",        cx:460,  cy:540, w:192, h:62,  type:"analysis", Icon:GitMerge,   color:"#a78bfa" },
  { id:"bayesian",label:"BAYESIAN SCORE",  sub:"Dynamic Priority",           cx:1020, cy:540, w:192, h:62,  type:"analysis", Icon:Layers,     color:"#a78bfa" },
  { id:"graph",   label:"GRAPH ENGINE",    sub:"Relationship Synthesis",     cx:260,  cy:652, w:178, h:62,  type:"core",     Icon:Network,    color:"#a78bfa" },
  { id:"mcts",    label:"MCTS CORE",       sub:"Adaptive Pathfinding",       cx:800,  cy:657, w:228, h:78,  type:"reactor",  Icon:Cpu,        color:"#a3e635" },
  { id:"prac",    label:"PRAC ENGINE",     sub:"Planner · Analyst · Critic", cx:1340, cy:652, w:178, h:62,  type:"core",     Icon:Activity,   color:"#a78bfa" },
  { id:"pitch",   label:"PITCH GENERATOR", sub:"Custom Outreach Sequence",   cx:800,  cy:768, w:244, h:54,  type:"output",   Icon:Target,     color:"#fbbf24" },
];

const NM = Object.fromEntries(NODES.map(n => [n.id, n]));

const EDGES: EdgeDef[] = [
  {id:"t-faa",    from:"target", to:"faa"    },
  {id:"t-edgar",  from:"target", to:"edgar"  },
  {id:"t-hmlr",   from:"target", to:"hmlr"   },
  {id:"t-ch",     from:"target", to:"ch"     },
  {id:"t-hnwi",   from:"target", to:"hnwi"   },
  {id:"t-occrp",  from:"target", to:"occrp"  },
  {id:"faa-inh",  from:"faa",    to:"inhouse"},
  {id:"edgar-web",from:"edgar",  to:"webdisc"},
  {id:"hmlr-web", from:"hmlr",   to:"webdisc"},
  {id:"ch-inh",   from:"ch",     to:"inhouse"},
  {id:"hnwi-dw",  from:"hnwi",   to:"deepweb"},
  {id:"occrp-sky",from:"occrp",  to:"opensky"},
  {id:"inh-p0",   from:"inhouse",to:"perp0"  },
  {id:"web-p0",   from:"webdisc",to:"perp0"  },
  {id:"web-groq", from:"webdisc",to:"groq"   },
  {id:"dw-groq",  from:"deepweb",to:"groq"   },
  {id:"dw-fu",    from:"deepweb",to:"perpfu" },
  {id:"sky-fu",   from:"opensky",to:"perpfu" },
  {id:"p0-groq",  from:"perp0",  to:"groq"   },
  {id:"groq-fu",  from:"groq",   to:"perpfu" },
  {id:"p0-sem",   from:"perp0",  to:"semantic"},
  {id:"groq-sem", from:"groq",   to:"semantic"},
  {id:"groq-bay", from:"groq",   to:"bayesian"},
  {id:"fu-bay",   from:"perpfu", to:"bayesian"},
  {id:"sem-gr",   from:"semantic",to:"graph" },
  {id:"sem-mc",   from:"semantic",to:"mcts"  },
  {id:"bay-mc",   from:"bayesian",to:"mcts"  },
  {id:"bay-pr",   from:"bayesian",to:"prac"  },
  {id:"gr-mc",    from:"graph",  to:"mcts"   },
  {id:"mc-pr",    from:"mcts",   to:"prac"   },
  {id:"mc-pit",   from:"mcts",   to:"pitch"  },
  {id:"pr-pit",   from:"prac",   to:"pitch"  },
  {id:"mc-groq-a",from:"mcts",   to:"groq",  adaptive:true},
  {id:"mc-fu-a",  from:"mcts",   to:"perpfu",adaptive:true},
  {id:"pr-fu-a",  from:"prac",   to:"perpfu",adaptive:true},
];

const WAVES: Wave[] = [
  { nodes:["target"],                               edges:["t-faa","t-edgar","t-hmlr","t-ch","t-hnwi","t-occrp"],            label:"TARGETING  —  parsing entity query" },
  { nodes:["faa","edgar","hmlr","ch","hnwi","occrp"],edges:["faa-inh","edgar-web","hmlr-web","ch-inh","hnwi-dw","occrp-sky"],label:"REGISTRY STACK  —  scanning six public registries in parallel" },
  { nodes:["inhouse","webdisc","deepweb","opensky"], edges:["inh-p0","web-p0","web-groq","dw-groq","dw-fu","sky-fu"],        label:"DISCOVERY LAYER  —  enriching from web sources" },
  { nodes:["perp0"],                                 edges:["p0-groq","p0-sem"],                                             label:"PERPLEXITY PHASE 0  —  live web intelligence" },
  { nodes:["groq"],                                  edges:["groq-fu","groq-sem","groq-bay"],                                label:"GROQ LLM  —  structured extraction" },
  { nodes:["perpfu"],                                edges:["fu-bay"],                                                       label:"PERPLEXITY+  —  iterative follow-up" },
  { nodes:["semantic","bayesian"],                   edges:["sem-gr","sem-mc","bay-mc","bay-pr"],                            label:"SYNTHESIS  —  embedding profiles, scoring priorities" },
  { nodes:["graph"],                                 edges:["gr-mc"],                                                        label:"GRAPH ENGINE  —  relationship network" },
  { nodes:["mcts"],                                  edges:["mc-pr","mc-groq-a","mc-fu-a"],                                 label:"MCTS CORE  —  adaptive pathfinding", adaptive:true },
  { nodes:["groq","perpfu"],                         edges:["groq-fu","fu-bay","pr-fu-a"],                                  label:"ADAPTIVE LOOP  —  re-querying with new graph evidence", adaptive:true },
  { nodes:["prac"],                                  edges:["pr-pit","mc-pit"],                                             label:"PRAC ENGINE  —  planner · retriever · analyst · critic" },
  { nodes:["pitch"],                                 edges:[],                                                               label:"OUTPUT  —  generating custom outreach sequence" },
  { nodes:[],                                        edges:[],                                                               label:"REACTOR COOLING  —  cycle complete" },
];

// ── Mobile phase groups ───────────────────────────────────────────────────────
const MOBILE_PHASES = [
  { label:"INPUT",      nodeIds:["target"]                              },
  { label:"REGISTRIES", nodeIds:["faa","edgar","hmlr","ch","hnwi","occrp"] },
  { label:"DISCOVERY",  nodeIds:["inhouse","webdisc","deepweb","opensky"] },
  { label:"AI LAYER",   nodeIds:["perp0","groq","perpfu"]               },
  { label:"SYNTHESIS",  nodeIds:["semantic","bayesian"]                  },
  { label:"CORE",       nodeIds:["graph","mcts","prac"]                  },
  { label:"OUTPUT",     nodeIds:["pitch"]                               },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fwdPath(a: NodeDef, b: NodeDef) {
  const sx = a.cx, sy = a.cy + a.h / 2;
  const tx = b.cx, ty = b.cy - b.h / 2;
  const cp = Math.min(Math.abs(ty - sy) * 0.55, 70);
  return `M ${sx} ${sy} C ${sx} ${sy + cp} ${tx} ${ty - cp} ${tx} ${ty}`;
}
function adaptPath(a: NodeDef, b: NodeDef) {
  const RAIL = 1572;
  const sx = a.cx + a.w / 2, sy = a.cy;
  const tx = b.cx + b.w / 2, ty = b.cy;
  return `M ${sx} ${sy} C ${RAIL} ${sy} ${RAIL} ${ty} ${tx} ${ty}`;
}

// ── Shared animation styles ───────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes blink     { 0%,100%{opacity:1}  50%{opacity:0.35} }
  @keyframes breathe   { 0%,100%{opacity:0.8} 50%{opacity:1}   }
  @keyframes pulseGlow { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.95)} }
  @keyframes scanline  { 0%{top:-2px} 100%{top:960px} }
  @keyframes dashFwd   { 0%{stroke-dashoffset:24} 100%{stroke-dashoffset:0}  }
  @keyframes dashBack  { 0%{stroke-dashoffset:0}  100%{stroke-dashoffset:22} }
  @keyframes flowDown  { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-24} }
`;

// ── Meter (shared) ────────────────────────────────────────────────────────────
function Meter({ label, value, max, color }: { label:string; value:number; max:number; color:string }) {
  return (
    <div style={{ flex:1, padding:"0 16px", display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <span style={{ fontSize:8, letterSpacing:"0.18em", color:"#3a5070" }}>{label}</span>
        <span style={{ fontSize:15, fontWeight:700, color, lineHeight:1 }}>{value}</span>
      </div>
      <div style={{ height:3, background:"#192840", borderRadius:2 }}>
        <div style={{
          height:"100%", width:`${Math.min((value/max)*100,100)}%`,
          background:color, borderRadius:2,
          boxShadow:`0 0 8px ${color}80`, transition:"width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

// ── Mobile single node card ───────────────────────────────────────────────────
function MobileNodeCard({ n, on }: { n: NodeDef; on: boolean }) {
  const isReactor = n.type === "reactor";
  const c = n.color;
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"10px 12px",
      border:`${on?(isReactor?2:1.5):1}px solid ${on?c:"#192840"}`,
      borderRadius: isReactor ? 10 : 6,
      background: on ? (isReactor?`${c}14`:`${c}0d`) : "#0d1525",
      transition:"all 0.35s ease",
      boxShadow: on ? `0 0 ${isReactor?20:10}px ${c}${isReactor?"44":"22"}` : "none",
    }}>
      <div style={{
        width:28, height:28, flexShrink:0, borderRadius:5,
        border:`1px solid ${on?c+"50":"#192840"}`,
        background: on ? c+"16" : "transparent",
        display:"grid", placeItems:"center",
        color: on ? c : "#253850",
        transition:"all 0.35s",
      }}>
        <n.Icon style={{ width:13, height:13 }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:10, fontWeight:700, letterSpacing:"0.12em",
          color: on ? c : "#253850",
          transition:"color 0.35s",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        }}>
          {n.label}
        </div>
        <div style={{
          fontSize:9, color: on ? c+"99" : "#1a2d42",
          marginTop:2, letterSpacing:"0.08em",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
          transition:"color 0.35s",
        }}>
          {n.sub}
        </div>
      </div>
      <div style={{
        width:6, height:6, borderRadius:"50%", flexShrink:0,
        background: on ? c : "#192840",
        boxShadow: on ? `0 0 8px ${c}` : "none",
        animation: on ? "blink 1.1s ease-in-out infinite" : "none",
        transition:"all 0.35s",
      }} />
    </div>
  );
}

// ── Mobile layout ─────────────────────────────────────────────────────────────
function MobileReactor({ step, cycle, signals, contacts, loops }: {
  step:number; cycle:number; signals:number; contacts:number; loops:number;
}) {
  const wave = WAVES[step];
  const AN = new Set(wave.nodes);
  const adaptive = wave.adaptive ?? false;
  const phaseIdx = MOBILE_PHASES.findIndex(p => p.nodeIds.some(id => AN.has(id)));

  return (
    <div style={{
      display:"flex", flexDirection:"column", height:"100%",
      background:"#0b1120",
      fontFamily:"'Space Mono','DM Mono','Courier New',monospace",
      overflow:"hidden",
    }}>
      {/* Header */}
      <header style={{
        padding:"10px 14px", borderBottom:"1px solid #192840", flexShrink:0,
        display:"flex", alignItems:"center", gap:10,
        background:"rgba(11,17,32,0.95)",
      }}>
        <div style={{
          width:32, height:32, borderRadius:"50%",
          border:`2px solid ${adaptive?"#22d3ee":"#a3e635"}`,
          display:"grid", placeItems:"center", fontSize:18,
          color: adaptive?"#22d3ee":"#a3e635",
          boxShadow:`0 0 12px ${adaptive?"#22d3ee44":"#a3e63544"}`,
          animation: adaptive?"pulseGlow 0.7s ease-in-out infinite":"breathe 3s ease-in-out infinite",
          flexShrink:0,
        }}>☢</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", color:"#e8e0cc", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            INTELLIGENCE REACTOR
          </div>
          <div style={{ fontSize:8, letterSpacing:"0.12em", color:"#3a5070", marginTop:1 }}>
            APEX ATLAS  ·  ADAPTIVE ENGINE
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{
              width:6, height:6, borderRadius:"50%",
              background: adaptive?"#22d3ee":"#a3e635",
              boxShadow:`0 0 6px ${adaptive?"#22d3ee":"#a3e635"}`,
              animation:"blink 1.1s ease-in-out infinite",
            }} />
            <span style={{ fontSize:8, letterSpacing:"0.14em", color: adaptive?"#22d3ee":"#a3e635" }}>
              {adaptive?"ADAPTIVE":"NOMINAL"}
            </span>
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:"#a3e635", lineHeight:1 }}>
            {String(cycle).padStart(4,"0")}
          </div>
        </div>
      </header>

      {/* Phase progress bar */}
      <div style={{
        padding:"8px 14px 6px", borderBottom:"1px solid #192840", flexShrink:0,
        background:"#0c1320",
      }}>
        <div style={{ display:"flex", gap:3, marginBottom:5 }}>
          {MOBILE_PHASES.map((p, i) => (
            <div key={p.label} style={{
              flex:1, height:3, borderRadius:2,
              background: i < phaseIdx ? "#a3e635" : i === phaseIdx ? (adaptive?"#22d3ee":"#a3e635") : "#192840",
              boxShadow: i === phaseIdx ? `0 0 6px ${adaptive?"#22d3ee":"#a3e635"}` : "none",
              transition:"all 0.4s ease",
            }} />
          ))}
        </div>
        <div style={{
          fontSize:9, letterSpacing:"0.14em",
          color: adaptive?"#22d3ee":"#3a5070",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        }}>
          {adaptive?"⚡  ":"›  "}{wave.label}
        </div>
      </div>

      {/* Phase cards — scrollable */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 12px", display:"flex", flexDirection:"column", gap:10 }}>
        {MOBILE_PHASES.map((phase, pi) => {
          const phaseNodes = phase.nodeIds.map(id => NM[id]).filter(Boolean);
          const anyActive = phaseNodes.some(n => AN.has(n.id));
          const isCurrentPhase = pi === phaseIdx;
          const cols = phase.nodeIds.length > 2 ? 2 : 1;

          return (
            <div key={phase.label}>
              {/* Phase label */}
              <div style={{
                fontSize:8, letterSpacing:"0.22em", marginBottom:6,
                color: anyActive ? (adaptive&&isCurrentPhase?"#22d3ee99":"#a3e63599") : "#1e3050",
                display:"flex", alignItems:"center", gap:6, transition:"color 0.35s",
              }}>
                <div style={{
                  flex:1, height:1,
                  background: anyActive ? (adaptive&&isCurrentPhase?"#22d3ee30":"#a3e63520") : "#192840",
                  transition:"background 0.35s",
                }} />
                {phase.label}
                <div style={{
                  flex:1, height:1,
                  background: anyActive ? (adaptive&&isCurrentPhase?"#22d3ee30":"#a3e63520") : "#192840",
                  transition:"background 0.35s",
                }} />
              </div>

              {/* Node grid */}
              <div style={{
                display:"grid",
                gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
                gap:6,
              }}>
                {phaseNodes.map(n => (
                  <MobileNodeCard key={n.id} n={n} on={AN.has(n.id)} />
                ))}
              </div>

              {/* Flow arrow between phases */}
              {pi < MOBILE_PHASES.length - 1 && (
                <div style={{
                  display:"flex", justifyContent:"center", padding:"4px 0",
                  fontSize:10, color: anyActive ? "#a3e63560" : "#192840",
                  transition:"color 0.35s",
                }}>▾</div>
              )}
            </div>
          );
        })}

        {/* Adaptive loop badge */}
        {adaptive && (
          <div style={{
            margin:"4px 0 8px",
            padding:"10px 14px",
            border:"1px solid #22d3ee30",
            borderRadius:8,
            background:"#22d3ee08",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <RefreshCw style={{ width:14, height:14, color:"#22d3ee", flexShrink:0,
              animation:"blink 0.9s ease-in-out infinite" }} />
            <div>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", color:"#22d3ee" }}>
                ADAPTIVE LOOP ACTIVE
              </div>
              <div style={{ fontSize:8, color:"#22d3ee80", marginTop:2, letterSpacing:"0.08em" }}>
                MCTS triggered re-query via Groq + Perplexity+
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer meters */}
      <footer style={{
        borderTop:"1px solid #192840", flexShrink:0,
        background:"rgba(11,17,32,0.95)",
        padding:"10px 0",
        display:"flex", alignItems:"center",
      }}>
        <Meter label="SIGNALS"  value={signals}  max={80} color="#38bdf8" />
        <div style={{ width:1, height:32, background:"#192840", flexShrink:0 }} />
        <Meter label="CONTACTS" value={contacts} max={30} color="#a3e635" />
        <div style={{ width:1, height:32, background:"#192840", flexShrink:0 }} />
        <Meter label="LOOPS"    value={loops}    max={20} color="#22d3ee" />
      </footer>

      <style>{KEYFRAMES}</style>
    </div>
  );
}

// ── Desktop layout ────────────────────────────────────────────────────────────
function DesktopReactor({ step, cycle, signals, contacts, loops }: {
  step:number; cycle:number; signals:number; contacts:number; loops:number;
}) {
  const wave = WAVES[step];
  const AN = new Set(wave.nodes);
  const AE = new Set(wave.edges);
  const adaptive = wave.adaptive ?? false;

  return (
    <div style={{
      width:1600, height:960,
      background:"#0b1120",
      fontFamily:"'Space Mono','DM Mono','Courier New',monospace",
      display:"flex", flexDirection:"column",
      overflow:"hidden", position:"relative",
    }}>
      {/* Grid overlay */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
        backgroundImage:"linear-gradient(rgba(163,230,53,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(163,230,53,0.025) 1px,transparent 1px)",
        backgroundSize:"42px 42px",
      }} />
      {/* Scan-line */}
      <div style={{
        position:"absolute", left:0, right:0, height:2, pointerEvents:"none", zIndex:1,
        background:"linear-gradient(transparent,rgba(163,230,53,0.07) 50%,transparent)",
        animation:"scanline 8s linear infinite",
      }} />

      {/* Header */}
      <header style={{
        height:58, borderBottom:"1px solid #192840", zIndex:20, flexShrink:0,
        display:"flex", alignItems:"center", padding:"0 24px", gap:16,
        background:"rgba(11,17,32,0.92)", backdropFilter:"blur(8px)",
      }}>
        <div style={{
          width:38, height:38, borderRadius:"50%",
          border:`2px solid ${adaptive ? "#22d3ee" : "#a3e635"}`,
          display:"grid", placeItems:"center", fontSize:20,
          color: adaptive ? "#22d3ee" : "#a3e635",
          boxShadow:`0 0 14px ${adaptive ? "#22d3ee55" : "#a3e63555"}`,
          animation: adaptive ? "pulseGlow 0.7s ease-in-out infinite" : "breathe 3s ease-in-out infinite",
          transition:"all 0.4s",
        }}>☢</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.2em", color:"#e8e0cc" }}>
            APEX ATLAS  —  INTELLIGENCE REACTOR
          </div>
          <div style={{ fontSize:8.5, letterSpacing:"0.16em", color:"#3a5070", marginTop:2 }}>
            ADAPTIVE RESEARCH ENGINE  ·  UNIT ALPHA  ·  TARGET-AWARE MODE
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:28 }}>
          <div style={{
            padding:"4px 12px", borderRadius:4,
            border:`1px solid ${adaptive ? "#22d3ee40" : "#a3e63530"}`,
            background: adaptive ? "#22d3ee0e" : "#a3e6350a",
            display:"flex", alignItems:"center", gap:7,
          }}>
            <div style={{
              width:7, height:7, borderRadius:"50%",
              background: adaptive ? "#22d3ee" : "#a3e635",
              boxShadow:`0 0 8px ${adaptive ? "#22d3ee" : "#a3e635"}`,
              animation:"blink 1.1s ease-in-out infinite",
            }} />
            <span style={{ fontSize:8.5, letterSpacing:"0.2em", color: adaptive ? "#22d3ee" : "#a3e635" }}>
              {adaptive ? "ADAPTIVE LOOP ACTIVE" : "NOMINAL"}
            </span>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:8, letterSpacing:"0.18em", color:"#3a5070" }}>RESEARCH CYCLE</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#a3e635", lineHeight:1, marginTop:1 }}>
              {String(cycle).padStart(4,"0")}
            </div>
          </div>
        </div>
      </header>

      {/* Main panel */}
      <div style={{ flex:1, position:"relative", zIndex:5, overflow:"hidden" }}>
        {/* SVG connections */}
        <svg width={1600} height={842} style={{ position:"absolute", inset:0, zIndex:1 }}>
          <defs>
            <marker id="mLime2" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,0.5 L0,6.5 L7,3.5 z" fill="#a3e635cc" />
            </marker>
            <marker id="mCyan2" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,0.5 L0,6.5 L7,3.5 z" fill="#22d3eecc" />
            </marker>
            <marker id="mDim2" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,0.5 L0,6.5 L7,3.5 z" fill="#192840bb" />
            </marker>
          </defs>
          {EDGES.map(e => {
            const A = NM[e.from], B = NM[e.to];
            if (!A || !B) return null;
            const on  = AE.has(e.id);
            const d   = e.adaptive ? adaptPath(A, B) : fwdPath(A, B);
            const col = on ? (e.adaptive ? "#22d3ee" : "#a3e635") : "#192840";
            const mk  = on ? (e.adaptive ? "url(#mCyan2)" : "url(#mLime2)") : "url(#mDim2)";
            return (
              <path key={e.id} d={d} fill="none"
                stroke={col}
                strokeWidth={on ? (e.adaptive ? 2 : 1.5) : 1}
                strokeDasharray={on ? (e.adaptive ? "7 4" : "0") : "4 5"}
                opacity={on ? 0.92 : 0.22}
                markerEnd={mk}
                style={on ? {
                  filter:`drop-shadow(0 0 ${e.adaptive?5:3}px ${col})`,
                  animation: e.adaptive ? "dashBack 1s linear infinite" : "dashFwd 1.2s linear infinite",
                } : {}}
              />
            );
          })}
          {adaptive && (
            <text x={1580} y={600} fill="#22d3ee88" fontSize={8.5}
              fontFamily="'Space Mono',monospace" letterSpacing="0.15em"
              transform="rotate(90,1580,600)">
              ADAPTIVE FEEDBACK RAIL
            </text>
          )}
        </svg>

        {/* Nodes */}
        {NODES.map(n => {
          const on = AN.has(n.id);
          const isReactor = n.type === "reactor";
          const c = n.color;
          return (
            <div key={n.id} style={{
              position:"absolute",
              left: n.cx - n.w / 2, top: n.cy - n.h / 2,
              width: n.w, height: n.h, zIndex:2,
              border:`${on?(isReactor?2:1.5):1}px solid ${on?c:"#192840"}`,
              borderRadius: isReactor ? 12 : 6,
              background: on ? (isReactor?`${c}14`:`${c}0d`) : (isReactor?"#0c1830":"#0d1525"),
              padding:"0 10px",
              display:"flex", alignItems:"center", gap:9,
              transition:"all 0.35s ease",
              boxShadow: on
                ? `0 0 ${isReactor?28:14}px ${c}${isReactor?"55":"30"},inset 0 0 ${isReactor?20:10}px ${c}12`
                : "none",
            }}>
              <div style={{
                width:30, height:30, flexShrink:0, borderRadius:5,
                border:`1px solid ${on?c+"50":"#192840"}`,
                background: on ? c+"16" : "transparent",
                display:"grid", placeItems:"center",
                color: on ? c : "#253850", transition:"all 0.35s",
              }}>
                <n.Icon style={{ width:14, height:14 }} />
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{
                  fontSize: isReactor ? 11 : 9.5, fontWeight:700,
                  letterSpacing: isReactor?"0.14em":"0.12em",
                  color: on ? c : "#253850", lineHeight:1.2,
                  transition:"color 0.35s", whiteSpace:"nowrap",
                }}>
                  {isReactor && on ? "◉  " : ""}{n.label}
                </div>
                <div style={{
                  fontSize:7.5, letterSpacing:"0.1em",
                  color: on ? c+"99" : "#1a2d42",
                  marginTop:3, lineHeight:1.2,
                  transition:"color 0.35s", whiteSpace:"nowrap",
                }}>
                  {n.sub}
                </div>
              </div>
              <div style={{
                width:6, height:6, borderRadius:"50%", flexShrink:0,
                background: on ? c : "#192840",
                boxShadow: on ? `0 0 8px ${c}` : "none",
                animation: on ? "blink 1.1s ease-in-out infinite" : "none",
                transition:"all 0.35s",
              }} />
            </div>
          );
        })}

        {/* Section labels */}
        {[
          {y:178,label:"REGISTRIES"},{y:298,label:"DISCOVERY"},
          {y:420,label:"AI  ANALYSIS"},{y:540,label:"SYNTHESIS"},
          {y:652,label:"CORE"},{y:768,label:"OUTPUT"},
        ].map(({y,label}) => (
          <div key={label} style={{
            position:"absolute", left:8, top:y-6,
            fontSize:7, letterSpacing:"0.22em", color:"#1e3050",
            writingMode:"vertical-rl", transform:"rotate(180deg)",
            zIndex:3, height:12, lineHeight:1,
          }}>{label}</div>
        ))}

        {/* Horizontal dividers */}
        {[236,356,478,600,716].map(y => (
          <div key={y} style={{
            position:"absolute", left:28, right:28, top:y, height:1,
            background:"linear-gradient(90deg,transparent,#192840 20%,#192840 80%,transparent)",
            zIndex:2, opacity:0.6,
          }} />
        ))}

        {/* Status ticker */}
        <div style={{
          position:"absolute", bottom:10, left:28, right:28,
          fontSize:9, letterSpacing:"0.14em",
          color: adaptive ? "#22d3ee" : "#3a5070",
          zIndex:3,
          animation: adaptive ? "blink 0.9s ease-in-out infinite" : "none",
          transition:"color 0.4s",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        }}>
          {adaptive ? "⚡  " : "›  "}{wave.label}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        height:62, borderTop:"1px solid #192840", zIndex:20, flexShrink:0,
        display:"flex", alignItems:"center",
        background:"rgba(11,17,32,0.95)", backdropFilter:"blur(8px)",
      }}>
        <Meter label="SIGNALS DETECTED" value={signals}  max={80} color="#38bdf8" />
        <div style={{ width:1, height:36, background:"#192840" }} />
        <Meter label="CONTACTS FOUND"   value={contacts} max={30} color="#a3e635" />
        <div style={{ width:1, height:36, background:"#192840" }} />
        <Meter label="ADAPTIVE LOOPS"   value={loops}    max={20} color="#22d3ee" />
        <div style={{ width:1, height:36, background:"#192840" }} />
        <div style={{ padding:"0 28px", display:"flex", flexDirection:"column", gap:4, minWidth:160 }}>
          <span style={{ fontSize:8, letterSpacing:"0.18em", color:"#3a5070" }}>REACTOR STATUS</span>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{
              width:8, height:8, borderRadius:"50%",
              background: adaptive ? "#22d3ee" : "#a3e635",
              boxShadow:`0 0 10px ${adaptive?"#22d3ee":"#a3e635"}`,
            }} />
            <span style={{
              fontSize:11, fontWeight:700, letterSpacing:"0.16em",
              color: adaptive ? "#22d3ee" : "#a3e635",
            }}>
              {adaptive ? "ADAPTIVE" : "NOMINAL"}
            </span>
          </div>
        </div>
      </footer>

      <style>{KEYFRAMES}</style>
    </div>
  );
}

// ── Shared state + breakpoint hook ────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

// ── Page wrapper ──────────────────────────────────────────────────────────────
export default function IntelligenceReactorPage() {
  const [step,     setStep]     = useState(0);
  const [cycle,    setCycle]    = useState(1);
  const [signals,  setSignals]  = useState(0);
  const [contacts, setContacts] = useState(0);
  const [loops,    setLoops]    = useState(0);
  const isMobile = useIsMobile();

  // Desktop scale
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const t = setInterval(() => {
      setStep(s => {
        const next = (s + 1) % WAVES.length;
        if (next === 0) setCycle(c => c + 1);
        return next;
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const w = WAVES[step];
    if (w.adaptive) setLoops(l => l + 1);
    if (w.nodes.includes("pitch")) { setSignals(s => s + 7); setContacts(c => c + 2); }
  }, [step]);

  useEffect(() => {
    if (isMobile) return;
    const measure = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setScale(Math.min(width / 1600, height / 960));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [isMobile]);

  const shared = { step, cycle, signals, contacts, loops };

  if (isMobile) {
    return (
      <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
        <MobileReactor {...shared} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ position:"absolute", inset:0, overflow:"hidden", background:"#0b1120" }}
    >
      <div style={{ transformOrigin:"top left", transform:`scale(${scale})`, width:1600, height:960 }}>
        <DesktopReactor {...shared} />
      </div>
    </div>
  );
}
