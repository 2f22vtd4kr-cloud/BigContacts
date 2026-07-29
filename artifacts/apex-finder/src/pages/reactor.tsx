import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plane, Building2, Globe, Search, Brain, Zap, Network,
  Target, Cpu, Radio, Activity, BarChart2, Shield,
  TrendingUp, Eye, RefreshCw, GitMerge, Layers, Crosshair, MapPin,
  Sparkles, Compass, Rss, Users,
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

interface ResearchSession {
  id: number;
  targetEntityName: string | null;
  winningPath: string | null;
  generatedPitch: string | null;
  crmStatus: string;
  bayesianScoreAtRuntime: number | null;
  pathScore: number | null;
  createdAt: string;
}

// ── Node layout (desktop coords) ─────────────────────────────────────────────
const NODES: NodeDef[] = [
  { id:"target",  label:"TARGET INPUT",    sub:"Entity · Query",             cx:800,  cy:68,  w:200, h:52,  type:"input",    Icon:Crosshair, color:"#e8e0cc" },
  { id:"faa",     label:"FAA REGISTRY",    sub:"Aircraft Owners",            cx:100,  cy:178, w:140, h:60,  type:"registry", Icon:Plane,      color:"#38bdf8" },
  { id:"edgar",   label:"EDGAR / SEC",     sub:"Corporate Filings",          cx:280,  cy:178, w:140, h:60,  type:"registry", Icon:BarChart2,  color:"#38bdf8" },
  { id:"hmlr",    label:"UK LAND REG",     sub:"Property Records",           cx:460,  cy:178, w:140, h:60,  type:"registry", Icon:MapPin,     color:"#38bdf8" },
  { id:"ch",      label:"COMP HOUSE",      sub:"UK Officers",                cx:640,  cy:178, w:140, h:60,  type:"registry", Icon:Building2,  color:"#38bdf8" },
  { id:"hnwi",    label:"HNWI SCAN",       sub:"Wealth Profiles",            cx:820,  cy:178, w:140, h:60,  type:"registry", Icon:TrendingUp, color:"#38bdf8" },
  { id:"occrp",   label:"OCCRP ALEPH",     sub:"Sanctions · Crime",          cx:1000, cy:178, w:140, h:60,  type:"registry", Icon:Shield,     color:"#38bdf8" },
  { id:"brreg",   label:"EU REGISTRIES",   sub:"BRREG · ARES · BODACC",      cx:1180, cy:178, w:140, h:60,  type:"registry", Icon:Globe,      color:"#38bdf8" },
  { id:"whoxy",   label:"WHOXY / RDAP",    sub:"Domain · DNS Intel",         cx:1360, cy:178, w:140, h:60,  type:"registry", Icon:Rss,        color:"#38bdf8" },
  { id:"inhouse", label:"IN-HOUSE",        sub:"Wikidata · GitHub · RDAP",   cx:160,  cy:298, w:168, h:60,  type:"discovery",Icon:Search,     color:"#fb923c" },
  { id:"webdisc", label:"WEB DISC.",       sub:"DuckDuckGo · Bing",          cx:530,  cy:298, w:168, h:60,  type:"discovery",Icon:Compass,    color:"#fb923c" },
  { id:"deepweb", label:"DEEP WEB",        sub:"Multi-source OSINT",         cx:900,  cy:298, w:168, h:60,  type:"discovery",Icon:Eye,        color:"#fb923c" },
  { id:"opensky", label:"LIVE FLIGHT",     sub:"OpenSky Network",            cx:1270, cy:298, w:148, h:60,  type:"discovery",Icon:Radio,      color:"#fb923c" },
  { id:"maigret", label:"MAIGRET",         sub:"Holehe · 3,000+ Platforms",  cx:1460, cy:298, w:168, h:60,  type:"discovery",Icon:Users,      color:"#fb923c" },
  { id:"perp0",   label:"PERPLEXITY",      sub:"Phase 0 · Live Research",    cx:140,  cy:420, w:160, h:62,  type:"ai-cyan",  Icon:Zap,        color:"#22d3ee" },
  { id:"exa",     label:"EXA NEURAL",      sub:"Semantic People Search",     cx:345,  cy:420, w:148, h:62,  type:"ai-cyan",  Icon:Compass,    color:"#22d3ee" },
  { id:"tavily",  label:"TAVILY AI",       sub:"AI-native Web Search",       cx:545,  cy:420, w:148, h:62,  type:"ai-cyan",  Icon:Rss,        color:"#22d3ee" },
  { id:"groq",    label:"GROQ LLM",        sub:"Llama 3.3 · Extraction",     cx:800,  cy:420, w:160, h:62,  type:"ai-lime",  Icon:Brain,      color:"#a3e635" },
  { id:"gemini",  label:"GEMINI",          sub:"Google · Grounded Search",   cx:1040, cy:420, w:148, h:62,  type:"ai-cyan",  Icon:Sparkles,   color:"#22d3ee" },
  { id:"perpfu",  label:"PERPLEXITY+",     sub:"Adaptive Follow-up",         cx:1250, cy:420, w:160, h:62,  type:"ai-cyan",  Icon:RefreshCw,  color:"#22d3ee" },
  { id:"semantic",label:"SEMANTIC ENGINE", sub:"MiniLM · Embeddings",        cx:460,  cy:540, w:192, h:62,  type:"analysis", Icon:GitMerge,   color:"#a78bfa" },
  { id:"bayesian",label:"BAYESIAN SCORE",  sub:"Dynamic Priority",           cx:1020, cy:540, w:192, h:62,  type:"analysis", Icon:Layers,     color:"#a78bfa" },
  { id:"graph",   label:"GRAPH ENGINE",    sub:"Relationship Synthesis",     cx:260,  cy:652, w:178, h:62,  type:"core",     Icon:Network,    color:"#a78bfa" },
  { id:"mcts",    label:"UCT CORE",        sub:"Adaptive Pathfinding",       cx:800,  cy:657, w:228, h:78,  type:"reactor",  Icon:Cpu,        color:"#a3e635" },
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
  {id:"t-brreg",  from:"target", to:"brreg"  },
  {id:"t-whoxy",  from:"target", to:"whoxy"  },
  {id:"faa-inh",  from:"faa",    to:"inhouse"},
  {id:"edgar-web",from:"edgar",  to:"webdisc"},
  {id:"hmlr-web", from:"hmlr",   to:"webdisc"},
  {id:"ch-inh",   from:"ch",     to:"inhouse"},
  {id:"hnwi-dw",  from:"hnwi",   to:"deepweb"},
  {id:"occrp-sky",from:"occrp",  to:"opensky"},
  {id:"brreg-inh",from:"brreg",  to:"inhouse"},
  {id:"whoxy-inh",from:"whoxy",  to:"inhouse"},
  {id:"inh-p0",   from:"inhouse",to:"perp0"  },
  {id:"inh-exa",  from:"inhouse",to:"exa"    },
  {id:"web-p0",   from:"webdisc",to:"perp0"  },
  {id:"web-exa",  from:"webdisc",to:"exa"    },
  {id:"web-tav",  from:"webdisc",to:"tavily" },
  {id:"web-groq", from:"webdisc",to:"groq"   },
  {id:"dw-groq",  from:"deepweb",to:"groq"   },
  {id:"dw-gem",   from:"deepweb",to:"gemini" },
  {id:"dw-fu",    from:"deepweb",to:"perpfu" },
  {id:"sky-fu",   from:"opensky",to:"perpfu" },
  {id:"sky-mai",  from:"opensky",to:"maigret"},
  {id:"web-mai",  from:"webdisc",to:"maigret"},
  {id:"mai-groq", from:"maigret",to:"groq"   },
  {id:"mai-bay",  from:"maigret",to:"bayesian"},
  {id:"web-gem",  from:"webdisc",to:"gemini" },
  {id:"p0-groq",  from:"perp0",  to:"groq"   },
  {id:"exa-groq", from:"exa",    to:"groq"   },
  {id:"tav-groq", from:"tavily", to:"groq"   },
  {id:"groq-fu",  from:"groq",   to:"perpfu" },
  {id:"gem-fu",   from:"gemini", to:"perpfu" },
  {id:"p0-sem",   from:"perp0",  to:"semantic"},
  {id:"gem-sem",  from:"gemini", to:"semantic"},
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
  { nodes:["inhouse","webdisc","deepweb","opensky","maigret"], edges:["inh-p0","web-p0","web-gem","web-groq","dw-groq","dw-fu","sky-fu","sky-mai","web-mai"], label:"DISCOVERY LAYER  —  web sources + Maigret cross-platform expansion" },
  { nodes:["perp0","exa","tavily","gemini"],          edges:["p0-groq","exa-groq","tav-groq","p0-sem","gem-sem","gem-fu"],    label:"AI PHASE 0  —  Perplexity · Gemini · Tavily · Exa in parallel" },
  { nodes:["groq"],                                  edges:["groq-fu","groq-sem","groq-bay"],                                label:"GROQ LLM  —  structured extraction from Exa · Tavily · web text" },
  { nodes:["perpfu"],                                edges:["fu-bay"],                                                       label:"PERPLEXITY+  —  iterative follow-up" },
  { nodes:["semantic","bayesian"],                   edges:["sem-gr","sem-mc","bay-mc","bay-pr"],                            label:"SYNTHESIS  —  embedding profiles, scoring priorities" },
  { nodes:["graph"],                                 edges:["gr-mc"],                                                        label:"GRAPH ENGINE  —  relationship network" },
  { nodes:["mcts"],                                  edges:["mc-pr","mc-groq-a","mc-fu-a"],                                 label:"UCT CORE  —  adaptive pathfinding", adaptive:true },
  { nodes:["groq","perpfu"],                         edges:["groq-fu","fu-bay","pr-fu-a"],                                  label:"ADAPTIVE LOOP  —  re-querying with new graph evidence", adaptive:true },
  { nodes:["prac"],                                  edges:["pr-pit","mc-pit"],                                             label:"PRAC ENGINE  —  planner · retriever · analyst · critic" },
  { nodes:["pitch"],                                 edges:[],                                                               label:"OUTPUT  —  generating custom outreach sequence" },
  { nodes:[],                                        edges:[],                                                               label:"REACTOR COOLING  —  cycle complete" },
];

