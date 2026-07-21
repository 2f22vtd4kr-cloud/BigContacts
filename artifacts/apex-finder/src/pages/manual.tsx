import { useState, useEffect } from "react";
import {
  Crosshair, Database, Globe, Network, Terminal, KanbanSquare,
  ShieldAlert, TrendingUp, Users, Briefcase, Building2, Anchor,
  Gem, Zap, Play, Filter, Download, UserCheck, Shield, Map,
  BarChart3, Target, Activity, Search, Bot, Layers, ChevronRight,
  FileText, Cpu, GitBranch, AlertCircle, CheckCircle, Info, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Screenshot base path ──────────────────────────────────────────────────── */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function ss(name: string) {
  return `${BASE}/screenshots/manual/${name}`;
}

/* ─── Annotation pin ────────────────────────────────────────────────────────── */
interface APin { n: number; x: number; y: number; color?: string; label: string }

function Pin({ n, color }: { n: number; color: string }) {
  return (
    <div
      className="w-4 h-4 rounded-full border border-white/60 flex items-center justify-center text-[8px] font-black select-none"
      style={{ backgroundColor: color, color: "#000", boxShadow: `0 0 0 1.5px ${color}50, 0 2px 6px rgba(0,0,0,0.9)` }}
    >
      {n}
    </div>
  );
}

function AnnotatedScreenshot({ src, alt, pins, caption }: { src: string; alt: string; pins: APin[]; caption?: string }) {
  const def = "#10B981";
  return (
    <div className="my-6 rounded-xl overflow-hidden border border-[#1E293B] bg-[#050A14] shadow-2xl">
      {caption && (
        <div className="px-4 py-2.5 border-b border-[#1E293B] flex items-center gap-2 bg-[#0B0F19]">
          <span className="text-[#10B981] text-[10px]">▣</span>
          <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">{caption}</span>
        </div>
      )}
      <div className="relative">
        <img src={src} alt={alt} className="w-full block" loading="lazy" />
        {pins.map((p) => (
          <div key={p.n} className="absolute pointer-events-none" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)" }}>
            <Pin n={p.n} color={p.color ?? def} />
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-[#1E293B] grid grid-cols-1 md:grid-cols-2 gap-2 bg-[#0B0F19]">
        {pins.map((p) => (
          <div key={p.n} className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 mt-0.5" style={{ backgroundColor: p.color ?? def, color: "#000" }}>{p.n}</div>
            <span className="text-xs text-[#94A3B8] leading-snug">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Callout ────────────────────────────────────────────────────────────────── */
function Callout({ icon, color, title, children }: { icon: React.ReactNode; color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-lg border my-5" style={{ borderColor: `${color}30`, backgroundColor: `${color}09` }}>
      <div className="mt-0.5 shrink-0" style={{ color }}>{icon}</div>
      <div>
        <p className="text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color }}>{title}</p>
        <div className="text-sm text-[#94A3B8] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ─── Feature card grid ──────────────────────────────────────────────────────── */
function FeatureGrid({ items }: { items: { icon: React.ReactNode; color: string; label: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-5">
      {items.map((item) => (
        <div key={item.label} className="flex gap-3 p-4 rounded-lg border" style={{ borderColor: `${item.color}25`, backgroundColor: `${item.color}07` }}>
          <div className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: item.color, backgroundColor: `${item.color}20`, color: item.color }}>{item.icon}</div>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: item.color }}>{item.label}</p>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Numbered steps ────────────────────────────────────────────────────────── */
function Steps({ color, items }: { color: string; items: { title: string; body: string }[] }) {
  return (
    <div className="space-y-0 my-5">
      {items.map((s, i) => (
        <div key={i} className="flex gap-4 pb-5 relative">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 z-10"
              style={{ borderColor: color + "60", color, backgroundColor: color + "15" }}>{i + 1}</div>
            {i < items.length - 1 && <div className="w-px flex-1 mt-1" style={{ backgroundColor: color + "25" }} />}
          </div>
          <div className="pb-1">
            <p className="text-sm font-bold text-[#E2E8F0] mb-1">{s.title}</p>
            <p className="text-sm text-[#64748B] leading-relaxed">{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Score bar ─────────────────────────────────────────────────────────────── */
function ScoreBar({ name, score }: { name: string; score: number }) {
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#CBD5E1]">{name}</span>
        <span style={{ color }} className="font-bold font-mono">{score}</span>
      </div>
      <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ─── Inline code block ─────────────────────────────────────────────────────── */
function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-[#1E293B] text-[#10B981] text-xs px-1.5 py-0.5 rounded font-mono">{children}</code>;
}

/* ─── Section wrapper ───────────────────────────────────────────────────────── */
function Section({ id, level, levelColor, levelLabel, title, children }: {
  id: string; level: string; levelColor: string; levelLabel: string; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 md:p-8 overflow-hidden scroll-mt-8">
      <div className="absolute top-0 right-0 text-8xl font-bold select-none leading-none pr-6 pt-4" style={{ color: `${levelColor}07` }}>{level}</div>
      <div className="mb-7">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border mb-3" style={{ color: levelColor, backgroundColor: `${levelColor}15`, borderColor: `${levelColor}30` }}>{levelLabel}</span>
        <h2 className="text-xl md:text-2xl font-bold text-[#E2E8F0] font-mono">{title}</h2>
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

/* ─── Sidebar levels ────────────────────────────────────────────────────────── */
const LEVELS = [
  { id: 1,  color: "#10B981", numeral: "I",    title: "BASICS",       subtitle: "Start here" },
  { id: 2,  color: "#3B82F6", numeral: "II",   title: "ENTITY LEDGER", subtitle: "Target registry" },
  { id: 3,  color: "#06B6D4", numeral: "III",  title: "DEEP SEARCH",  subtitle: "NL intelligence" },
  { id: 4,  color: "#F59E0B", numeral: "IV",   title: "NETWORK GRAPH", subtitle: "Relationship map" },
  { id: 5,  color: "#EF4444", numeral: "V",    title: "INTEL TERMINAL", subtitle: "Hybrid analysis" },
  { id: 6,  color: "#8B5CF6", numeral: "VI",   title: "PIPELINE CRM", subtitle: "Outreach tracking" },
  { id: 7,  color: "#EC4899", numeral: "VII",  title: "PERSONA LOOP", subtitle: "AI improvement" },
  { id: 8,  color: "#14B8A6", numeral: "VIII", title: "DATA SOURCES", subtitle: "Registry feeds" },
  { id: 9,  color: "#F97316", numeral: "IX",   title: "ENTITY PROFILE", subtitle: "Deep-dive view" },
  { id: 10, color: "#6366F1", numeral: "X",    title: "THE ENGINE",   subtitle: "Scoring & Pipeline" },
];

function SidebarItem({ level, active, onClick }: { level: typeof LEVELS[0]; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all border-l-4"
      style={{ borderLeftColor: active ? level.color : "transparent", backgroundColor: active ? `${level.color}10` : "transparent" }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold shrink-0 transition-all"
        style={{ borderColor: active ? level.color : "#1E293B", color: active ? level.color : "#475569", backgroundColor: active ? `${level.color}20` : "transparent" }}>
        {level.numeral}
      </div>
      <div>
        <div className="text-xs font-bold font-mono leading-tight" style={{ color: active ? level.color : "#94A3B8" }}>{level.title}</div>
        <div className="text-[10px] text-[#475569] uppercase tracking-wider mt-0.5">{level.subtitle}</div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════════ */
export default function FieldManual() {
  const [activeLevel, setActiveLevel] = useState(1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const n = parseInt(entry.target.id.replace("section-", ""), 10);
            if (!isNaN(n)) setActiveLevel(n);
          }
        }
      },
      { threshold: 0.15 }
    );
    for (let i = 1; i <= 10; i++) {
      const el = document.getElementById(`section-${i}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (n: number) => {
    document.getElementById(`section-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveLevel(n);
  };

  return (
    <div className="flex flex-col md:flex-row md:h-full bg-[#0B0F19] font-mono text-[#E2E8F0] md:overflow-hidden">

      {/* ── Sidebar desktop ───────────────────────────────────────────────────── */}
      <div className="hidden md:flex w-52 shrink-0 bg-[#0F172A] border-r border-[#1E293B] flex-col">
        <div className="p-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-2 text-[#10B981] mb-1">
            <Crosshair size={16} className="animate-pulse" />
            <span className="text-xs font-bold tracking-widest">FIELD MANUAL</span>
          </div>
          <div className="text-[10px] text-[#475569] tracking-wider uppercase">v1.0 · Updated Jul 2026</div>
        </div>
        <nav className="flex-1 py-2 flex flex-col overflow-y-auto">
          {LEVELS.map((level) => (
            <SidebarItem key={level.id} level={level} active={activeLevel === level.id} onClick={() => scrollToSection(level.id)} />
          ))}
        </nav>
        <div className="p-4 border-t border-[#1E293B]">
          <div className="text-[10px] text-[#334155] text-center tracking-widest uppercase">Private Build</div>
        </div>
      </div>

      {/* ── Mobile tab bar ────────────────────────────────────────────────────── */}
      <div className="md:hidden flex-shrink-0 flex border-b border-[#1E293B] bg-[#0F172A] overflow-x-auto">
        {LEVELS.map((level) => {
          const active = activeLevel === level.id;
          return (
            <button key={level.id} onClick={() => scrollToSection(level.id)}
              className="flex items-center gap-1.5 px-3 py-3 whitespace-nowrap border-b-2 transition-colors flex-shrink-0"
              style={{ borderBottomColor: active ? level.color : "transparent", color: active ? level.color : "#475569" }}>
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold"
                style={{ borderColor: active ? level.color : "#1E293B" }}>{level.numeral}</span>
              <span className="text-[10px] font-bold tracking-wider hidden sm:block">{level.title}</span>
            </button>
          );
        })}
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────────── */}
      <div className="flex-1 md:overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-24">

          {/* ══ LEVEL I — BASICS ══════════════════════════════════════════════ */}
          <Section id="section-1" level="I" levelColor="#10B981" levelLabel="LEVEL I — BASICS" title="What ApexFinder Pro Does">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5 max-w-2xl">
              ApexFinder Pro is a private intelligence platform for reaching ultra-high-net-worth individuals (HNWIs).
              It ingests 32,000+ verified identities from public government registries, maps their asset portfolios
              and corporate connections, then uses a 5-layer AI engine to find the warmest introduction path to any target.
            </p>

            <Callout icon={<TrendingUp size={14} />} color="#10B981" title="The core idea">
              HNWIs don't respond to strangers. They respond to warm introductions through people they already
              trust — their private banker, their art dealer, their family office manager. ApexFinder maps those
              relationships from public data so you know <em>exactly</em> who to reach first, and what to say.
            </Callout>

            {/* 5-step workflow */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">The 5-step playbook</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0 bg-[#0B0F19] border border-[#1E293B] rounded-xl overflow-hidden mb-6">
              {[
                { n: "01", icon: <Database size={13} />, color: "#10B981", label: "Entity Ledger",   hint: "Your roster of targets" },
                { n: "02", icon: <Search size={13} />,   color: "#06B6D4", label: "Deep Search",     hint: "Find by natural language" },
                { n: "03", icon: <Network size={13} />,  color: "#F59E0B", label: "Network Graph",   hint: "Map connections & assets" },
                { n: "04", icon: <Terminal size={13} />, color: "#EF4444", label: "Intel Terminal",  hint: "Find warm path" },
                { n: "05", icon: <KanbanSquare size={13} />, color: "#8B5CF6", label: "Pipeline CRM", hint: "Track & execute outreach" },
              ].map((step, i) => (
                <div key={step.n} className={`flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-2 p-4${i < 4 ? " border-b md:border-b-0 md:border-r border-[#1E293B]" : ""}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 relative"
                    style={{ borderColor: step.color + "60", backgroundColor: step.color + "15", color: step.color }}>
                    {step.icon}
                    <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-black"
                      style={{ backgroundColor: step.color }}>{step.n}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#E2E8F0]">{step.label}</p>
                    <p className="text-[10px] text-[#475569] mt-0.5">{step.hint}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation overview */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">Every page at a glance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: <Activity size={12} />, color: "#10B981", name: "Intelligence HQ", path: "/", desc: "Live signal dashboard — entity counts, hot leads, asset map, ingestion controls." },
                { icon: <Database size={12} />, color: "#3B82F6", name: "Entity Ledger", path: "/entities", desc: "Full sortable/filterable list of all 32,300+ targets with scores and contact vectors." },
                { icon: <Search size={12} />,   color: "#06B6D4", name: "Deep Search", path: "/deep-search", desc: "Natural language search fusing BM25, TF-IDF, and Bayesian graph signals." },
                { icon: <Network size={12} />,  color: "#F59E0B", name: "Network Graph", path: "/graph", desc: "Interactive D3 graph of relationships: owns, directs, shares addresses, co-investors." },
                { icon: <Terminal size={12} />, color: "#EF4444", name: "Intel Terminal", path: "/research", desc: "Hybrid Research — 5-layer pipeline with 120 UCT rollouts to find the optimal warm-introduction path." },
                { icon: <KanbanSquare size={12} />, color: "#8B5CF6", name: "Pipeline CRM", path: "/crm", desc: "8-stage Kanban board tracking every target from Lead Gen to Closed." },
                { icon: <Bot size={12} />,      color: "#EC4899", name: "Persona Loop", path: "/improvements", desc: "6 AI agents that continuously scan entities and log concrete enrichment actions." },
                { icon: <Layers size={12} />,   color: "#14B8A6", name: "Data Sources", path: "/data-sources", desc: "Registry ingestion panel — run enrichers, track coverage, trigger background jobs." },
              ].map((p) => (
                <div key={p.name} className="flex gap-3 p-3 rounded-lg border border-[#1E293B] bg-[#0B0F19]">
                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: p.color + "20", color: p.color }}>{p.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#E2E8F0]">{p.name}</span>
                      <code className="text-[10px] text-[#475569] font-mono">{p.path}</code>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ══ LEVEL II — ENTITY LEDGER ════════════════════════════════════════ */}
          <Section id="section-2" level="II" levelColor="#3B82F6" levelLabel="LEVEL II — ENTITY LEDGER" title="Your Target Registry">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              The Entity Ledger is the backbone of everything — every HNWI, gatekeeper, corporation, and trust
              the system knows about lives here. After a Western HNWI Engine run you'll have 32,000+ verified
              records, all pre-scored and ready to filter.
            </p>

            <AnnotatedScreenshot
              src={ss("entities.jpg")}
              alt="Entity Ledger"
              caption="Entity Ledger — annotated"
              pins={[
                { n: 1, x: 30,  y: 10.5, color: "#06B6D4", label: "Search bar — filter by name, ticker, or keyword in real time" },
                { n: 2, x: 50,  y: 10.5, color: "#3B82F6", label: "Type filter chips — ALL / HNWI / GATEKEEPER / CORPORATION / TRUST" },
                { n: 3, x: 73,  y: 10.5, color: "#F59E0B", label: "Proximity dropdown — filter by reachability (Any → 4+ → 7+ → 9+)" },
                { n: 4, x: 85.5,y: 10.5, color: "#10B981", label: "Live Intel button — query public registries for the selected entity in real time" },
                { n: 5, x: 92,  y: 10.5, color: "#A855F7", label: "CSV export — download the current filtered view as a spreadsheet" },
                { n: 6, x: 98,  y: 10.5, color: "#EF4444", label: "+ ADD — manually add a new entity to the registry" },
                { n: 7, x: 31,  y: 25,   color: "#F59E0B", label: "PROX badge — proximity score for this entity (5/10 = gatekeeper-accessible)" },
                { n: 8, x: 44,  y: 25,   color: "#3B82F6", label: "HNWI type tag — classification: HNWI / Gatekeeper / Corporation / Trust" },
                { n: 9, x: 68.5,y: 25,   color: "#10B981", label: "Signal score (94) — Bayesian confidence score 0–100; click to open profile" },
                { n: 10,x: 96,  y: 97,   color: "#64748B", label: "Export CSV footer link — alternate export for the full visible set" },
              ]}
            />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">Entity types</h3>
            <FeatureGrid items={[
              { icon: <Crosshair size={13} />, color: "#10B981", label: "HNWI", desc: "Ultra-high-net-worth individual. Your primary subject — the person you want to reach." },
              { icon: <Users size={13} />,    color: "#F59E0B", label: "Gatekeeper", desc: "Inner circle: private banker, family office manager, art dealer, estate lawyer, yacht broker. Your actual entry point." },
              { icon: <Building2 size={13} />,color: "#3B82F6", label: "Corporation", desc: "Companies the HNWI directs, owns, or is a registered shareholder of." },
              { icon: <Briefcase size={13} />,color: "#A855F7", label: "Trust / SPV", desc: "Offshore vehicles, family trusts, and special-purpose holding structures." },
            ]} />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">Proximity score scale (1–10)</h3>
            <div className="bg-[#050A14] border border-[#3B82F6]/25 rounded-lg p-5 mb-5">
              {[
                { range: "9–10", label: "Personal contact",  color: "#10B981", desc: "Direct phone, WhatsApp, or Signal — confirmed reachable in one step." },
                { range: "7–8",  label: "Near-personal",     color: "#3B82F6", desc: "One warm handshake away. A gatekeeper with confirmed private access can make the intro." },
                { range: "4–6",  label: "Gatekeeper path",   color: "#F59E0B", desc: "A reliable intermediary is known but personal access is not yet confirmed." },
                { range: "1–3",  label: "Cold / sparse",     color: "#EF4444", desc: "Limited data. Company secretary or PR is the only known contact. Needs enrichment first." },
              ].map((row) => (
                <div key={row.range} className="flex gap-3 items-start text-xs py-2 border-b border-[#1E293B] last:border-0">
                  <span className="font-bold font-mono w-10 shrink-0 text-right mt-0.5" style={{ color: row.color }}>{row.range}</span>
                  <div>
                    <span className="font-bold text-[#E2E8F0]">{row.label}</span>
                    <span className="text-[#64748B] ml-2">{row.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <Callout icon={<Info size={14} />} color="#3B82F6" title="Hot leads">
              Entities with a Bayesian score ≥ 70 <em>and</em> a Proximity score ≥ 7 are automatically flagged
              as <strong className="text-[#F59E0B]">Hot Leads</strong> and shown with an amber indicator in the dashboard counter.
              These are your immediate-action targets.
            </Callout>
          </Section>

          {/* ══ LEVEL III — DEEP SEARCH ═════════════════════════════════════════ */}
          <Section id="section-3" level="III" levelColor="#06B6D4" levelLabel="LEVEL III — DEEP SEARCH" title="Natural Language Intelligence Search">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              Deep Search lets you query the entire 32,000-entity database in plain English. You don't need to know
              the exact name — just describe what you're looking for. The engine decomposes your query through four
              algorithms and fuses the results.
            </p>

            <AnnotatedScreenshot
              src={ss("deep-search.jpg")}
              alt="Deep Search"
              caption="Deep Search — annotated"
              pins={[
                { n: 1, x: 55,  y: 18, color: "#06B6D4", label: "Query input — type any natural language query, e.g. 'US private jet owners in Texas'" },
                { n: 2, x: 95,  y: 18, color: "#10B981", label: "SEARCH button — executes the 5-layer hybrid search" },
                { n: 3, x: 26,  y: 24, color: "#F59E0B", label: "FILTERS — open advanced filters: has contact, score threshold, entity type, source registry" },
                { n: 4, x: 26,  y: 29, color: "#3B82F6", label: "Preset query chips — one-click example searches to get started" },
                { n: 5, x: 60,  y: 12, color: "#A855F7", label: "Pipeline indicator — shows which algorithms are active: BM25 · TF-IDF · Graph/Bayesian · RRF" },
              ]}
            />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">How the 5-layer search works</h3>
            <div className="space-y-3 mb-6">
              {[
                { layer: "L1", name: "BM25 Keyword Retrieval",       color: "#10B981", desc: "Classic full-text search over entity names, notes, and tags. Fast and precise for exact-match queries." },
                { layer: "L2", name: "TF-IDF Semantic Similarity",   color: "#3B82F6", desc: "Vector similarity over enriched text fields. Catches synonyms and paraphrases that BM25 misses." },
                { layer: "L3", name: "Bayesian Graph Signals",        color: "#F59E0B", desc: "Uses the relationship graph — entities connected to high-signal targets score higher in graph-aware queries." },
                { layer: "L4", name: "RRF Score Fusion",              color: "#A855F7", desc: "Reciprocal Rank Fusion combines the L1–L3 ranked lists into a single merged ranking with no weight tuning needed." },
                { layer: "L5", name: "Planner → Retriever → Analyst → Critic", color: "#EF4444", desc: "Multi-agent chain: the Planner decomposes the query, the Retriever fetches candidates, the Analyst scores them, and the Critic validates the result before it reaches the UI." },
              ].map((l) => (
                <div key={l.layer} className="flex gap-3 p-3.5 rounded-lg border" style={{ borderColor: `${l.color}25`, backgroundColor: `${l.color}07` }}>
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded h-fit shrink-0 mt-0.5"
                    style={{ color: l.color, backgroundColor: l.color + "20", border: `1px solid ${l.color}40` }}>{l.layer}</span>
                  <div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: l.color }}>{l.name}</p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{l.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">Query examples that work well</h3>
            <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-4 space-y-2 mb-5">
              {[
                "US private jet owners in Texas",
                "British directors with aviation assets",
                "Norwegian company directors",
                "turbofan aircraft owners California",
                "SEC EDGAR large shareholders",
                "hot leads UK helicopters",
              ].map((q) => (
                <div key={q} className="flex items-center gap-2 text-xs">
                  <ChevronRight size={11} className="text-[#06B6D4] shrink-0" />
                  <code className="text-[#94A3B8]">{q}</code>
                </div>
              ))}
            </div>

            <Callout icon={<Filter size={14} />} color="#06B6D4" title="Using the Filters panel">
              Click <strong className="text-[#06B6D4]">FILTERS</strong> to narrow results to entities with confirmed
              contact data, above a minimum signal score, or from a specific source registry (FAA, SEC EDGAR, Companies House, BRREG).
              Combine with a natural language query for surgical targeting.
            </Callout>
          </Section>

          {/* ══ LEVEL IV — NETWORK GRAPH ════════════════════════════════════════ */}
          <Section id="section-4" level="IV" levelColor="#F59E0B" levelLabel="LEVEL IV — NETWORK GRAPH" title="Mapping Relationships">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              The Network Graph renders every public data point linked to a target as an interactive web of
              relationships. Your job is to find the shortest warm path from you — or someone you know — to
              the HNWI. The graph makes invisible connections visible.
            </p>

            <AnnotatedScreenshot
              src={ss("graph.jpg")}
              alt="Network Graph"
              caption="Network Graph — annotated"
              pins={[
                { n: 1, x: 49,  y: 11, color: "#F59E0B", label: "Target dropdown — select any entity to re-render the full graph around them" },
                { n: 2, x: 63,  y: 11, color: "#3B82F6", label: "Zoom in — also available via scroll/pinch on the canvas" },
                { n: 3, x: 67,  y: 11, color: "#3B82F6", label: "Zoom out" },
                { n: 4, x: 68,  y: 11, color: "#06B6D4", label: "Fullscreen toggle — expand graph to fill the entire viewport" },
                { n: 5, x: 74,  y: 11, color: "#A855F7", label: "Filter — show/hide node types (HNWI, Corp, Trust, Gatekeeper, Asset)" },
                { n: 6, x: 60,  y: 54, color: "#10B981", label: "Central node — the selected HNWI. Size = Bayesian score. Click any node to see its profile." },
                { n: 7, x: 22,  y: 90, color: "#64748B", label: "Color legend — HNWI (green) / Corp (blue) / Trust (purple) / Gatekeeper (amber) / Asset (gray)" },
              ]}
            />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">What each node type means</h3>
            <FeatureGrid items={[
              { icon: <Crosshair size={13} />, color: "#10B981", label: "HNWI Target (green)", desc: "Your subject. The large central node when they are selected. Size scales with Bayesian score." },
              { icon: <Users size={13} />,     color: "#F59E0B", label: "Gatekeeper (amber)", desc: "Inner circle: private bankers, family office managers, art dealers. These are your actual entry points." },
              { icon: <Building2 size={13} />, color: "#3B82F6", label: "Corporation (blue)", desc: "Companies they direct, own, or are registered shareholders of. Often the bridge to a gatekeeper." },
              { icon: <Briefcase size={13} />, color: "#A855F7", label: "Trust / SPV (purple)", desc: "Offshore vehicles, family trusts, and holding structures. Often linked to multiple HNWIs." },
              { icon: <Anchor size={13} />,    color: "#64748B", label: "Asset (gray)", desc: "Registered wealth: aircraft (FAA), vessels (Lloyd's), real estate, equity stakes." },
            ]} />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">Edge (relationship) types</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {[
                { label: "OWNS",            desc: "Direct legal ownership or beneficial interest",         color: "#10B981" },
                { label: "MANAGES",         desc: "Appointed director, trustee, or fund manager",          color: "#3B82F6" },
                { label: "MEMBER_OF",       desc: "Shareholder, club member, board seat",                  color: "#A855F7" },
                { label: "KNOWN_ASSOCIATE", desc: "Co-signatory, co-investor, known social tie",           color: "#F59E0B" },
                { label: "SHARED_ADDRESS",  desc: "Registered at the same correspondence address",         color: "#06B6D4" },
                { label: "CORPORATE_SERIES",desc: "Same corporate name series (e.g. Tannjete I / II LLC)", color: "#EF4444" },
              ].map((e) => (
                <div key={e.label} className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-3">
                  <p className="text-xs font-bold font-mono mb-1" style={{ color: e.color }}>{e.label}</p>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{e.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">How to use the graph strategically</h3>
            <Steps color="#F59E0B" items={[
              { title: "Select your target", body: "Use the dropdown at the top. The entire graph re-renders around that individual. Larger nodes = higher Bayesian score = more data found." },
              { title: "Spot the Gatekeepers", body: "Amber nodes are inner-circle members: private bankers, family office managers, art dealers. They sit between you and the target — they are your real first objective." },
              { title: "Find your closest gatekeeper", body: "Look for gatekeepers also connected to entities or people you already know. That shared connection is your warm introduction angle." },
              { title: "Don't guess — map it", body: "Once you've visually scanned the graph, open the Intel Terminal to run a full Hybrid Research path analysis. Human intuition and the algorithm together beat either one alone." },
            ]} />
          </Section>

          {/* ══ LEVEL V — INTEL TERMINAL ════════════════════════════════════════ */}
          <Section id="section-5" level="V" levelColor="#EF4444" levelLabel="LEVEL V — INTEL TERMINAL" title="Hybrid Research & Path Finding">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              The Intel Terminal runs the full 5-layer Hybrid Intelligence Pipeline to find the optimal
              warm-introduction path to your target. It tests 120 possible approach routes through the
              relationship graph and returns a ranked, scored playbook — not a guess.
            </p>

            <AnnotatedScreenshot
              src={ss("research.jpg")}
              alt="Intel Terminal"
              caption="Intel Terminal — annotated"
              pins={[
                { n: 1, x: 21,  y: 9,  color: "#EF4444", label: "TARGET SELECTION panel — lists all HNWIs with signal scores; click to select" },
                { n: 2, x: 21,  y: 17, color: "#A855F7", label: "5-Algorithm pipeline summary: L1 BM25 → L2 Planner-Retriever-Analyst-Critic → L3 QueryExpansion → L4 MCTS(UCT-120) → L5 Bayesian-UCB" },
                { n: 3, x: 21,  y: 26, color: "#06B6D4", label: "Filter targets — search the target list by name to find a specific entity quickly" },
                { n: 4, x: 42,  y: 33, color: "#10B981", label: "Signal score badge — shown next to each target (94 = high Bayesian confidence)" },
                { n: 5, x: 21,  y: 96, color: "#EF4444", label: "RUN ANALYSIS — starts the Hybrid Research pipeline; results stream into the terminal on the right" },
                { n: 6, x: 75,  y: 12, color: "#F59E0B", label: "Terminal window — live analysis output streams here; shows path nodes, scores, and the final recommended approach route" },
              ]}
            />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">How L4 path-finding works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#050A14] border border-[#3B82F6]/25 rounded-lg p-4">
                <p className="text-xs font-bold text-[#3B82F6] mb-2 uppercase tracking-wider">Exploitation</p>
                <p className="text-xs text-[#94A3B8] leading-relaxed">Keeps exploring paths that have already scored well in earlier runs. Doubles down on what's working.</p>
              </div>
              <div className="bg-[#050A14] border border-[#F59E0B]/25 rounded-lg p-4">
                <p className="text-xs font-bold text-[#F59E0B] mb-2 uppercase tracking-wider">Exploration</p>
                <p className="text-xs text-[#94A3B8] leading-relaxed">Occasionally tries paths that haven't been explored much yet — a hidden shortcut might score higher than anything found so far.</p>
              </div>
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">Reading the terminal output</h3>
            <div className="bg-[#050A14] border border-[#1E293B] rounded-lg p-5 mb-5 text-xs font-mono space-y-1 text-[#94A3B8]">
              <div><span className="text-[#EF4444]">[L1]</span> BM25 retrieval: 47 candidates surfaced</div>
              <div><span className="text-[#A855F7]">[L2]</span> Planner decomposed query → 3 sub-goals</div>
              <div><span className="text-[#06B6D4]">[L3]</span> QueryExpansion added 8 synonym variants</div>
              <div><span className="text-[#F59E0B]">[L4]</span> UCT rollout 001/120 → path via Gatekeeper A (score: 0.61)</div>
              <div><span className="text-[#F59E0B]">[L4]</span> UCT rollout 045/120 → path via Gatekeeper B (score: 0.78) ←best so far</div>
              <div><span className="text-[#F59E0B]">[L4]</span> UCT rollout 120/120 → converged</div>
              <div><span className="text-[#10B981]">[L5]</span> Bayesian-UCB final score: 0.83 — WARM PATH FOUND</div>
              <div><span className="text-[#10B981]">[done]</span> Recommended: HNWI → Corp A → Gatekeeper B → You (3 hops)</div>
            </div>

            <Callout icon={<AlertCircle size={14} />} color="#EF4444" title="When to override the algorithm">
              The research path is a probabilistic recommendation, not an order. If you personally know a lower-ranked
              gatekeeper, that human relationship outweighs any warmth score. Use the algorithm to discover paths
              you didn't know existed — use your judgment to pick the one you'll act on.
            </Callout>

            <Callout icon={<Cpu size={14} />} color="#A855F7" title="Session limit — run max 5 in parallel">
              The Hybrid Research pipeline is memory-intensive. Running more than 5 parallel sessions simultaneously can
              exhaust the 3GB server heap. Run targets sequentially or in batches of 5 maximum.
            </Callout>
          </Section>

          {/* ══ LEVEL VI — PIPELINE CRM ═════════════════════════════════════════ */}
          <Section id="section-6" level="VI" levelColor="#8B5CF6" levelLabel="LEVEL VI — PIPELINE CRM" title="Outreach Tracking">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              Every target you decide to pursue gets a Research Session in Pipeline CRM. Sessions move
              through 8 stages from first identification to a closed conversation. The CRM is the paper
              trail — it stores the research path, the pitch, your notes, and the follow-up date in one place.
            </p>

            <AnnotatedScreenshot
              src={ss("crm.jpg")}
              alt="Pipeline CRM"
              caption="Pipeline CRM — annotated"
              pins={[
                { n: 1, x: 22,  y: 18, color: "#8B5CF6", label: "LEAD GEN — Stage 1: newly identified targets awaiting initial research" },
                { n: 2, x: 52,  y: 18, color: "#3B82F6", label: "IDENTIFIED — Stage 2: target confirmed viable, profile reviewed" },
                { n: 3, x: 83,  y: 18, color: "#F59E0B", label: "GRAPH MAPPED — Stage 3: Network Graph reviewed, gatekeepers identified" },
                { n: 4, x: 44,  y: 18, color: "#64748B", label: "Stage counter badge — number of sessions currently in this stage" },
                { n: 5, x: 33,  y: 30, color: "#10B981", label: "→ Run Intel Analysis — creates a new session and jumps to the Intel Terminal" },
              ]}
            />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">The 8 pipeline stages</h3>
            <div className="relative pl-5 space-y-0 mb-6">
              <div className="absolute left-2 top-3 bottom-3 w-px bg-[#1E293B]" />
              {[
                { stage: "Lead Gen",        color: "#8B5CF6", action: "Run ingestion → target appears here automatically" },
                { stage: "Identified",      color: "#3B82F6", action: "Confirm target viability, review Entity Profile" },
                { stage: "Graph Mapped",    color: "#06B6D4", action: "Open Network Graph, identify all gatekeeper nodes" },
                { stage: "Research Path Found", color: "#F59E0B", action: "Run Intel Terminal analysis, copy the path brief" },
                { stage: "Pitch Generated", color: "#F97316", action: "Generate 3-part outreach sequence in the session panel" },
                { stage: "Contacted",       color: "#EF4444", action: "First message sent — set follow-up date" },
                { stage: "Follow-Up",       color: "#EC4899", action: "Awaiting response — track touchpoints in notes" },
                { stage: "Closed",          color: "#10B981", action: "Meeting secured or deal closed — mark as won/lost" },
              ].map((s, i) => (
                <div key={s.stage} className="flex items-center gap-3 relative z-10 py-2">
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center bg-[#0B0F19] shrink-0" style={{ borderColor: s.color }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  </div>
                  <div>
                    <span className="text-xs font-bold" style={{ color: s.color }}>{s.stage}</span>
                    <span className="text-xs text-[#475569] ml-2">— {s.action}</span>
                  </div>
                </div>
              ))}
            </div>

            <Callout icon={<Gem size={14} />} color="#8B5CF6" title="Stage discipline — the golden rule">
              Never move a target past <strong className="text-[#06B6D4]">Graph Mapped</strong> without actually
              opening the Network Graph. Never move past <strong className="text-[#F59E0B]">Research Path Found</strong> without
              a completed path analysis. The pipeline is a quality gate, not just a label. Shortcuts here mean
              cold outreach that damages your reputation with the gatekeeper.
            </Callout>
          </Section>

          {/* ══ LEVEL VII — PERSONA LOOP ════════════════════════════════════════ */}
          <Section id="section-7" level="VII" levelColor="#EC4899" levelLabel="LEVEL VII — PERSONA LOOP" title="AI Improvement Engine">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              The Persona Loop runs 6 specialist AI agents in sequence over every entity in your database
              and logs concrete, actionable enrichment opportunities. Think of it as a 24/7 analyst that
              reviews your entire roster and tells you what to do next.
            </p>

            <AnnotatedScreenshot
              src={ss("improvements.jpg")}
              alt="Persona Loop"
              caption="Persona Loop — annotated"
              pins={[
                { n: 1, x: 27,  y: 10, color: "#EC4899", label: "PERSONA LOOP header — '6 specialist AI agents analyse every entity'" },
                { n: 2, x: 93,  y: 10, color: "#10B981", label: "Run Loop button — starts the improvement cycle across all entities in the DB" },
                { n: 3, x: 60,  y: 36, color: "#64748B", label: "Empty state — shows 'No improvement logs yet' until the first loop is run" },
                { n: 4, x: 60,  y: 44, color: "#EC4899", label: "Run First Loop — primary CTA when no logs exist" },
              ]}
            />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">The 6 personas</h3>
            <FeatureGrid items={[
              { icon: <Users size={13} />,     color: "#10B981", label: "HNWI Analyst",       desc: "Scans high-signal individuals for missing asset data, stale registry hits, and unverified contact fields." },
              { icon: <Shield size={13} />,    color: "#3B82F6", label: "Gatekeeper Scout",   desc: "Identifies new potential gatekeepers in the relationship graph and scores their accessibility." },
              { icon: <Building2 size={13} />, color: "#A855F7", label: "Corp Intelligence",  desc: "Audits corporate entities for directors that haven't been ingested yet, and flags name-series clusters." },
              { icon: <Briefcase size={13} />, color: "#F59E0B", label: "Trust Analyst",      desc: "Reviews offshore vehicle chains for beneficial ownership gaps and cross-entity address matches." },
              { icon: <Anchor size={13} />,    color: "#06B6D4", label: "Asset Tracker",      desc: "Checks aviation, maritime, and real estate asset records for valuation gaps and geo-coordinates." },
              { icon: <Target size={13} />,    color: "#EF4444", label: "Outreach Critic",    desc: "Reviews entities in the CRM pipeline and flags stale follow-ups, missing pitches, or low-confidence paths." },
            ]} />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">Reading the improvement log</h3>
            <div className="bg-[#050A14] border border-[#EC4899]/25 rounded-lg p-5 mb-5 text-xs font-mono space-y-2">
              {[
                { persona: "HNWI Analyst",     color: "#10B981", action: "Entity #4412 (THIEL PETER): SEC 13D filing dated 2023 not reflected in assetBook → trigger EDGAR backfill" },
                { persona: "Asset Tracker",    color: "#06B6D4", action: "Entity #8821 (KOENIG THEODORE): FAA aircraft N3841X has no geo-coordinates → run sync-faa-coordinates" },
                { persona: "Corp Intelligence",color: "#A855F7", action: "Corp cluster 'Tannjete I / II / III LLC' detected → run name-clusters to build 3 CORPORATE_SERIES edges" },
                { persona: "Outreach Critic",  color: "#EF4444", action: "CRM session #12 (GUND GORDON) at 'Contacted' stage — last touchpoint 14 days ago. Set follow-up reminder." },
              ].map((row) => (
                <div key={row.persona} className="flex gap-2">
                  <span className="shrink-0 font-bold" style={{ color: row.color }}>[{row.persona}]</span>
                  <span className="text-[#64748B] leading-relaxed">{row.action}</span>
                </div>
              ))}
            </div>

            <Callout icon={<Bot size={14} />} color="#EC4899" title="Run the loop regularly">
              The Persona Loop is deterministic — it doesn't call external APIs or make up data. It reads your
              existing database and applies rule-based logic to surface gaps. Run it after every major ingestion
              or enrichment pass. Each log entry is an actionable task, not a suggestion.
            </Callout>
          </Section>

          {/* ══ LEVEL VIII — DATA SOURCES ═══════════════════════════════════════ */}
          <Section id="section-8" level="VIII" levelColor="#14B8A6" levelLabel="LEVEL VIII — DATA SOURCES" title="Registry Pipelines & Enrichment">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              Data Sources is the control panel for every pipeline that feeds ApexFinder. Ingestors pull
              bulk datasets from public registries. Enrichers run against entities already in your database
              to add contact data, relationship edges, and asset detail — all using free public sources,
              no paid APIs required.
            </p>

            <AnnotatedScreenshot
              src={ss("data-sources.jpg")}
              alt="Data Sources"
              caption="Data Sources — annotated"
              pins={[
                { n: 1, x: 30,  y: 11, color: "#14B8A6", label: "Page header — '9 live sources · 1 coming soon' shows how many pipelines are active" },
                { n: 2, x: 93,  y: 11, color: "#10B981", label: "Registries online indicator — green pulse = all registry endpoints reachable" },
                { n: 3, x: 35,  y: 25, color: "#3B82F6", label: "32,300 entities — total records currently in the database" },
                { n: 4, x: 60,  y: 25, color: "#EF4444", label: "0 contactable — entities with verified email or phone (run IN-HOUSE ENRICH or WEB OSINT ENRICH to increase)" },
                { n: 5, x: 85,  y: 25, color: "#F59E0B", label: "0% coverage — percentage of entities with any contact data; your enrichment target" },
                { n: 6, x: 94,  y: 41, color: "#A855F7", label: "Quick-action buttons — AUTO-DETECT, NAME CLUSTERS, CH OFFICERS, etc. Each fires a background job" },
                { n: 7, x: 45,  y: 96, color: "#10B981", label: "Phase 9 — In-House OSINT Enricher: Wikidata + Gravatar + GitHub + pattern generation (no paid API required)" },
              ]}
            />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">Ingestors vs enrichers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/05">
                <p className="text-xs font-bold text-[#3B82F6] mb-2 uppercase tracking-wider flex items-center gap-1.5"><Download size={11} /> Ingestor</p>
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">Downloads a bulk dataset and creates new Entity + Asset records. Deduplication via Upstash Redis — safe to run multiple times.</p>
                <div className="space-y-1 text-xs text-[#64748B]">
                  {["SEC EDGAR (SC 13D/G beneficial owners)", "FAA Aircraft Registry (~70MB)", "UK Companies House (PSC)", "BRREG Norway (board directors)", "UK Land Registry OCOD"].map((s) => (
                    <div key={s} className="flex items-center gap-1.5"><CheckCircle size={9} className="text-[#3B82F6] shrink-0" />{s}</div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-lg border border-[#10B981]/30 bg-[#10B981]/05">
                <p className="text-xs font-bold text-[#10B981] mb-2 uppercase tracking-wider flex items-center gap-1.5"><Zap size={11} /> Enricher</p>
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">Queries external APIs against entities already in your DB to add contact data, edges, or verification. Does not create new entities.</p>
                <div className="space-y-1 text-xs text-[#64748B]">
                  {["OCCRP Aleph (sanctions, beneficial ownership)", "OpenSky Network (live flight tracking)", "Companies House Contact Enricher", "In-House OSINT (Wikidata · Gravatar · GitHub · pattern gen)", "Web OSINT (DuckDuckGo + EDGAR + OpenCorporates)"].map((s) => (
                    <div key={s} className="flex items-center gap-1.5"><CheckCircle size={9} className="text-[#10B981] shrink-0" />{s}</div>
                  ))}
                </div>
              </div>
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">Quick-action buttons explained</h3>
            <div className="space-y-2 mb-5">
              {[
                { label: "AUTO-DETECT",      color: "#A855F7", desc: "Scans all entities for shared registered addresses and creates SHARED_ADDRESS relationship edges." },
                { label: "NAME CLUSTERS",    color: "#3B82F6", desc: "Detects corporate name series (e.g. 'Tannjete I / II / III LLC') and creates CORPORATE_SERIES edges between them." },
                { label: "SYNC HOT FLAGS",   color: "#10B981", desc: "Recomputes the isHot flag for all entities: Bayesian score ≥ 0.70 → flagged as hot lead." },
                { label: "CH OFFICERS",      color: "#F59E0B", desc: "Fetches Companies House officer records for all UK corporations and stores them in entity metadata (required before CH CO-DIRECTORS)." },
                { label: "CH CO-DIRECTORS",  color: "#F97316", desc: "Builds SHARED_DIRECTOR edges between UK entities that share a common CH director. Only activates for CH entities — returns 0 for US FAA/EDGAR data." },
                { label: "POPULATE NOTES",   color: "#06B6D4", desc: "Enriches entity notes from filing metadata: filing type, company, role, CH directors, and location — improves Intel Terminal briefings." },
                { label: "EDGAR STOCK ASSETS",color: "#EF4444",desc: "Creates StockHolding asset records for SEC EDGAR large-shareholder entities that don't yet have assets." },
                { label: "BACKFILL NET WORTH",color: "#EC4899", desc: "Sets estimatedNetWorth = 3× registered asset value for all entities where net worth is unset." },
                { label: "WEB OSINT ENRICH",   color: "#8B5CF6", desc: "Runs DuckDuckGo + EDGAR + OpenCorporates search across all entity layers. Adds LinkedIn URL, email, and phone where found. Run this first." },
                { label: "IN-HOUSE ENRICH",    color: "#10B981", desc: "Seven-source in-house OSINT pipeline: Wikidata SPARQL, Wikipedia, GitHub API, email pattern generation verified by Gravatar MD5 hash, company domain resolver with DNS MX validation, RDAP registrant lookup, and ProPublica 990 nonprofit filings. No paid API required. Run after WEB OSINT ENRICH for maximum coverage." },
              ].map((a) => (
                <div key={a.label} className="flex gap-3 items-start p-3 rounded-lg border border-[#1E293B] bg-[#0B0F19]">
                  <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ color: a.color, backgroundColor: a.color + "20", border: `1px solid ${a.color}40` }}>{a.label}</span>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">In-House OSINT Engine — source breakdown</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              The engine runs 7 free sources in priority order, stopping early on a high-confidence hit.
              Each source writes its provenance into the entity's metadata alongside the email confidence score.
            </p>
            <div className="space-y-2 mb-5">
              {([
                { n: "1", label: "Wikidata SPARQL", color: "#F59E0B", conf: 85, scope: "All", desc: "Queries the Wikidata knowledge graph by person name. Returns email (P968), website (P856), and LinkedIn URL (P6634) when structured data exists. Best coverage for public figures — politicians, executives, Forbes-listed individuals." },
                { n: "2", label: "Wikipedia API", color: "#94A3B8", conf: 40, scope: "All", desc: "Fetches the article summary for the entity name and scans the plain-text extract for email addresses and LinkedIn URLs. Useful for CEOs and fund managers who have Wikipedia articles." },
                { n: "3", label: "GitHub API", color: "#6366F1", conf: 75, scope: "HNWI · Gatekeeper", desc: "Searches GitHub users by full name (60 req/hr, no auth key required). Founders, CTOs, and tech-sector HNWIs frequently expose their work email and personal site in their public profile." },
                { n: "4", label: "ProPublica 990", color: "#EC4899", conf: 50, scope: "Corporation · Trust", desc: "Searches ProPublica's Nonprofit Explorer for the company name, retrieves the website from IRS 990 filings, and scrapes the contact page for a staff email. Covers US nonprofits, foundations, and charitable trusts." },
                { n: "5", label: "Email Pattern + Gravatar MD5", color: "#10B981", conf: 90, scope: "HNWI · Gatekeeper", desc: "Generates the 9 most common corporate email patterns (first.last, flast, f.last, firstl…) for the entity's domain, then verifies each by checking the Gravatar avatar endpoint: gravatar.com/avatar/{md5(email)}?d=404. A 200 response means the email is registered and real. This is the highest-confidence signal short of direct confirmation." },
                { n: "6", label: "Domain Resolver + DNS MX", color: "#3B82F6", conf: 55, scope: "All", desc: "Strips legal suffixes (Inc / LLC / Ltd / Holdings…), lowercases the remainder, and tries .com, .co, .io, .org variants. Validates each candidate with a real DNS MX record lookup — if no mail server exists, the domain is discarded. Provides the domain for step 5 when it isn't already in the entity metadata." },
                { n: "7", label: "RDAP Domain Contact", color: "#F97316", conf: 50, scope: "Corporation · Trust", desc: "Queries the ICANN RDAP bootstrap to find the correct registrar endpoint, then fetches the domain registration record and extracts the registrant email from the vCard. Excludes abuse@ and privacy@ addresses. Often the only contact vector for holding companies and shell corps." },
              ] as Array<{n:string;label:string;color:string;conf:number;scope:string;desc:string}>).map((s) => (
                <div key={s.n} className="flex gap-3 items-start p-3 rounded-lg border border-[#1E293B] bg-[#0B0F19]">
                  <span className="text-[10px] font-black font-mono w-4 shrink-0 mt-0.5" style={{ color: s.color }}>{s.n}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-black font-mono" style={{ color: s.color }}>{s.label}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: s.color, backgroundColor: s.color + "20", border: `1px solid ${s.color}40` }}>conf≥{s.conf}</span>
                      <span className="text-[9px] font-mono text-[#475569] px-1.5 py-0.5 rounded border border-[#1E293B]">{s.scope}</span>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Callout icon={<Mail size={14} />} color="#10B981" title="Recommended enrichment order">
              Run <Code>WEB OSINT ENRICH</Code> first — it casts the widest net via DuckDuckGo and EDGAR full-text
              search. Then run <Code>IN-HOUSE ENRICH</Code> — it picks up what Web OSINT missed using structured
              Wikidata and Gravatar-verified email patterns. Finally, click <Code>RECOMPUTE</Code> to update all
              contact confidence scores. Most HNWI and Gatekeeper entities will move from 0 to 40–90 across
              two passes.
            </Callout>
          </Section>

          {/* ══ LEVEL IX — ENTITY PROFILE ═══════════════════════════════════════ */}
          <Section id="section-9" level="IX" levelColor="#F97316" levelLabel="LEVEL IX — ENTITY PROFILE" title="The Deep-Dive Profile View">

            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              Every entity in the ledger has a Profile Card — a single screen with every known data point,
              all assets geolocated on a map, a profile depth breakdown by category, and a live source
              ledger showing exactly where each piece of data came from.
            </p>

            <AnnotatedScreenshot
              src={ss("profile.jpg")}
              alt="Entity Profile"
              caption="Entity Profile Card — annotated"
              pins={[
                { n: 1,  x: 22,  y: 9.5, color: "#64748B", label: "← Back — returns to the Entity Ledger or the page you came from" },
                { n: 2,  x: 30,  y: 12,  color: "#F97316", label: "Entity name & source tag — name shown with source registry badge (e.g. 'FAA Releasable Aircraft Database')" },
                { n: 3,  x: 72,  y: 9.5, color: "#10B981", label: "Signal score badge (70) — overall Bayesian confidence for this entity" },
                { n: 4,  x: 80,  y: 10,  color: "#3B82F6", label: "GRAPH — jump directly to Network Graph centred on this entity" },
                { n: 5,  x: 85,  y: 10,  color: "#EF4444", label: "INTEL — open Intel Terminal with this entity pre-selected as target" },
                { n: 6,  x: 89,  y: 10,  color: "#8B5CF6", label: "CRM — create or view this entity's Research Session in Pipeline CRM" },
                { n: 7,  x: 93,  y: 10,  color: "#06B6D4", label: "CONNECT — add contact details manually (email, phone, LinkedIn)" },
                { n: 8,  x: 36,  y: 22,  color: "#EC4899", label: "Direct Contact Vectors — shows email/phone/LinkedIn confidence level (10% = low; run enrichment to improve)" },
                { n: 9,  x: 96,  y: 22,  color: "#F97316", label: "ENRICH button — triggers targeted Companies House officer lookup for this specific entity" },
                { n: 10, x: 40,  y: 53,  color: "#14B8A6", label: "Asset Footprint map — all geolocated assets plotted on an interactive Leaflet map. Blue dots = aviation assets." },
                { n: 11, x: 80,  y: 36,  color: "#F97316", label: "Profile Depth panel — breakdown by category: Identity / Financial / Network / Registry / Assets. 100% Assets = fully mapped." },
                { n: 12, x: 60,  y: 83,  color: "#64748B", label: "Source Ledger — every verified data point with its source registry and verification status (Registry / Enriched / Manual)" },
              ]}
            />

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-6 mb-4">Profile depth categories</h3>
            <div className="bg-[#050A14] border border-[#F97316]/25 rounded-lg p-5 mb-5">
              {[
                { cat: "Identity",  color: "#3B82F6", desc: "Name, nationality, date of birth, known aliases, source registry confirmation." },
                { cat: "Financial", color: "#10B981", desc: "Estimated net worth, equity stakes, stock holdings, asset valuation. Sourced from SEC, EDGAR, FAA." },
                { cat: "Network",   color: "#A855F7", desc: "Relationship edges in the graph: co-directors, shared addresses, known associates, corporate series." },
                { cat: "Registry",  color: "#F59E0B", desc: "Raw registry data: CH filings, EDGAR forms, FAA registration records, BRREG director entries." },
                { cat: "Assets",    color: "#EF4444", desc: "Linked Asset records: aircraft (FAA), property (HMLR OCOD), vessels, equity. Each with geo-coordinates where available." },
              ].map((c) => (
                <div key={c.cat} className="flex gap-3 items-start py-2.5 border-b border-[#1E293B] last:border-0">
                  <span className="font-bold text-xs w-20 shrink-0 mt-0.5" style={{ color: c.color }}>{c.cat}</span>
                  <p className="text-xs text-[#64748B] leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            <Callout icon={<FileText size={14} />} color="#F97316" title="Source Ledger — your audit trail">
              Every row in the Source Ledger shows the raw data point, its category, its value, the source
              registry it came from, and its status (<strong className="text-[#10B981]">Registry</strong> = government-verified,{" "}
              <strong className="text-[#3B82F6]">Enriched</strong> = added via an API enricher,{" "}
              <strong className="text-[#F59E0B]">Manual</strong> = entered by you). Use this as your due-diligence
              reference before any outreach.
            </Callout>
          </Section>

          {/* ══ LEVEL X — THE ENGINE ════════════════════════════════════════════ */}
          <Section id="section-10" level="X" levelColor="#6366F1" levelLabel="LEVEL X — THE ENGINE" title="Bayesian Scoring & Pipeline Deep Dive">

            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert size={14} className="text-[#6366F1]" />
              <span className="text-xs text-[#6366F1] font-bold uppercase tracking-widest">Technical depth — not required for daily use</span>
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">The Bayesian Signal Score</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              The score isn't a count of data points. It's a Bayesian posterior probability — it starts with a prior
              (we assume little about the target) and updates upward each time new evidence arrives. Each signal type
              carries a different weight:
            </p>
            <div className="bg-[#050A14] border border-[#6366F1]/25 rounded-lg p-5 mb-5">
              <div className="space-y-2.5">
                {[
                  { signal: "Confirmed phone / email",            weight: "Very high", color: "#10B981" },
                  { signal: "SEC 13D/G beneficial owner filing",  weight: "High",      color: "#10B981" },
                  { signal: "OpenCorporates director hit",        weight: "Med-high",  color: "#3B82F6" },
                  { signal: "FAA / BRREG registry match",         weight: "Medium",    color: "#3B82F6" },
                  { signal: "UK property registry ownership",     weight: "Medium",    color: "#3B82F6" },
                  { signal: "News / social mention",              weight: "Low",       color: "#F59E0B" },
                  { signal: "Name-only match (no corroboration)", weight: "Very low",  color: "#EF4444" },
                ].map((row) => (
                  <div key={row.signal} className="flex justify-between items-center text-xs">
                    <span className="text-[#94A3B8]">{row.signal}</span>
                    <span className="font-bold font-mono" style={{ color: row.color }}>{row.weight}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[#6366F1]/15 text-xs font-mono text-[#64748B]">
                <p>Score = posterior probability × 100, updated continuously as new registry hits arrive.</p>
                <p className="mt-1">A score of <span className="text-[#10B981]">94</span> means the engine has very high confidence a warm path exists and data is complete.</p>
              </div>
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">Score thresholds — what they mean operationally</h3>
            <div className="space-y-2 mb-6">
              <ScoreBar name="90–100 — Iron-clad data, warm path confirmed, act immediately" score={95} />
              <ScoreBar name="80–89 — Strong signal, gatekeeper identified, ready for Hybrid Research" score={85} />
              <ScoreBar name="70–79 — Good data, some gaps — run enrichment then Hybrid Research" score={75} />
              <ScoreBar name="60–69 — Moderate data — needs CH Contact Enricher first" score={65} />
              <ScoreBar name="Below 60 — Sparse data — run Web OSINT Enrich → In-House Enrich to populate" score={45} />
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">L4 — UCT path-finding formula explained</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              Each node in the L4 UCT tree represents an entity on a potential approach path. The UCT algorithm
              selects which node to explore next using this formula:
            </p>
            <div className="bg-[#050A14] border border-[#1E293B] rounded-lg p-5 mb-5">
              <p className="text-sm font-mono text-[#E2E8F0] text-center py-3 overflow-x-auto whitespace-nowrap">
                UCT(v) = Q(v)/N(v) + √2 · √(ln N(parent) / N(v))
              </p>
              <div className="mt-4 space-y-2 text-[11px]">
                {[
                  ["Q(v)/N(v)",         "Average warmth score of paths through this node — the exploitation term"],
                  ["√2",                "Exploration constant — controls how aggressively to try under-visited nodes"],
                  ["ln N(parent)/N(v)", "Log ratio of parent visits to child visits — boosts nodes that haven't been explored much yet"],
                ].map(([term, def]) => (
                  <div key={term} className="flex gap-3">
                    <span className="font-mono text-[#6366F1] shrink-0 w-32">{term}</span>
                    <span className="text-[#64748B]">{def}</span>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">Contact Confidence score</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              Separate from the Bayesian signal score, the <strong className="text-[#E2E8F0]">Contact Confidence</strong> (0–100)
              measures specifically how reachable an entity is via direct contact. It's computed deterministically
              from confirmed contact signals:
            </p>
            <div className="bg-[#050A14] border border-[#EC4899]/20 rounded-lg p-5 mb-5 text-xs font-mono text-[#64748B] space-y-1">
              <div><span className="text-[#10B981]">+40pts</span>  Verified work email (In-House Enricher: Gravatar-confirmed ≥ 90% confidence)</div>
              <div><span className="text-[#10B981]">+30pts</span>  Confirmed phone number (via OSINT sources)</div>
              <div><span className="text-[#3B82F6]">+20pts</span>  LinkedIn URL confirmed (Wikidata / GitHub / Web OSINT)</div>
              <div><span className="text-[#3B82F6]">+10pts</span>  CH officer correspondence address or known residence on file</div>
              <div className="mt-3 pt-3 border-t border-[#1E293B] text-[#94A3B8]">
                <p>Score is always recomputed from whatever signals exist in the DB — no paid API required.</p>
                <p className="mt-1">Run <strong className="text-[#E2E8F0]">IN-HOUSE ENRICH</strong> in Data Sources to push contact confidence from 0 to 40–90 per entity.</p>
              </div>
            </div>

            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">Data deduplication</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              Every ingested record is fingerprinted by normalised name + jurisdiction and stored in a permanent
              Upstash Redis set. Running any ingestor twice inserts new records from deeper registry pages, not
              duplicates. The dedup counter in the job log shows how many were skipped.
            </p>
            <div className="bg-[#050A14] border border-[#1E293B] rounded-lg p-5 mb-5 text-xs font-mono text-[#94A3B8] space-y-1">
              <div><span className="text-[#A855F7]">[running]</span> Batch 1/50 — inserting 100 records…</div>
              <div><span className="text-[#A855F7]">[running]</span> Batch 2/50 — 3 skipped (dedup), 97 inserted</div>
              <div><span className="text-[#A855F7]">[running]</span> Batch 12/50 — progress 24%</div>
              <div><span className="text-[#10B981]">[done]</span>    4,871 records inserted · 129 deduped · 8.4s</div>
            </div>

            <Callout icon={<GitBranch size={14} />} color="#6366F1" title="Re-ingesting from scratch">
              To start a completely fresh dataset: call <Code>DELETE /api/ingest/dedup</Code> to wipe the Upstash
              dedup set, then run ingestors again. All records will be treated as new. Existing database records
              are not deleted automatically — clear the entities table manually if needed.
            </Callout>

            <Callout icon={<Shield size={14} />} color="#10B981" title="Compliance reminder">
              All data in ApexFinder Pro comes exclusively from public government registries and OSINT. You are
              responsible for complying with GDPR, CCPA, and all applicable privacy legislation in your
              jurisdiction. Always respect opt-outs and do not use contact data for unsolicited commercial
              communications where prohibited.
            </Callout>
          </Section>

        </div>
      </div>
    </div>
  );
}
