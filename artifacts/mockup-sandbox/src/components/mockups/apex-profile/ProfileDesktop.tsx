import React from 'react';
import { 
  ArrowLeft, Network, Target, KanbanSquare, ShieldAlert, 
  Shield, UserCheck, Briefcase, FileText, 
  Link2, CheckCircle2, Fingerprint, Activity,
  Landmark, User, PieChart, Info, MapPin
} from 'lucide-react';

// Hardcoded data for the mockup
const ENTITY = {
  name: "Peter Thiel",
  type: "HNWI",
  nationality: "American",
  netWorth: "$5,000,000,000+",
  score: 94,
  contactConfidence: 82,
};

const LEDGER_DATA = [
  { id: 1, category: "Identity", catColor: "text-[#10B981] bg-[#10B981]/10", dataPoint: "Full Name", value: "Peter Andreas Thiel", source: "US Passport Registry", badge: "Registry", badgeColor: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10" },
  { id: 2, category: "Identity", catColor: "text-[#10B981] bg-[#10B981]/10", dataPoint: "Nationality", value: "American / New Zealand", source: "Immigration Dept", badge: "Registry", badgeColor: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10" },
  { id: 3, category: "Financial", catColor: "text-[#3B82F6] bg-[#3B82F6]/10", dataPoint: "Est. Net Worth", value: "$5,000,000,000+", source: "Forbes / SEC 13G", badge: "Enriched", badgeColor: "text-[#3B82F6] border-[#3B82F6]/30 bg-[#3B82F6]/10" },
  { id: 4, category: "Network", catColor: "text-[#8B5CF6] bg-[#8B5CF6]/10", dataPoint: "Co-Founder", value: "Founders Fund", source: "Analyst Notes", badge: "Manual", badgeColor: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10" },
  { id: 5, category: "Asset", catColor: "text-[#06B6D4] bg-[#06B6D4]/10", dataPoint: "StockHolding", value: "Palantir Technologies SC 13G filing 2022-02-14", source: "SEC EDGAR", badge: "Registry", badgeColor: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10" },
  { id: 6, category: "Registry", catColor: "text-[#F59E0B] bg-[#F59E0B]/10", dataPoint: "SEC EDGAR", value: "CIK 0001336920", source: "SEC EDGAR", badge: "Registry", badgeColor: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10" },
];

const CONFIDENCE_SCORES = [
  { label: "Identity", score: 98 },
  { label: "Financial", score: 95 },
  { label: "Network", score: 88 },
  { label: "Registry", score: 90 },
  { label: "Asset", score: 85 },
];

function ConfidenceGauge({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-24 h-24 transform -rotate-90">
        <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
        <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="text-[#10B981] transition-all duration-1000 ease-in-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono text-[#10B981]">{score}<span className="text-sm">%</span></span>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode, title: string, badge?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E293B] bg-[#0A1123]">
      <div className="flex items-center gap-2 text-[#10B981]">
        {icon}
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200">{title}</span>
      </div>
      {badge && <span className="text-[10px] font-mono text-slate-500">{badge}</span>}
    </div>
  );
}

export default function ProfileDesktop() {
  return (
    <div className="dark flex flex-col h-[820px] w-[1280px] bg-[#070D1A] text-slate-300 font-sans overflow-hidden">
      
      {/* ── Breadcrumb & Top Bar ─────────────────────────────────────────── */}
      <div className="flex items-center px-6 py-4 border-b border-[#1E293B] bg-[#0A1123]">
        <button className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Entity Ledger
        </button>
      </div>

      {/* ── Main Header ──────────────────────────────────────────────────── */}
      <div className="px-6 py-6 border-b border-[#1E293B] bg-[#0A1123] flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-white">{ENTITY.name}</h1>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]">
              <UserCheck size={14} />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">{ENTITY.type}</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
              {ENTITY.nationality}
            </span>
          </div>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Bayesian Signal</span>
              <span className="text-sm font-mono font-bold px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                {ENTITY.score}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Contact Confidence</span>
              <span className="text-sm font-mono font-bold px-2 py-0.5 rounded bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40">
                {ENTITY.contactConfidence}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Est. Net Worth</span>
              <span className="text-sm font-mono font-bold text-slate-300">
                {ENTITY.netWorth}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded bg-[#070D1A] border border-[#1E293B] text-slate-400 hover:text-white transition-colors">
            <Network size={16} /> <span className="text-xs font-mono uppercase tracking-wider">Network Graph</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded bg-[#070D1A] border border-[#1E293B] text-slate-400 hover:text-white transition-colors">
            <Target size={16} /> <span className="text-xs font-mono uppercase tracking-wider">Intel Terminal</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/20 transition-colors">
            <KanbanSquare size={16} /> <span className="text-xs font-mono uppercase tracking-wider font-bold">Pipeline CRM</span>
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden bg-[#070D1A]">
        
        {/* Left Column */}
        <div className="flex-1 flex flex-col border-r border-[#1E293B] overflow-y-auto">
          
          {/* Section: Key Data Overview */}
          <div className="p-6 grid grid-cols-3 gap-4 border-b border-[#1E293B]">
            <div className="bg-[#0A1123] border border-[#1E293B] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 text-[#10B981]">
                <Shield size={16} /> <span className="text-[10px] font-mono uppercase tracking-widest">Verification Status</span>
              </div>
              <p className="text-sm text-slate-300 mb-1">Target is fully verified across 3 separate government registries.</p>
              <div className="flex gap-2 mt-3">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">SEC EDGAR</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">US PASSPORT</span>
              </div>
            </div>
            <div className="bg-[#0A1123] border border-[#1E293B] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 text-[#3B82F6]">
                <Landmark size={16} /> <span className="text-[10px] font-mono uppercase tracking-widest">Primary Assets</span>
              </div>
              <p className="text-sm font-mono text-slate-200">1x Major Stockholding</p>
              <p className="text-xs text-slate-500 mt-1">Palantir Technologies</p>
            </div>
            <div className="bg-[#0A1123] border border-[#1E293B] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 text-[#F59E0B]">
                <Activity size={16} /> <span className="text-[10px] font-mono uppercase tracking-widest">Network Radius</span>
              </div>
              <p className="text-sm font-mono text-slate-200">24 First-Degree Edges</p>
              <p className="text-xs text-slate-500 mt-1">11 Gatekeepers Identified</p>
            </div>
          </div>

          {/* Section: Data Ledger */}
          <div className="flex-1 flex flex-col">
            <SectionHeader icon={<FileText size={16} />} title="Classified Data Ledger" badge="32 Data Points Found" />
            <div className="flex-1 p-6 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1E293B]">
                    <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-normal">Category</th>
                    <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-normal">Data Point</th>
                    <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-normal">Value</th>
                    <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-normal">Source</th>
                    <th className="pb-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-normal text-right">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {LEDGER_DATA.map((row) => (
                    <tr key={row.id} className="border-b border-[#1E293B]/50 hover:bg-[#1E293B]/20 transition-colors group">
                      <td className="py-3">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${row.catColor}`}>
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3 text-xs font-mono text-slate-400">{row.dataPoint}</td>
                      <td className="py-3 text-sm text-slate-200">{row.value}</td>
                      <td className="py-3 text-xs font-mono text-slate-500 flex items-center gap-1.5 mt-1">
                        <Database size={12} className="opacity-50"/> {row.source}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${row.badgeColor} uppercase tracking-widest`}>
                          {row.badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Confidence Gauges */}
        <div className="w-[380px] flex flex-col bg-[#0A1123] border-l border-[#1E293B]">
          <SectionHeader icon={<PieChart size={16} />} title="Sensor Readouts" badge="System Confidence" />
          
          <div className="p-8 flex flex-col items-center border-b border-[#1E293B]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-6">Overall Data Confidence</span>
            <ConfidenceGauge score={91} />
            <div className="mt-6 text-center text-xs text-slate-400 leading-relaxed px-4">
              Entity profile is highly verified. Multiple intersecting registries confirm identity and core assets.
            </div>
          </div>

          <div className="p-6 flex flex-col gap-5 flex-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Dimension Breakdown</span>
            {CONFIDENCE_SCORES.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">{item.label}</span>
                  <span className="text-xs font-mono font-bold text-[#10B981]">{item.score}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#10B981] rounded-full" 
                    style={{ width: `${item.score}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}

// Temporary icon component since Database wasn't imported from lucide
function Database(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
      <path d="M3 12A9 3 0 0 0 21 12"></path>
    </svg>
  );
}