// ── Mobile phase groups ───────────────────────────────────────────────────────
const MOBILE_PHASES = [
  { label:"INPUT",      nodeIds:["target"]                              },
  { label:"REGISTRIES", nodeIds:["faa","edgar","hmlr","ch","hnwi","occrp"] },
  { label:"DISCOVERY",  nodeIds:["inhouse","webdisc","deepweb","opensky","maigret"] },
  { label:"AI LAYER",   nodeIds:["perp0","exa","tavily","gemini","groq","perpfu"] },
  { label:"SYNTHESIS",  nodeIds:["semantic","bayesian"]                  },
  { label:"CORE",       nodeIds:["graph","mcts","prac"]                  },
  { label:"OUTPUT",     nodeIds:["pitch"]                               },
];

// ── Job → node mapping for live reactor state ────────────────────────────────
// Atlas phase → which nodes light up in the reactor diagram
const ATLAS_PHASE_NODES: Record<number, string[]> = {
  0:  ["target","faa","hnwi","webdisc","ch","brreg","edgar"],
  1:  ["target","occrp","opensky","ch"],
  2:  ["ch","inhouse","hnwi"],
  3:  ["hnwi","target","edgar"],
  4:  ["inhouse","target"],
  5:  ["webdisc","inhouse","maigret"],
  6:  ["perp0","exa","tavily","gemini","groq","maigret","webdisc","deepweb"],
  7:  ["whoxy","occrp","deepweb","opensky"],
  8:  ["semantic","bayesian","graph"],
  9:  ["semantic","bayesian","inhouse"],
  10: ["mcts","prac","graph","target"],
};

