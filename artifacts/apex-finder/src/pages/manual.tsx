import { useState, useEffect, useRef } from "react";
import {
  Crosshair, Database, Globe, Network, Terminal, KanbanSquare,
  ChevronDown, ChevronRight, ShieldAlert, TrendingUp, Users,
  Briefcase, Building2, Anchor, Gem, Zap, Play, Filter,
  Download, UserCheck, Shield, Map, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Screenshot helper ─────────────────────────────────────────────────── */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function ss(name: string) {
  return `${BASE}/screenshots/${name}`;
}

/* ─── Collapsible screenshot block ─────────────────────────────────────── */

function ScreenshotBlock({ src, caption }: { src: string; caption: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 border border-[#1E293B] rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0B0F19] hover:bg-[#111827] transition-colors text-left"
      >
        <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
          <span className="text-[#10B981]">▣</span> {caption}
        </span>
        {open ? (
          <ChevronDown size={14} className="text-[#64748B]" />
        ) : (
          <ChevronRight size={14} className="text-[#64748B]" />
        )}
      </button>
      {open && (
        <div className="border-t border-[#1E293B] p-3 bg-[#050A14]">
          <img
            src={src}
            alt={caption}
            className="w-full rounded border border-[#1E293B] shadow-lg"
          />
        </div>
      )}
    </div>
  );
}

/* ─── Callout ────────────────────────────────────────────────────────────── */

function Callout({
  icon,
  color,
  title,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex gap-3 p-4 rounded-md border my-4"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}09` }}
    >
      <div className="mt-0.5 shrink-0" style={{ color }}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color }}>
          {title}
        </p>
        <p className="text-sm text-[#94A3B8] leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

/* ─── Step flow ─────────────────────────────────────────────────────────── */

const WORKFLOW = [
  { n: "01", icon: <Database size={14} />, label: "Entity Ledger", hint: "Your roster of targets" },
  { n: "02", icon: <Globe size={14} />, label: "Live Intel", hint: "Public registries & filings" },
  { n: "03", icon: <Network size={14} />, label: "Network Graph", hint: "Map connections & assets" },
  { n: "04", icon: <Terminal size={14} />, label: "MCTS Terminal", hint: "Find the warmest path" },
  { n: "05", icon: <KanbanSquare size={14} />, label: "Pipeline CRM", hint: "Track & execute outreach" },
];

function WorkflowStep({ n, icon, label, hint }: typeof WORKFLOW[0]) {
  return (
    <div className="flex flex-col items-center text-center min-w-[100px]">
      <div className="w-10 h-10 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] mb-2 relative">
        {icon}
        <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#10B981] text-black text-[9px] font-bold rounded-full flex items-center justify-center">
          {n}
        </span>
      </div>
      <span className="text-xs font-bold text-[#E2E8F0] leading-tight">{label}</span>
      <span className="text-[10px] text-[#64748B] mt-0.5 leading-tight">{hint}</span>
    </div>
  );
}

/* ─── Score bar ─────────────────────────────────────────────────────────── */

function ScoreBar({ name, score }: { name: string; score: number }) {
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#CBD5E1]">{name}</span>
        <span style={{ color }} className="font-bold font-mono">{score}</span>
      </div>
      <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ─── Pipeline stage ─────────────────────────────────────────────────────── */

const STAGES = [
  "Lead Gen", "Identified", "Graph Mapped", "MCTS Path Found",
  "Pitch Generated", "Contacted", "Follow-Up", "Closed",
];

function PipelineStages() {
  return (
    <div className="relative pl-5 space-y-2">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-[#1E293B]" />
      {STAGES.map((s, i) => {
        const active = i === 1;
        return (
          <div key={s} className="flex items-center gap-3 relative z-10">
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center bg-[#0B0F19] shrink-0",
                active ? "border-[#3B82F6]" : "border-[#1E293B]"
              )}
            >
              {active && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
            </div>
            <span
              className={cn("text-xs font-mono font-bold", active ? "text-[#3B82F6]" : "text-[#475569]")}
            >
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Node legend ────────────────────────────────────────────────────────── */

const NODE_TYPES = [
  { color: "#10B981", icon: <Crosshair size={13} />, label: "HNWI Target", desc: "Your subject — the ultra-high-net-worth individual you want to reach." },
  { color: "#F59E0B", icon: <Users size={13} />, label: "Gatekeeper", desc: "Their inner circle: private bankers, family office managers, art dealers, yacht brokers, estate lawyers. These are your actual entry points." },
  { color: "#3B82F6", icon: <Building2 size={13} />, label: "Corporation", desc: "Companies they direct, own, or are registered shareholders of." },
  { color: "#A855F7", icon: <Briefcase size={13} />, label: "Trust / SPV", desc: "Offshore vehicles, family trusts, and special-purpose holding structures." },
  { color: "#64748B", icon: <Anchor size={13} />, label: "Asset", desc: "Registered wealth: superyachts (Lloyd's IMO), aircraft (FAA/CAA), real estate, art." },
];

const EDGE_TYPES = [
  { label: "OWNS", desc: "Direct legal ownership or beneficial interest" },
  { label: "MANAGES", desc: "Appointed director, trustee, or fund manager" },
  { label: "MEMBER OF", desc: "Shareholder, club member, board seat" },
  { label: "KNOWN ASSOCIATE", desc: "Co-signatory, co-investor, known social tie" },
];

/* ─── Section wrapper ────────────────────────────────────────────────────── */

function Section({
  id,
  level,
  levelColor,
  levelLabel,
  title,
  children,
}: {
  id: string;
  level: string;
  levelColor: string;
  levelLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative bg-[#0F172A] border border-[#1E293B] rounded-lg p-8 overflow-hidden scroll-mt-8">
      <div
        className="absolute top-0 right-0 text-7xl font-bold select-none leading-none pr-6 pt-4"
        style={{ color: `${levelColor}08` }}
      >
        {level}
      </div>
      <div className="mb-7">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border mb-3"
          style={{ color: levelColor, backgroundColor: `${levelColor}15`, borderColor: `${levelColor}30` }}
        >
          {levelLabel}
        </span>
        <h2 className="text-2xl font-bold text-[#E2E8F0] font-mono">{title}</h2>
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

/* ─── Sidebar level item ─────────────────────────────────────────────────── */

const LEVELS = [
  { id: 1, color: "#10B981", numeral: "I",   title: "BASICS",      subtitle: "Start here" },
  { id: 2, color: "#3B82F6", numeral: "II",  title: "DATA",        subtitle: "Scores & search" },
  { id: 3, color: "#F59E0B", numeral: "III", title: "NETWORK",     subtitle: "Graph intelligence" },
  { id: 4, color: "#EF4444", numeral: "IV",  title: "ENGINE",      subtitle: "How it thinks" },
  { id: 5, color: "#A855F7", numeral: "V",   title: "MASS INGEST", subtitle: "Western HNWI engine" },
];

function SidebarItem({
  level,
  active,
  onClick,
}: {
  level: typeof LEVELS[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all border-l-4"
      style={{
        borderLeftColor: active ? level.color : "transparent",
        backgroundColor: active ? `${level.color}10` : "transparent",
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold shrink-0 transition-all"
        style={{
          borderColor: active ? level.color : "#1E293B",
          color: active ? level.color : "#475569",
          backgroundColor: active ? `${level.color}20` : "transparent",
        }}
      >
        {level.numeral}
      </div>
      <div>
        <div className="text-xs font-bold font-mono" style={{ color: active ? level.color : "#94A3B8" }}>
          {level.title}
        </div>
        <div className="text-[10px] text-[#475569] uppercase tracking-wider mt-0.5">{level.subtitle}</div>
      </div>
    </button>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function FieldManual() {
  const [activeLevel, setActiveLevel] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver — works regardless of which ancestor scrolls
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
      { threshold: 0.25 }
    );
    [1, 2, 3, 4, 5].forEach((n) => {
      const el = document.getElementById(`section-${n}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (n: number) => {
    // scrollIntoView bubbles to the nearest scrollable ancestor automatically
    document.getElementById(`section-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveLevel(n);
  };

  return (
    <div className="flex flex-col md:flex-row md:h-full bg-[#0B0F19] font-mono text-[#E2E8F0] md:overflow-hidden">

      {/* ── Left Sidebar — desktop only ──────────────────────────────────── */}
      <div className="hidden md:flex w-52 shrink-0 bg-[#0F172A] border-r border-[#1E293B] flex-col">
        <div className="p-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-2 text-[#10B981] mb-1">
            <Crosshair size={16} className="animate-pulse" />
            <span className="text-xs font-bold tracking-widest">FIELD MANUAL</span>
          </div>
          <div className="text-[10px] text-[#475569] tracking-wider uppercase">
            Read top to bottom
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col">
          {LEVELS.map((level) => (
            <SidebarItem
              key={level.id}
              level={level}
              active={activeLevel === level.id}
              onClick={() => scrollToSection(level.id)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-[#1E293B]">
          <div className="text-[10px] text-[#334155] text-center tracking-widest uppercase">
            v0.2 · Private Build
          </div>
        </div>
      </div>

      {/* ── Mobile level tab bar ─────────────────────────────────────────── */}
      <div className="md:hidden flex-shrink-0 flex border-b border-[#1E293B] bg-[#0F172A] overflow-x-auto">
        {LEVELS.map((level) => {
          const active = activeLevel === level.id;
          return (
            <button
              key={level.id}
              onClick={() => scrollToSection(level.id)}
              className="flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition-colors flex-shrink-0"
              style={{
                borderBottomColor: active ? level.color : "transparent",
                color: active ? level.color : "#475569",
              }}
            >
              <span
                className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold"
                style={{ borderColor: active ? level.color : "#1E293B" }}
              >
                {level.numeral}
              </span>
              <span className="text-[11px] font-bold tracking-wider">{level.title}</span>
            </button>
          );
        })}
      </div>

      {/* ── Scrollable Content ────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 md:overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-20">

          {/* ══════════════════════════════════════════════════════
              LEVEL I — BASICS
          ══════════════════════════════════════════════════════ */}
          <Section
            id="section-1"
            level="I"
            levelColor="#10B981"
            levelLabel="LEVEL I — BASICS"
            title="What ApexFinder Pro Does"
          >
            <p className="text-[#94A3B8] leading-relaxed mb-6 text-sm max-w-2xl">
              ApexFinder Pro is a private intelligence platform. You load a roster of ultra-high-net-worth
              individuals (HNWIs), enrich their profiles from public registries, map their connections, and
              then let the engine find the warmest path to reach them — without cold-calling blind.
            </p>

            <Callout icon={<TrendingUp size={14} />} color="#10B981" title="The core idea">
              HNWIs don't respond to strangers. They respond to warm introductions through people they
              already trust — their private banker, their art dealer, their family office manager. ApexFinder
              maps those relationships from public data so you know exactly who to reach out to first.
            </Callout>

            {/* Workflow */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              Your 5-step playbook
            </h3>
            <div className="flex items-start gap-2 overflow-x-auto pt-3 pb-4">
              {WORKFLOW.map((step, i) => (
                <div key={step.n} className="flex items-center gap-2 shrink-0">
                  <WorkflowStep {...step} />
                  {i < WORKFLOW.length - 1 && (
                    <ChevronRight size={14} className="text-[#10B981] shrink-0 mt-[-18px]" />
                  )}
                </div>
              ))}
            </div>

            {/* Step-by-step instructions */}
            <div className="mt-8 space-y-4">
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">
                Getting your first target into the system
              </h3>

              {[
                {
                  n: "1",
                  title: "Open Entity Ledger",
                  body: 'Click "Entity Ledger" in the sidebar. This is your target registry — every HNWI you\'re tracking lives here.',
                },
                {
                  n: "2",
                  title: "Add a target",
                  body: 'Hit "+ Add Entity" (top-right). Fill in their name, type (HNWI), nationality, and estimated net worth. Hit Save.',
                },
                {
                  n: "3",
                  title: "Run Live Intel search",
                  body: 'Back in Entity Ledger, use the "Live Intel" dropdown to search their name against public registries — OpenCorporates finds corporate directorships; SEC EDGAR finds US securities filings.',
                },
                {
                  n: "4",
                  title: "Check the Signal Score",
                  body: "The number next to each name (0–100) tells you how much data has been found and how many warm connection paths exist. Anything above 80 is actionable immediately.",
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {step.n}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#E2E8F0] mb-0.5">{step.title}</p>
                    <p className="text-sm text-[#64748B] leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <ScreenshotBlock src={ss("entities.jpg")} caption="Entity Ledger — your target registry" />
          </Section>

          {/* ══════════════════════════════════════════════════════
              LEVEL II — DATA
          ══════════════════════════════════════════════════════ */}
          <Section
            id="section-2"
            level="II"
            levelColor="#3B82F6"
            levelLabel="LEVEL II — DATA"
            title="Scores, Live Intel & the CRM Pipeline"
          >
            {/* Signal Score */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">
              The Signal Score (0 – 100)
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              Every entity gets a score. It's not arbitrary — it reflects how many registry hits we found,
              how many relationship hops separate you from the target, and how "warm" those hops are.
              Think of it as a confidence rating on whether you can actually reach this person.
            </p>

            <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5 mb-2 space-y-3">
              <ScoreBar name="Bradford Whitmore III" score={95} />
              <ScoreBar name="Rashid Al-Mansouri" score={94} />
              <ScoreBar name="Carlos Ibáñez Varela" score={91} />
              <ScoreBar name="Patrick Beaumont" score={83} />
              <ScoreBar name="Charlotte Pemberton-Smythe" score={79} />
              <ScoreBar name="Valentina Rosso" score={62} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-center text-xs">
              <div className="p-2 rounded border border-[#10B981]/30 bg-[#10B981]/05">
                <div className="text-[#10B981] font-bold text-sm">80+</div>
                <div className="text-[#64748B] mt-0.5">Warm path found — act now</div>
              </div>
              <div className="p-2 rounded border border-[#F59E0B]/30 bg-[#F59E0B]/05">
                <div className="text-[#F59E0B] font-bold text-sm">60–79</div>
                <div className="text-[#64748B] mt-0.5">Some connections — dig deeper</div>
              </div>
              <div className="p-2 rounded border border-[#EF4444]/30 bg-[#EF4444]/05">
                <div className="text-[#EF4444] font-bold text-sm">&lt;60</div>
                <div className="text-[#64748B] mt-0.5">Sparse data — needs enrichment</div>
              </div>
            </div>

            {/* Live Intel */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-8 mb-4">
              Live Intel — where the data comes from
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              The Live Intel search queries three free public sources in real time. No API keys needed — just
              type the name and select the registry.
            </p>
            <div className="space-y-3">
              {[
                {
                  registry: "OpenCorporates",
                  color: "#3B82F6",
                  what: "The world's largest open database of companies. Returns corporate directorships, registered addresses, and incorporation dates. Great for finding which companies your target controls.",
                },
                {
                  registry: "SEC EDGAR",
                  color: "#A855F7",
                  what: "US Securities & Exchange Commission filings. Catches Schedule 13D/G (large share purchases) and DEF 14A (proxy statements naming directors). Mandatory for any US-listed exposure.",
                },
                {
                  registry: "Forbes 400",
                  color: "#F59E0B",
                  what: "Manually tagged — entities identified from public Forbes 400 lists carry this badge. Signals confirmed billionaire status.",
                },
              ].map((r) => (
                <div
                  key={r.registry}
                  className="flex gap-3 p-4 rounded border"
                  style={{ borderColor: `${r.color}30`, backgroundColor: `${r.color}07` }}
                >
                  <div
                    className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 h-fit"
                    style={{ color: r.color, backgroundColor: `${r.color}20`, border: `1px solid ${r.color}40` }}
                  >
                    {r.registry}
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">{r.what}</p>
                </div>
              ))}
            </div>

            <ScreenshotBlock src={ss("entities.jpg")} caption="Entity Ledger — Live Intel search & Signal Scores" />

            {/* Entity Ledger enhancements */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-8 mb-4">
              Entity Ledger — filters, proximity & export
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              The Entity Ledger gained three powerful tools that turn a raw list of names into a
              ranked, actionable hit-list.
            </p>
            <div className="space-y-3 mb-5">
              {[
                {
                  icon: <Filter size={13} />,
                  color: "#3B82F6",
                  label: "Proximity Filter",
                  desc: 'Filter by how reachable the target is. "Any" shows everyone. "Gatekeeper accessible (4+)" means a reliable intermediary is known. "Near-personal (7+)" means one degree of separation with a confirmed personal channel. "Personal only (9+)" means you have, or can directly obtain, a personal phone or WhatsApp.',
                },
                {
                  icon: <UserCheck size={13} />,
                  color: "#10B981",
                  label: "Type Chips",
                  desc: "Filter instantly to HNWI / Gatekeeper / Corporation / Trust. Gatekeepers are your real targets in the first phase — find the inner circle before trying to reach the principal.",
                },
                {
                  icon: <Download size={13} />,
                  color: "#A855F7",
                  label: "CSV Export",
                  desc: 'The "CSV" button (top-right toolbar) and the "Export CSV" link (footer) download every visible entity — with all applied filters — as a spreadsheet. Useful for offline briefings or loading into another tool.',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex gap-3 p-4 rounded border"
                  style={{ borderColor: `${item.color}30`, backgroundColor: `${item.color}07` }}
                >
                  <div
                    className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0"
                    style={{ borderColor: item.color, backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Proximity score table */}
            <div className="bg-[#050A14] border border-[#3B82F6]/25 rounded-lg p-5 mb-5">
              <p className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-widest mb-3">
                Proximity Score Scale (1 – 10)
              </p>
              <div className="space-y-2">
                {[
                  { range: "9–10", label: "Personal contact", color: "#10B981", desc: "Direct personal phone, WhatsApp, or Signal — confirmed reachable by you or one trusted person." },
                  { range: "7–8",  label: "Near-personal",    color: "#3B82F6", desc: "One warm handshake away. A gatekeeper with confirmed private access can make the intro." },
                  { range: "4–6",  label: "Gatekeeper path",  color: "#F59E0B", desc: "A reliable intermediary is known but personal access is not yet confirmed." },
                  { range: "1–3",  label: "Cold / sparse",    color: "#EF4444", desc: "Limited data. Company secretary or PR is the only known contact. Needs enrichment." },
                ].map((row) => (
                  <div key={row.range} className="flex gap-3 items-start text-xs">
                    <span
                      className="font-bold font-mono shrink-0 w-10 text-right mt-0.5"
                      style={{ color: row.color }}
                    >
                      {row.range}
                    </span>
                    <div>
                      <span className="font-bold text-[#E2E8F0]">{row.label}</span>
                      <span className="text-[#64748B] ml-2">{row.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CRM Pipeline */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-8 mb-4">
              The CRM Pipeline — tracking your outreach
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">
              Every target moves through 8 stages from first identification to a closed deal.
              Drag cards between columns in Pipeline CRM to track progress. The stage a target is in
              tells you exactly what the next action should be.
            </p>

            <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-5">
              <PipelineStages />
            </div>

            <Callout icon={<Gem size={14} />} color="#3B82F6" title="Pro tip: stage discipline">
              Never move a target past "Graph Mapped" until you've actually run the Network Graph. Never
              move past "MCTS Path Found" without a completed simulation. The pipeline is a quality gate,
              not just a label.
            </Callout>

            <ScreenshotBlock src={ss("crm.jpg")} caption="Pipeline CRM — 8-stage kanban view" />
          </Section>

          {/* ══════════════════════════════════════════════════════
              LEVEL III — NETWORK
          ══════════════════════════════════════════════════════ */}
          <Section
            id="section-3"
            level="III"
            levelColor="#F59E0B"
            levelLabel="LEVEL III — NETWORK"
            title="Reading the Network Graph"
          >
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
              The Network Graph is the most powerful screen in ApexFinder. It takes every public data point
              linked to a target and renders it as a web of relationships. Your job is to find the shortest
              warm path from you (or someone you know) to the HNWI target.
            </p>

            <ScreenshotBlock src={ss("graph.jpg")} caption="Network Graph — relationship web for a selected target" />

            {/* Node types */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              What each node type means
            </h3>
            <div className="space-y-3">
              {NODE_TYPES.map((n) => (
                <div
                  key={n.label}
                  className="flex gap-3 items-start p-4 rounded border"
                  style={{ borderColor: `${n.color}25`, backgroundColor: `${n.color}07` }}
                >
                  <div
                    className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0"
                    style={{ borderColor: n.color, backgroundColor: `${n.color}20`, color: n.color }}
                  >
                    {n.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: n.color }}>{n.label}</p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Edge types */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              Relationship types (edges)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {EDGE_TYPES.map((e) => (
                <div key={e.label} className="bg-[#0B0F19] border border-[#1E293B] rounded p-3">
                  <p className="text-xs font-bold text-[#F59E0B] font-mono mb-1">{e.label}</p>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{e.desc}</p>
                </div>
              ))}
            </div>

            {/* Strategy */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              How to use the graph strategically
            </h3>
            <div className="space-y-3">
              {[
                {
                  step: "Select your target",
                  detail: 'Use the dropdown at the top of the Network Graph. The entire graph re-renders around that individual.',
                },
                {
                  step: "Spot the Gatekeepers",
                  detail: "Amber (orange) nodes are gatekeepers — private bankers, family office managers, art dealers, estate lawyers. They sit between you and the target. They're your real objective.",
                },
                {
                  step: "Find your closest gatekeeper",
                  detail: "Look for gatekeepers who are also connected to entities or people you already know. That shared connection is your warm introduction angle.",
                },
                {
                  step: "Don't guess — simulate",
                  detail: "Once you've visually scanned the graph, run the MCTS Terminal to get a ranked, scored path recommendation. Human intuition and the algorithm together beat either one alone.",
                },
              ].map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#E2E8F0] mb-0.5">{s.step}</p>
                    <p className="text-xs text-[#64748B] leading-relaxed">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════
              LEVEL IV — ENGINE
          ══════════════════════════════════════════════════════ */}
          <Section
            id="section-4"
            level="IV"
            levelColor="#EF4444"
            levelLabel="LEVEL IV — ENGINE"
            title="How the Algorithms Work"
          >
            <div className="flex items-center gap-2 mb-6">
              <ShieldAlert size={14} className="text-[#EF4444]" />
              <span className="text-xs text-[#EF4444] font-bold uppercase tracking-widest">
                Deep technical detail — not required for daily use
              </span>
            </div>

            {/* Bayesian Score */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">
              The Bayesian Signal Score
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              The score isn't a simple count of data points. It's a Bayesian posterior probability —
              it starts with a prior (we assume little about the target) and updates itself upward
              each time a new piece of evidence arrives. Each type of evidence has a different weight:
            </p>

            <div className="bg-[#050A14] border border-[#10B981]/25 rounded-lg p-5 mb-4">
              <div className="space-y-2.5">
                {[
                  { signal: "Confirmed phone / email", weight: "Very high", color: "#10B981" },
                  { signal: "SEC 13D/G beneficial owner filing", weight: "High", color: "#10B981" },
                  { signal: "OpenCorporates director hit", weight: "Medium-high", color: "#3B82F6" },
                  { signal: "Property registry match", weight: "Medium", color: "#3B82F6" },
                  { signal: "News/social mention", weight: "Low", color: "#F59E0B" },
                  { signal: "Name-only match (no corroboration)", weight: "Very low", color: "#EF4444" },
                ].map((row) => (
                  <div key={row.signal} className="flex justify-between items-center text-xs">
                    <span className="text-[#94A3B8]">{row.signal}</span>
                    <span className="font-bold font-mono" style={{ color: row.color }}>{row.weight}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[#10B981]/15">
                <p className="text-[11px] text-[#64748B] font-mono leading-relaxed">
                  Score = posterior prob × 100, updated continuously as new registry hits arrive.
                  <br />
                  A score of 95 means the engine has high confidence a warm path exists.
                </p>
              </div>
            </div>

            {/* MCTS */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-8 mb-4">
              MCTS Terminal — Monte Carlo Tree Search
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              The MCTS Terminal simulates 120 possible approach paths through the relationship graph
              and scores each one. It uses the UCT algorithm to balance two competing pressures:
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-[#050A14] border border-[#3B82F6]/25 rounded-lg p-4">
                <p className="text-xs font-bold text-[#3B82F6] mb-2 uppercase tracking-wider">Exploitation</p>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Keep exploring paths that have already scored well in earlier simulations.
                  Double down on what's working.
                </p>
              </div>
              <div className="bg-[#050A14] border border-[#F59E0B]/25 rounded-lg p-4">
                <p className="text-xs font-bold text-[#F59E0B] mb-2 uppercase tracking-wider">Exploration</p>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Occasionally try paths that haven't been simulated much yet — a hidden shortcut
                  might score higher than anything found so far.
                </p>
              </div>
            </div>

            <div className="bg-[#050A14] border border-[#1E293B] rounded-lg p-5 mb-5">
              <p className="text-[10px] text-[#475569] font-mono mb-2 uppercase tracking-wider">UCT formula</p>
              <p className="text-sm font-mono text-[#E2E8F0] text-center py-2 overflow-x-auto whitespace-nowrap">
                UCT(v) = Q(v)/N(v) + √2 · √(ln N(parent) / N(v))
              </p>
              <div className="mt-4 space-y-1.5 text-[11px]">
                {[
                  ["Q(v)/N(v)", "Average warmth score of paths through this node — exploitation term"],
                  ["√2", "Exploration constant — controls risk appetite"],
                  ["ln N(parent)/N(v)", "Log ratio of parent visits to child visits — boosts under-explored nodes"],
                ].map(([term, def]) => (
                  <div key={term} className="flex gap-3">
                    <span className="font-mono text-[#3B82F6] shrink-0 w-28">{term}</span>
                    <span className="text-[#64748B]">{def}</span>
                  </div>
                ))}
              </div>
            </div>

            <Callout icon={<Terminal size={14} />} color="#EF4444" title="When to override the algorithm">
              The MCTS path is a probabilistic recommendation, not an instruction. If you personally know
              a lower-ranked gatekeeper, that human relationship outweighs any warmth score. Use the
              algorithm to discover paths you didn't know existed — use your judgment to pick the one
              you'll actually act on.
            </Callout>

            <ScreenshotBlock src={ss("mcts.jpg")} caption="MCTS Terminal — simulation in progress" />
          </Section>

          {/* ══════════════════════════════════════════════════════
              LEVEL V — MASS INGEST
          ══════════════════════════════════════════════════════ */}
          <Section
            id="section-5"
            level="V"
            levelColor="#A855F7"
            levelLabel="LEVEL V — MASS INGEST"
            title="Western HNWI Engine"
          >
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
              Instead of adding targets one at a time, the Western HNWI Engine pulls thousands of{" "}
              <strong className="text-[#E2E8F0]">real people</strong> from free government registries
              — SEC EDGAR beneficial-ownership filings, Norwegian Enhetsregisteret board directors,
              and Companies House UK officers — all pre-scored and deduplicated — in a single
              background job. Your Entity Ledger goes from dozens to thousands of verified, real
              targets in one run.
            </p>

            <Callout icon={<Zap size={14} />} color="#A855F7" title="What the engine fetches">
              Every record is a real person from a real public source. SC 13D/G filers own{" "}
              {">"}&thinsp;5% of a US public company — confirmed wealthy. Norwegian board directors
              come from the national Enhetsregisteret. UK officers come from Companies House. Each
              record includes: full name, nationality, source registry, known location, Bayesian
              signal score, and a Proximity Score (1–10) that rises as MCTS research adds contact
              vectors.
            </Callout>

            {/* How to trigger */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              How to run an ingestion
            </h3>
            <div className="space-y-4 mb-6">
              {[
                {
                  n: "1",
                  title: "Open Intelligence HQ",
                  body: 'Navigate to the main dashboard. The "Western HNWI Engine" panel is at the bottom of the Live Signals sidebar.',
                },
                {
                  n: "2",
                  title: "Choose your target count",
                  body: 'Use the TARGET dropdown to select how many records to fetch: 500 (quick test), 5,000 (default), up to 50,000 (full dataset). Larger runs harvest more pages from each registry and take longer.',
                },
                {
                  n: "3",
                  title: "Hit INGEST",
                  body: 'Click the green INGEST button. The job starts immediately in the background. A progress bar appears. You can navigate elsewhere — the job continues running server-side.',
                },
                {
                  n: "4",
                  title: "Watch the progress bar",
                  body: 'The bar updates every 1.5 seconds by polling the job status endpoint. Click "log" to see a rolling tail of what\'s being inserted. When done, the stats bar at the top of the page auto-refreshes.',
                },
                {
                  n: "5",
                  title: "Filter by proximity in Entity Ledger",
                  body: 'After ingestion, go to Entity Ledger → set the Proximity filter to "≥ Near-personal (7+)". This surfaces only the targets with confirmed warm-access paths. Start there.',
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#A855F7]/15 border border-[#A855F7]/40 text-[#A855F7] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {step.n}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#E2E8F0] mb-0.5">{step.title}</p>
                    <p className="text-sm text-[#64748B] leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Country distribution */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              Country distribution
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              The engine pulls from registries across Western jurisdictions with the highest density
              of publicly-filed beneficial ownership data and company director records.
            </p>
            <div className="bg-[#050A14] border border-[#A855F7]/25 rounded-lg p-5 mb-5">
              <div className="space-y-2.5">
                {[
                  { country: "United States (SEC EDGAR)",   pct: 80, color: "#10B981" },
                  { country: "Norway (BRREG)",             pct: 12, color: "#3B82F6" },
                  { country: "United Kingdom (CH)",        pct:  8, color: "#F59E0B" },
                ].map((row) => (
                  <div key={row.country} className="flex items-center gap-3 text-xs">
                    <span className="text-[#94A3B8] w-28 shrink-0">{row.country}</span>
                    <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.pct * 2.8}%`, backgroundColor: row.color }}
                      />
                    </div>
                    <span className="font-mono font-bold w-8 text-right" style={{ color: row.color }}>
                      {row.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source types */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              Source types
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { tier: "SC 13D/G Filer",    desc: "Owns >5% of US public co.",  color: "#10B981", badge: "Confirmed wealthy" },
                { tier: "DEF 14A Director",  desc: "Named in US proxy statement", color: "#3B82F6", badge: "Board-level exec"   },
                { tier: "BRREG Director",    desc: "Norwegian company board",     color: "#F59E0B", badge: "Govt. registry"    },
                { tier: "CH Officer / PSC",  desc: "UK Companies House record",   color: "#64748B", badge: "Key optional"     },
              ].map((row) => (
                <div
                  key={row.tier}
                  className="p-3 rounded border"
                  style={{ borderColor: `${row.color}30`, backgroundColor: `${row.color}08` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold" style={{ color: row.color }}>{row.tier}</span>
                    <span className="text-[10px] font-mono text-[#475569]">{row.badge}</span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">{row.desc}</span>
                </div>
              ))}
            </div>

            {/* Dedup system */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              Deduplication — never double-count
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              Every fetched record is fingerprinted by normalised name + jurisdiction and stored in
              a permanent Upstash Redis set. Running INGEST twice will insert new records from deeper
              registry pages, not duplicates — the engine automatically skips any fingerprint it has
              already seen. The "deduplicated" counter in the job log shows how many were skipped.
            </p>
            <div className="bg-[#050A14] border border-[#A855F7]/25 rounded-lg p-5 mb-5 text-xs font-mono">
              <div className="text-[#475569] mb-2 uppercase tracking-wider text-[10px]">Job output example</div>
              <div className="space-y-1 text-[#94A3B8]">
                <div><span className="text-[#A855F7]">[running]</span> Batch 1/50 — inserting 100 records…</div>
                <div><span className="text-[#A855F7]">[running]</span> Batch 2/50 — 3 skipped (dedup), 97 inserted</div>
                <div><span className="text-[#A855F7]">[running]</span> Batch 12/50 — progress 24%</div>
                <div><span className="text-[#10B981]">[done]</span> 4,871 records inserted · 129 deduped · 8.4s</div>
              </div>
            </div>

            <Callout icon={<Shield size={14} />} color="#A855F7" title="Re-ingesting from scratch">
              If you want a completely fresh dataset — for example after changing the country weights
              or wealth tier distribution — call DELETE /api/ingest/dedup to wipe the dedup set, then
              run INGEST again. Everything will be treated as new. The existing database records are
              not deleted automatically; clear the entities table manually if needed.
            </Callout>

            {/* Stats bar */}
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-7 mb-4">
              Dashboard stats bar
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
              The top of Intelligence HQ shows five live counters. After ingestion, the "Western HNWIs"
              stat will climb to reflect exactly how many engine-generated records are in the database.
            </p>
            <div className="grid grid-cols-5 gap-0 bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden mb-4">
              {[
                { icon: <Database size={11} />, label: "ENTITIES",       color: "#94A3B8", value: "31"     },
                { icon: <Map size={11} />,      label: "ASSETS",         color: "#94A3B8", value: "35"     },
                { icon: <Globe size={11} />,    label: "WESTERN HNWIs",  color: "#60A5FA", value: "5,000"  },
                { icon: <BarChart3 size={11} />,label: "SIGNAL AVG",     color: "#10B981", value: "61.6%"  },
                { icon: <ShieldAlert size={11} />,label:"HOT LEADS",     color: "#F59E0B", value: "9"      },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="flex flex-col px-3 py-2.5"
                  style={{ borderRight: i < 4 ? "1px solid #1E293B" : "none" }}
                >
                  <div className="flex items-center gap-1 mb-1" style={{ color: s.color }}>
                    {s.icon}
                    <span className="text-[9px] font-mono uppercase tracking-wider">{s.label}</span>
                  </div>
                  <span className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

          </Section>

        </div>
      </div>
    </div>
  );
}
