import React from "react";
import { 
  Search, Filter, Globe, Download, Plus, Target as TargetIcon, 
  ChevronRight, CheckSquare, Square, ChevronDown
} from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  HNWI: "#10B981",
  Corporation: "#3B82F6",
  Trust: "#A855F7",
  Gatekeeper: "#F59E0B",
};

const mockEntities = [
  {
    id: 1,
    name: "Alexander von Hapsburg",
    type: "HNWI",
    nationality: "Switzerland",
    netWorth: "$1.4B",
    score: 0.92,
    email: "alexander.v.h@familyoffice.ch",
    phone: "+41 79 123 45 67",
    linkedinUrl: "",
  },
  {
    id: 2,
    name: "Vanguard Global Holdings Ltd.",
    type: "Corporation",
    nationality: "Cayman Islands",
    netWorth: "$4.2B",
    score: 0.85,
    email: "",
    phone: "",
    linkedinUrl: "",
  },
  {
    id: 3,
    name: "Eleanor Sterling",
    type: "Gatekeeper",
    nationality: "United Kingdom",
    netWorth: "—",
    score: 0.68,
    email: "e.sterling@legal-counsel.co.uk",
    phone: "",
    linkedinUrl: "https://linkedin.com/in/esterling-legal",
  },
  {
    id: 4,
    name: "The Meridian Heritage Trust",
    type: "Trust",
    nationality: "Jersey",
    netWorth: "$850M",
    score: 0.74,
    email: "",
    phone: "",
    linkedinUrl: "",
  }
];

export default function EntitiesDesktop() {
  const typeFilter = "HNWI";

  return (
    <div className="w-[1280px] h-[800px] bg-[#0B0F19] text-white flex flex-col font-sans overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/20 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded bg-black/40 border border-white/10">
          <Search className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
          <input
            type="text" 
            placeholder="Search entities…"
            className="flex-1 bg-transparent text-sm font-mono text-white outline-none placeholder:text-white/30"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1">
          {[null, "HNWI", "Gatekeeper", "Corporation", "Trust"].map((t) => {
            const c = t ? (TYPE_COLORS[t] ?? "#64748B") : "#10B981";
            return (
              <button
                key={t ?? "all"}
                className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all"
                style={{
                  backgroundColor: typeFilter === t ? c : c + "18",
                  color: typeFilter === t ? "#000" : c,
                  border: `1px solid ${c}44`,
                }}
              >
                {t ?? "ALL"}
              </button>
            );
          })}
        </div>

        {/* Proximity filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-white/50" />
          <select
            className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none"
          >
            <option value={0}>Proximity: Any</option>
            <option value={4}>≥ Gatekeeper (4+)</option>
          </select>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-white/70 hover:text-white font-mono text-[11px] uppercase tracking-wider transition-all">
          <Globe className="w-3 h-3" /> Live Intel
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-white/70 hover:text-white font-mono text-[11px] uppercase tracking-wider transition-all">
          <Download className="w-3 h-3" /> CSV
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 text-white font-mono text-[11px] uppercase tracking-wider hover:bg-emerald-600 transition-colors">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-[#0B0F19]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-xs font-mono text-white/50 uppercase tracking-widest bg-black/10">
              <th className="w-12 px-4 py-3"><Square className="w-4 h-4" /></th>
              {["Name & Classification","Nationality","Net Worth","Score","Contact Vector","Actions"].map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {mockEntities.map((entity) => {
              const typeColor = TYPE_COLORS[entity.type] ?? "#64748B";
              return (
                <tr key={entity.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-3 align-top">
                    <Square className="w-4 h-4 text-white/30" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="font-bold text-sm flex items-center gap-2 text-white">
                        {entity.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ color: typeColor, backgroundColor: typeColor + "18" }}
                        >
                          {entity.type}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60 font-mono">{entity.nationality}</td>
                  <td className="px-4 py-3 text-sm font-mono text-white">
                    {entity.netWorth}
                  </td>
                  <td className="px-4 py-3">
                    <div 
                      className="px-2 py-0.5 rounded inline-block text-[11px] font-mono font-bold"
                      style={{ 
                        backgroundColor: entity.score >= 0.8 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                        color: entity.score >= 0.8 ? "#10B981" : "#F59E0B"
                      }}
                    >
                      {(entity.score * 100).toFixed(0)}/100
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[220px]">
                    {entity.email || entity.phone || entity.linkedinUrl ? (
                      <div className="flex flex-col gap-0.5">
                        {entity.email && (
                          <a
                            href={`mailto:${entity.email}`}
                            className="flex items-center gap-1 text-emerald-400 hover:underline truncate font-mono"
                            title={entity.email}
                          >
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="truncate text-[11px]" title={entity.email}>{entity.email}</span>
                          </a>
                        )}
                        {entity.phone && (
                          <a
                            href={`tel:${entity.phone}`}
                            className="flex items-center gap-1 text-blue-400 hover:underline font-mono"
                            title={entity.phone}
                          >
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span className="text-[11px]" title={entity.phone}>{entity.phone}</span>
                          </a>
                        )}
                        {entity.linkedinUrl && !entity.email && !entity.phone && (
                          <a
                            href={entity.linkedinUrl}
                            className="flex items-center gap-1 text-blue-400 hover:underline font-mono"
                            title={entity.linkedinUrl}
                          >
                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            <span className="text-[11px] truncate" title={entity.linkedinUrl}>LinkedIn</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-white/30 font-mono text-[11px] italic">No contact</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1.5 rounded border border-white/10 text-white/70 hover:text-white font-mono text-[10px] uppercase tracking-wider transition-all">
                      Profile
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