const JOB_NODE_MAP: Record<string, string[]> = {
  // ── Discovery / Ingestion ────────────────────────────────────────────────────
  "faa":                  ["target","faa","inhouse"],
  "land-registry":        ["target","hmlr","webdisc"],
  "western-hnwi":         ["target","hnwi","inhouse"],
  "broad-discovery":      ["target","webdisc","hnwi"],
  // Atlas orchestrator — lights up the whole input layer while running
  "atlas-run":            ["target","faa","hnwi","webdisc","ch","occrp","opensky"],
  // ── Enrichment ───────────────────────────────────────────────────────────────
  "in-house-enrich":      ["inhouse","perp0","exa"],
  "web-osint-enrich":     ["webdisc","perp0","exa","tavily","gemini","groq","maigret"],
  "deep-web-osint":       ["deepweb","gemini","perpfu"],
  "social-discovery":     ["webdisc","inhouse"],
  // ── Registry cross-reference ─────────────────────────────────────────────────
  "occrp":                ["occrp"],
  "opensky":              ["opensky","perpfu"],
  "ch-company-officers":  ["ch","inhouse"],
  "ch-officers":          ["ch","inhouse"],
  "companies-house-enrich":["ch","inhouse"],
  // ── Analysis ─────────────────────────────────────────────────────────────────
  "compute-embeddings":   ["semantic"],
  "semantic-dedup":       ["semantic","bayesian"],
  "bulk-hybrid-research": ["mcts","prac","bayesian","graph","pitch"],
  "auto-detect":          ["graph","bayesian"],
  "auto-detect-clusters": ["graph","semantic"],
};

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
          height:"100%", width:`${Math.min((value/Math.max(max,1))*100,100)}%`,
          background:color, borderRadius:2,
          boxShadow:`0 0 8px ${color}80`, transition:"width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

