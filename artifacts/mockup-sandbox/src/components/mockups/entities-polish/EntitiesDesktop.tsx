import React, { useState } from 'react';
import { 
  Search, Filter, Globe, Download, Plus, ShieldAlert,
  UserCheck, Building2, Briefcase, Shield, X, Loader2,
  Mail, Phone, Linkedin, MoreHorizontal, Target, Network
} from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  HNWI: "#10B981",
  Corporation: "#3B82F6",
  Trust: "#A855F7",
  Gatekeeper: "#F59E0B",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  HNWI: <UserCheck className="w-3.5 h-3.5" />,
  Corporation: <Building2 className="w-3.5 h-3.5" />,
  Trust: <Briefcase className="w-3.5 h-3.5" />,
  Gatekeeper: <Shield className="w-3.5 h-3.5" />,
};

const MOCK_ENTITIES = [
  {
    id: 1,
    name: "Alexander V. Petrov",
    type: "HNWI",
    bayesianScore: 92,
    location: "London, UK / Dubai, UAE",
    netWorth: "$1.2B - $1.5B",
    contact: ["email", "phone"],
    isHot: true,
    tags: ["Aircraft Owner", "UK Property"],
    notes: "Identified via Isle of Man registry."
  },
  {
    id: 2,
    name: "Crescent Horizon Holdings Ltd",
    type: "Corporation",
    bayesianScore: 84,
    location: "British Virgin Islands",
    netWorth: "Unknown",
    contact: ["email"],
    isHot: false,
    tags: ["EDGAR Filer", "Shell Company"],
    notes: "Linked to 4 separate trusts in Delaware."
  },
  {
    id: 3,
    name: "Eleanor Vance-Sterling",
    type: "HNWI",
    bayesianScore: 78,
    location: "New York, USA",
    netWorth: "$450M - $600M",
    contact: ["phone"],
    isHot: false,
    tags: ["Real Estate", "Philanthropy"],
    notes: "Appears in Panama Papers."
  },
  {
    id: 4,
    name: "Oakhaven Family Trust",
    type: "Trust",
    bayesianScore: 88,
    location: "Delaware, USA",
    netWorth: "$2.4B (AUM)",
    contact: [],
    isHot: true,
    tags: ["Asset Protection", "Proxy"],
    notes: "Managed by Gatekeeper entity ID-409."
  },
  {
    id: 5,
    name: "Marcus G. Thorne",
    type: "Gatekeeper",
    bayesianScore: 65,
    location: "Geneva, Switzerland",
    netWorth: "N/A",
    contact: ["email", "phone", "linkedin"],
    isHot: false,
    tags: ["Wealth Manager", "Legal"],
    notes: "Managing partner at Thorne & Associates."
  },
  {
    id: 6,
    name: "Quantum Dynamics LLC",
    type: "Corporation",
    bayesianScore: 71,
    location: "Cayman Islands",
    netWorth: "Unknown",
    contact: ["email"],
    isHot: false,
    tags: ["EDGAR Filer", "Tech"],
    notes: "Recently acquired 3 EU startups."
  },
  {
    id: 7,
    name: "Isabella Rossi",
    type: "HNWI",
    bayesianScore: 81,
    location: "Monaco / Milan, IT",
    netWorth: "$800M",
    contact: ["email", "phone"],
    isHot: false,
    tags: ["Yacht Owner", "Fashion"],
    notes: "Listed in Malta citizenship registry."
  },
  {
    id: 8,
    name: "Atlas Global Nominees",
    type: "Gatekeeper",
    bayesianScore: 89,
    location: "Nicosia, Cyprus",
    netWorth: "N/A",
    contact: ["phone"],
    isHot: true,
    tags: ["Corporate Services"],
    notes: "Acting as proxy director for 40+ entities."
  }
];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? "bg-[#10B981]" : score >= 70 ? "bg-[#F59E0B]" : "bg-[#EF4444]";
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs font-mono font-bold w-6 text-right text-slate-200">{score}</div>
      <div className="h-1.5 w-16 bg-[#0B0F19] rounded-full overflow-hidden border border-[#2A3045]">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || "#64748B";
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
      style={{ color: color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
    >
      {TYPE_ICONS[type]} {type}
    </span>
  );
}