// ── Mobile single node card ───────────────────────────────────────────────────
function MobileNodeCard({ n, on, dim }: { n: NodeDef; on: boolean; dim?: boolean }) {
  const isReactor = n.type === "reactor";
  const c = n.color;
  // dim = in-pipeline but not current active step (faint glow)
  const dimColor = dim ? c : undefined;
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:8,
      padding:"9px 10px",
      border:`${on?(isReactor?2:1.5):dim?1:1}px solid ${on?c:dim?(c+"30"):"#192840"}`,
      borderRadius: isReactor ? 10 : 6,
      background: on ? (isReactor?`${c}14`:`${c}0d`) : dim ? `${c}07` : "#0d1525",
      transition:"all 0.4s ease",
      boxShadow: on ? `0 0 ${isReactor?20:10}px ${c}${isReactor?"44":"22"}` : dim ? `0 0 4px ${c}15` : "none",
      minWidth:0, overflow:"hidden",
    }}>
      <div style={{
        width:26, height:26, flexShrink:0, borderRadius:5,
        border:`1px solid ${on?c+"50":dim?(c+"25"):"#192840"}`,
        background: on ? c+"16" : dim ? c+"0a" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center",
        color: on ? c : dim ? c+"55" : "#253850",
        transition:"all 0.4s",
      }}>
        <n.Icon style={{ width:12, height:12 }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize:9, fontWeight:700, letterSpacing:"0.1em",
          color: on ? c : dim ? c+"60" : "#253850",
          transition:"color 0.4s",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        }}>
          {n.label}
        </div>
        <div style={{
          fontSize:8, color: on ? c+"99" : dim ? c+"35" : "#1a2d42",
          marginTop:1, letterSpacing:"0.06em",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          transition:"color 0.4s",
        }}>
          {n.sub}
        </div>
      </div>
      <div style={{
        width:5, height:5, borderRadius:"50%", flexShrink:0,
        background: on ? c : dim ? c+"40" : "#192840",
        boxShadow: on ? `0 0 6px ${c}` : dim ? `0 0 3px ${c}50` : "none",
        animation: on ? "blink 1.1s ease-in-out infinite" : dim ? "breathe 2s ease-in-out infinite" : "none",
        transition:"all 0.4s",
      }} />
    </div>
  );
}

// ── CRM status colour ─────────────────────────────────────────────────────────
function crmColor(status: string) {
  switch (status) {
    case "contacted": return "#a3e635";
    case "replied":   return "#22d3ee";
    case "converted": return "#fbbf24";
    default:          return "#3a5070";
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"2-digit" });
  } catch { return iso.slice(0, 10); }
}

// ── Mobile layout ─────────────────────────────────────────────────────────────
function MobileReactor({ sessions, totalEntities, loading, onRefresh, syncing, liveNodes, liveLabel }: {
  sessions: ResearchSession[];
  totalEntities: number;
  loading: boolean;
  onRefresh: () => void;
  syncing: boolean;
  liveNodes?: Set<string>;
  liveLabel?: string;
}) {
  const hasSessions = sessions.length > 0;
  const pitchCount = sessions.filter(s => s.generatedPitch).length;
  const isLive = (liveNodes?.size ?? 0) > 0;

  // ── Animated phase-cycling when a job is running ────────────────────────────
  const [liveStep, setLiveStep] = useState(0);
  useEffect(() => {
    if (!isLive) { setLiveStep(0); return; }
    const id = setInterval(() => setLiveStep(s => (s + 1) % WAVES.length), 1300);
    return () => clearInterval(id);
  }, [isLive]);

  // When live: current wave step = "on" (bright), rest of liveNodes = "dim"
  // When idle with sessions: show completed nodes statically
  const currentStepNodes: Set<string> = isLive
    ? new Set(WAVES[liveStep % WAVES.length].nodes)
    : new Set();

  const staticNodes: Set<string> = hasSessions
    ? new Set(["target","semantic","bayesian","graph","mcts","prac", ...(pitchCount > 0 ? ["pitch"] : [])])
    : new Set();

  // activeNodes = nodes that are "on" (bright) at this moment
  // When live: the current WAVE step lights up (shows pipeline progression through ALL stages)
  // This makes the reactor animate through the full pipeline even if only one job type is running
  const activeNodes: Set<string> = isLive
    ? currentStepNodes
    : staticNodes;

  // dimNodes = job-mapped nodes that are staged but not the current step
  const dimNodes: Set<string> = isLive
    ? new Set([...(liveNodes ?? new Set())].filter(id => !currentStepNodes.has(id)))
    : new Set();

  return (
    <div style={{
      display:"flex", flexDirection:"column", width:"100%", height:"100%",
      background:"#0b1120",
      fontFamily:"'Space Mono','DM Mono','Courier New',monospace",
      overflow:"hidden",
    }}>
      <style>{KEYFRAMES}</style>

      {/* ── Header ── */}
      <header style={{
        padding:"10px 14px", borderBottom:"1px solid #192840", flexShrink:0,
        display:"flex", alignItems:"center", gap:10,
        background:"rgba(11,17,32,0.95)",
      }}>
        {/* Nuclear icon */}
        <span style={{
          fontSize:32, lineHeight:1, flexShrink:0,
          color: hasSessions ? "#a3e635" : "#253850",
          textShadow: hasSessions ? "0 0 12px #a3e63544" : "none",
          animation: hasSessions ? "breathe 3s ease-in-out infinite" : "none",
          transition:"all 0.4s",
        }}>☢</span>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize:10, fontWeight:700, letterSpacing:"0.18em", color:"#e8e0cc",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            INTELLIGENCE REACTOR
          </div>
          <div style={{ fontSize:8, letterSpacing:"0.12em", color:"#3a5070", marginTop:1 }}>
            APEX ATLAS  ·  UCT RESEARCH ENGINE
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{
              width:6, height:6, borderRadius:"50%",
              background: isLive ? "#22d3ee" : (hasSessions ? "#a3e635" : "#253850"),
              boxShadow: isLive ? "0 0 8px #22d3ee" : (hasSessions ? "0 0 6px #a3e635" : "none"),
              animation: (isLive || hasSessions) ? "blink 1.1s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontSize:8, letterSpacing:"0.14em", color: isLive ? "#22d3ee" : (hasSessions ? "#a3e635" : "#3a5070") }}>
              {isLive ? "LIVE" : (hasSessions ? "OPERATIONAL" : "STANDBY")}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ fontSize:14, fontWeight:700, color: hasSessions ? "#a3e635" : "#253850", lineHeight:1 }}>
              {String(sessions.length).padStart(4, "0")}
            </div>
            {/* Sync button */}
            <button
              onClick={onRefresh}
              title="Sync"
              style={{
                width:22, height:22, borderRadius:4, border:"1px solid #253850",
                background:"transparent", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color: syncing ? "#a3e635" : "#3a5070",
                transition:"all 0.25s",
                padding:0, flexShrink:0,
              }}
            >
              <RefreshCw style={{
                width:10, height:10,
                animation: syncing ? "blink 0.6s linear infinite" : "none",
              }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div style={{
        flex:1, overflowY:"auto", overflowX:"hidden",
        display:"flex", flexDirection:"column",
      }}>
        {loading ? (
          // Loading state
          <div style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:10, padding:24,
          }}>
            <div style={{
              width:28, height:28, borderRadius:"50%",
              border:"2px solid #192840", borderTopColor:"#a3e635",
              animation:"blink 0.7s linear infinite",
            }} />
            <span style={{ fontSize:9, letterSpacing:"0.18em", color:"#3a5070" }}>
              LOADING SESSIONS…
            </span>
          </div>
        ) : (
          <>
            {/* ── Pipeline architecture ── */}
            <div style={{ padding:"12px 12px 0", flexShrink:0 }}>
              {MOBILE_PHASES.map((phase, pi) => {
                const phaseNodes = phase.nodeIds.map(id => NM[id]).filter(Boolean);
                const anyActive = phaseNodes.some(n => activeNodes.has(n.id));
                const cols = phase.nodeIds.length > 2 ? 2 : 1;

                return (
                  <div key={phase.label} style={{ marginBottom:8 }}>
                    {/* Phase label */}
                    <div style={{
                      fontSize:8, letterSpacing:"0.22em", marginBottom:5,
                      color: anyActive ? "#a3e63599" : "#1e3050",
                      display:"flex", alignItems:"center", gap:6,
                    }}>
                      <div style={{ flex:1, height:1, background: anyActive ? "#a3e63520" : "#192840" }} />
                      {phase.label}
                      <div style={{ flex:1, height:1, background: anyActive ? "#a3e63520" : "#192840" }} />
                    </div>

                    {/* Node grid */}
                    <div style={{
                      display:"grid",
                      gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
                      gap:5,
                      width:"100%",
                    }}>
                      {phaseNodes.map(n => (
                        <MobileNodeCard
                          key={n.id}
                          n={n}
                          on={activeNodes.has(n.id)}
                          dim={dimNodes.has(n.id)}
                        />
                      ))}
                    </div>

                    {pi < MOBILE_PHASES.length - 1 && (() => {
                      const nextPhase = MOBILE_PHASES[pi + 1];
                      const nextPhaseNodes = nextPhase.nodeIds.map(id => NM[id]).filter(Boolean);
                      const nextActive = nextPhaseNodes.some(n => activeNodes.has(n.id) || dimNodes.has(n.id));
                      const flowActive = anyActive || nextActive;
                      return (
                        <div style={{
                          display:"flex", justifyContent:"center", alignItems:"center",
                          padding:"2px 0", gap:3,
                        }}>
                          {flowActive && isLive ? (
                            // Animated data-flow dots when live
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                              {[0,1,2].map(i => (
                                <div key={i} style={{
                                  width:3, height:3, borderRadius:"50%",
                                  background: "#a3e635",
                                  opacity: (liveStep + i) % 3 === 0 ? 1 : 0.2,
                                  transition:"opacity 0.35s ease",
                                  boxShadow: (liveStep + i) % 3 === 0 ? "0 0 4px #a3e635" : "none",
                                }} />
                              ))}
                            </div>
                          ) : (
                            <div style={{
                              fontSize:10,
                              color: anyActive ? "#a3e63560" : "#192840",
                            }}>▾</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* ── Live job banner ── */}
            {isLive && (
              <div style={{
                margin:"0 12px 8px",
                padding:"7px 10px",
                border:"1px solid #22d3ee30",
                borderRadius:6,
                background:"#22d3ee0a",
                display:"flex", flexDirection:"column", gap:4,
                flexShrink:0,
              }}>
                {/* Job running label */}
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{
                    width:5, height:5, borderRadius:"50%",
                    background:"#22d3ee", boxShadow:"0 0 6px #22d3ee",
                    animation:"blink 0.6s ease-in-out infinite", flexShrink:0,
                  }} />
                  <span style={{
                    fontSize:8, letterSpacing:"0.12em", color:"#22d3ee",
                    flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  }}>
                    {liveLabel || "JOB RUNNING"}
                  </span>
                </div>
                {/* Current pipeline step */}
                <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:13 }}>
                  <span style={{ fontSize:7.5, letterSpacing:"0.14em", color:"#a3e63599",
                    flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    ▸ {WAVES[liveStep % WAVES.length].label}
                  </span>
                  {/* Step progress dots */}
                  <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                    {WAVES.slice(0, 8).map((_, i) => (
                      <div key={i} style={{
                        width:3, height:3, borderRadius:"50%",
                        background: i === (liveStep % 8) ? "#a3e635" : "#192840",
                        boxShadow: i === (liveStep % 8) ? "0 0 4px #a3e635" : "none",
                        transition:"all 0.3s",
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Sessions section ── */}
            <div style={{ padding:"8px 12px 12px", flexShrink:0 }}>
              {/* Section header */}
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                marginBottom:8, marginTop:4,
              }}>
                <div style={{
                  fontSize:8, letterSpacing:"0.22em", color:"#3a5070",
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  <div style={{ width:1, flex:1, height:1, background:"#192840" }} />
                  RESEARCH SESSIONS
                  <div style={{ width:1, flex:1, height:1, background:"#192840" }} />
                </div>
              </div>

              {!hasSessions ? (
                // Standby state
                <div style={{
                  padding:"18px 14px",
                  border:"1px solid #192840",
                  borderRadius:8,
                  background:"#0c1320",
                  display:"flex", flexDirection:"column", alignItems:"center",
                  gap:10, textAlign:"center",
                }}>
                  <Cpu style={{ width:22, height:22, color:"#253850" }} />
                  <div>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", color:"#253850", marginBottom:4 }}>
                      NO SESSIONS YET
                    </div>
                    <div style={{ fontSize:8, color:"#1e3050", letterSpacing:"0.08em", lineHeight:1.6 }}>
                      Run Hybrid Research from a profile{"\n"}to see real UCT work here.
                    </div>
                  </div>
                </div>
              ) : (
                // Real session list
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {sessions.slice(0, 12).map(s => (
                    <div key={s.id} style={{
                      padding:"10px 12px",
                      border:"1px solid #192840",
                      borderRadius:7,
                      background:"#0d1525",
                      display:"flex", flexDirection:"column", gap:6,
                    }}>
                      {/* Row 1: name + status */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                        <Cpu style={{ width:11, height:11, color:"#a78bfa", flexShrink:0 }} />
                        <div style={{
                          flex:1, minWidth:0,
                          fontSize:10, fontWeight:700, letterSpacing:"0.1em",
                          color:"#c4b8a0",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        }}>
                          {s.targetEntityName ?? `Session #${s.id}`}
                        </div>
                        <div style={{
                          fontSize:8, letterSpacing:"0.12em", flexShrink:0,
                          color: crmColor(s.crmStatus),
                          padding:"2px 6px", border:`1px solid ${crmColor(s.crmStatus)}40`,
                          borderRadius:3, background:`${crmColor(s.crmStatus)}10`,
                        }}>
                          {s.crmStatus.toUpperCase()}
                        </div>
                      </div>

                      {/* Row 2: metrics */}
                      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                        {s.pathScore != null && (
                          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                            <span style={{ fontSize:7, letterSpacing:"0.14em", color:"#3a5070" }}>PATH SCORE</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#a3e635", lineHeight:1 }}>
                              {s.pathScore.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {s.bayesianScoreAtRuntime != null && (
                          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                            <span style={{ fontSize:7, letterSpacing:"0.14em", color:"#3a5070" }}>SIGNAL</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#38bdf8", lineHeight:1 }}>
                              {s.bayesianScoreAtRuntime.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {s.generatedPitch && (
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <Target style={{ width:9, height:9, color:"#fbbf24" }} />
                            <span style={{ fontSize:8, letterSpacing:"0.1em", color:"#fbbf24" }}>PITCH READY</span>
                          </div>
                        )}
                        <div style={{ marginLeft:"auto", fontSize:8, color:"#253850", letterSpacing:"0.08em" }}>
                          {formatDate(s.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {sessions.length > 12 && (
                    <div style={{
                      textAlign:"center", fontSize:8, letterSpacing:"0.14em",
                      color:"#253850", padding:"6px 0",
                    }}>
                      +{sessions.length - 12} MORE SESSIONS
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Footer meters (real data) ── */}
      <footer style={{
        borderTop:"1px solid #192840", flexShrink:0,
        background:"rgba(11,17,32,0.95)",
        padding:"10px 0",
        display:"flex", alignItems:"center",
      }}>
        <Meter label="ENTITIES" value={totalEntities} max={Math.max(totalEntities, 50)} color="#38bdf8" />
        <div style={{ width:1, height:32, background:"#192840", flexShrink:0 }} />
        <Meter label="RUNS" value={sessions.length} max={Math.max(sessions.length, 10)} color="#a3e635" />
        <div style={{ width:1, height:32, background:"#192840", flexShrink:0 }} />
        <Meter label="OUTREACH" value={pitchCount} max={Math.max(sessions.length, 5)} color="#22d3ee" />
      </footer>
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
          width:38, height:38, borderRadius:"50%", flexShrink:0,
          border:`2px solid ${adaptive ? "#22d3ee" : "#a3e635"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          lineHeight:1,
          color: adaptive ? "#22d3ee" : "#a3e635",
          fontSize:20,
          boxShadow:`0 0 14px ${adaptive ? "#22d3ee55" : "#a3e63555"}`,
          animation: adaptive ? "pulseGlow 0.7s ease-in-out infinite" : "breathe 3s ease-in-out infinite",
          transition:"all 0.4s",
        }}>
          <span style={{ lineHeight:1, display:"block", marginTop:1 }}>☢</span>
        </div>
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
                display:"flex", alignItems:"center", justifyContent:"center",
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

// ── Shared breakpoint hook ────────────────────────────────────────────────────
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
  const isMobile = useIsMobile();

  // ── Real data for mobile ──────────────────────────────────────────────────
  const [sessions,      setSessions]      = useState<ResearchSession[]>([]);
  const [totalEntities, setTotalEntities] = useState(0);
  const [loadingData,   setLoadingData]   = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  const [liveNodes,     setLiveNodes]     = useState<Set<string>>(new Set());
  const [liveLabel,     setLiveLabel]     = useState<string>("");

  const pollJobs = useCallback(async () => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    try {
      // Poll both the regular job list AND the atlas-status endpoint in parallel
      const [jobsData, atlasData] = await Promise.all([
        fetch(`${BASE}/api/ingest/jobs`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : { jobs: [] })
          .catch(() => ({ jobs: [] })),
        fetch(`${BASE}/api/ingest/atlas-status`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
      ]);

      const nodes = new Set<string>();
      const labels: string[] = [];

      // ── Atlas job (phase-aware) ───────────────────────────────────────────────
      if (atlasData?.status === "running" && atlasData?.jobId) {
        const msg: string = atlasData.message ?? "";
        const phaseMatch = msg.match(/Phase\s+(\d+)/i);
        const phase = phaseMatch ? parseInt(phaseMatch[1], 10) : 0;
        const phaseNodes = ATLAS_PHASE_NODES[phase] ?? ATLAS_PHASE_NODES[0];
        phaseNodes.forEach((n: string) => nodes.add(n));
        const label = msg.replace(/^Phase \d+\/[^:]+:\s*/i, "").split("—")[0].trim().slice(0, 70);
        labels.push(`▶ Atlas Phase ${phase}/10 — ${label}`);
      }

      // ── Regular jobs ─────────────────────────────────────────────────────────
      const running = (jobsData.jobs ?? []).filter((j: any) =>
        j.status === "running" || j.status === "active"
      );
      for (const job of running) {
        (JOB_NODE_MAP[job.id] ?? []).forEach((n: string) => nodes.add(n));
        if (job.label) labels.push(job.label);
      }

      if (nodes.size > 0) {
        setLiveNodes(nodes);
        setLiveLabel(labels.join(" · "));
      } else {
        setLiveNodes(new Set());
        setLiveLabel("");
      }
    } catch { /* non-fatal */ }
  }, []);

  // Poll live jobs every 3 s so nodes light up as research runs
  useEffect(() => {
    pollJobs();
    const id = setInterval(pollJobs, 3_000);
    return () => clearInterval(id);
  }, [pollJobs]);

  const fetchData = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setSyncing(true);
    }
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    try {
      const [sess, stats] = await Promise.all([
        fetch(`${BASE}/api/research/sessions?limit=20`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${BASE}/api/dashboard/stats`, { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      ]);
      setSessions(Array.isArray(sess) ? sess : []);
      setTotalEntities((stats as { totalEntities?: number })?.totalEntities ?? 0);
    } finally {
      setLoadingData(false);
      setSyncing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchData(false); }, [fetchData]);

  // Auto-poll every 10 s so the reactor stays live after research completes
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 10_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Fake animation kept for desktop architecture diagram only ─────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale,    setScale]    = useState(1);
  const [step,     setStep]     = useState(0);
  const [cycle,    setCycle]    = useState(1);
  const [signals,  setSignals]  = useState(0);
  const [contacts, setContacts] = useState(0);
  const [loops,    setLoops]    = useState(0);

  useEffect(() => {
    if (isMobile) return;
    const t = setInterval(() => {
      setStep(s => {
        const next = (s + 1) % WAVES.length;
        if (next === 0) setCycle(c => c + 1);
        return next;
      });
    }, 1500);
    return () => clearInterval(t);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) return;
    const w = WAVES[step];
    if (w.adaptive) setLoops(l => l + 1);
    if (w.nodes.includes("pitch")) { setSignals(s => s + 7); setContacts(c => c + 2); }
  }, [step, isMobile]);

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

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", width:"100%" }}>
        <MobileReactor
          sessions={sessions}
          totalEntities={totalEntities}
          loading={loadingData}
          onRefresh={() => fetchData(true)}
          syncing={syncing}
          liveNodes={liveNodes}
          liveLabel={liveLabel}
        />
      </div>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{ position:"absolute", inset:0, overflow:"hidden", background:"#0b1120" }}
    >
      <div style={{ transformOrigin:"top left", transform:`scale(${scale})`, width:1600, height:960 }}>
        <DesktopReactor step={step} cycle={cycle} signals={signals} contacts={contacts} loops={loops} />
      </div>
    </div>
  );
}