export function EntitiesDesktop() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [showLiveIntel, setShowLiveIntel] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const filters = ["All", "HNWI", "Corporation", "Trust", "Gatekeeper"];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 font-sans flex overflow-hidden w-full max-w-[1280px] mx-auto border-x border-[#2A3045]">
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showLiveIntel ? 'mr-[360px]' : ''}`}>
        
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A3045] bg-[#141824]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#0B0F19] border border-[#2A3045] rounded-md px-3 py-1.5 w-72 focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6]/50 transition-all">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search entities, IDs, locations..." 
                className="bg-transparent border-none outline-none text-sm font-mono text-slate-200 placeholder:text-slate-600 w-full" 
              />
            </div>
            
            <div className="flex bg-[#0B0F19] p-0.5 rounded-md border border-[#2A3045]">
              {filters.map(t => (
                <button 
                  key={t} 
                  onClick={() => setActiveFilter(t)}
                  className={`px-3 py-1 text-[11px] font-mono uppercase tracking-wider rounded-sm transition-colors ${
                    activeFilter === t 
                      ? 'bg-[#2A3045] text-slate-200 font-bold' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowLiveIntel(!showLiveIntel)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border font-mono text-[11px] uppercase tracking-wider transition-all ${
                showLiveIntel 
                  ? 'bg-[#3B82F6]/10 border-[#3B82F6]/50 text-[#3B82F6]' 
                  : 'border-[#2A3045] text-slate-400 hover:text-slate-200 hover:bg-[#2A3045]/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Live Intel
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#2A3045] text-slate-400 hover:text-slate-200 hover:bg-[#2A3045]/50 font-mono text-[11px] uppercase tracking-wider transition-all">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#10B981] text-white font-mono text-[11px] uppercase tracking-wider hover:bg-[#10B981]/90 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Plus className="w-3.5 h-3.5" /> Add Entity
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto bg-[#0B0F19] relative">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#141824] border-b border-[#2A3045] shadow-sm">
              <tr>
                <th className="px-6 py-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[30%]">Entity Name</th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[12%]">Type</th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[15%]">Bayesian Score</th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[20%]">Location</th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[15%]">Net Worth / AUM</th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest w-[8%] text-right">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3045]/50">
              {MOCK_ENTITIES.map((entity) => (
                <tr 
                  key={entity.id} 
                  className="hover:bg-[#141824]/80 transition-colors group relative h-16"
                  onMouseEnter={() => setHoveredRow(entity.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {entity.isHot && <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                      <span className="font-semibold text-sm text-slate-200 truncate">{entity.name}</span>
                    </div>
                    {hoveredRow === entity.id && (
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#141824] border border-[#2A3045] p-1 rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-[#2A3045] rounded" title="Run Research"><Target className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-[#2A3045] rounded" title="View Network"><Network className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={entity.type} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBar score={entity.bayesianScore} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 truncate">
                    {entity.location}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">
                    {entity.netWorth}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 text-slate-500">
                      {entity.contact.includes('email') && <Mail className="w-3.5 h-3.5 hover:text-slate-300 cursor-pointer" />}
                      {entity.contact.includes('phone') && <Phone className="w-3.5 h-3.5 hover:text-slate-300 cursor-pointer" />}
                      {entity.contact.includes('linkedin') && <Linkedin className="w-3.5 h-3.5 hover:text-slate-300 cursor-pointer" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Intel Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-[360px] bg-[#141824] border-l border-[#2A3045] shadow-2xl transition-transform duration-300 ease-in-out z-30 flex flex-col ${
          showLiveIntel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2A3045]">
          <div className="flex items-center gap-2 text-[#3B82F6]">
            <Globe className="w-4 h-4" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest">Live Registry Query</h2>
          </div>
          <button onClick={() => setShowLiveIntel(false)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Search Source</label>
            <select className="bg-[#0B0F19] border border-[#2A3045] rounded-md px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-[#3B82F6]">
              <option>OpenCorporates</option>
              <option>Companies House UK</option>
              <option>SEC EDGAR</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Query</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Company name, filing ID..." 
                className="flex-1 bg-[#0B0F19] border border-[#2A3045] rounded-md px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-[#3B82F6]"
              />
              <button className="px-3 py-2 bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30 rounded-md hover:bg-[#3B82F6]/20 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex-1 border border-[#2A3045] rounded-md bg-[#0B0F19] flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <Globe className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-xs font-mono">Connect to global registries to instantly ingest entity data, directors, and proxy connections.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
