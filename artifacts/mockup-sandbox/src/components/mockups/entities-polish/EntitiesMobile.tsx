import React from "react";
import { 
  Search, X, Plus, Square, CheckSquare, ChevronRight, ShieldAlert,
  UserCheck, Building2, Briefcase, Shield
} from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  HNWI: "#10B981",
  Corporation: "#3B82F6",
  Trust: "#A855F7",
  Gatekeeper: "#F59E0B",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  HNWI:        <UserCheck className="w-3 h-3" />,
  Corporation: <Building2 className="w-3 h-3" />,
  Trust:       <Briefcase className="w-3 h-3" />,
  Gatekeeper:  <Shield className="w-3 h-3" />,
};

const mockEntities = [
  {
    id: 1,
    name: "Alexander von Hapsburg",
    type: "HNWI",
    nationality: "Switzerland",
    netWorth: "$1.4B",
    score: 0.92,
    isHot: true,
  },
  {
    id: 2,
    name: "Vanguard Global Holdings Ltd.",
    type: "Corporation",
    nationality: "Cayman Islands",
    netWorth: "$4.2B",
    score: 0.85,
    isHot: false,
  },
  {
    id: 3,
    name: "Eleanor Sterling",
    type: "Gatekeeper",
    nationality: "United Kingdom",
    netWorth: null,
    score: 0.68,
    isHot: false,
  }
];

export default function EntitiesMobile() {
  const mobileTypeFilter = null;
  const selectedIds = new Set<number>();

  return (
    <div className="w-[390px] h-[844px] bg-[#0B0F19] text-white flex flex-col font-sans overflow-hidden">
      {/* Mobile top toolbar */}
      <div className="px-3 py-2 border-b border-white/10 bg-black/20 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-black/40 border border-white/10">
          <Search className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
          <input
            type="text" 
            placeholder="Search entities…"
            className="flex-1 bg-transparent text-sm font-mono text-white outline-none placeholder:text-white/30"
          />
        </div>
        
        {/* Scroll indicator fix applied here */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {[null, "HNWI", "Gatekeeper", "Corporation", "Trust"].map((t) => {
              const c = t ? (TYPE_COLORS[t] ?? "#64748B") : "#10B981";
              return (
                <button
                  key={t ?? "all"}
                  className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase whitespace-nowrap flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: mobileTypeFilter === t ? c : c + "18",
                    color: mobileTypeFilter === t ? "#000" : c,
                    border: `1px solid ${c}44`,
                  }}
                >
                  {t ?? "ALL"}
                </button>
              );
            })}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0B0F19] to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-white/10 border-b border-white/10">
          {mockEntities.map((entity) => {
            const typeColor = TYPE_COLORS[entity.type] ?? "#64748B";
            
            return (
              <div key={entity.id} className="flex items-center gap-1 transition-colors hover:bg-white/5">
                <button className="flex-shrink-0 px-3 py-4 text-white/50">
                  <Square className="w-4 h-4" />
                </button>

                <button className="flex-1 min-w-0 text-left pr-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {entity.isHot && <ShieldAlert className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                      <span className="font-semibold text-sm text-white truncate">{entity.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                        style={{ color: typeColor, backgroundColor: typeColor + "18" }}
                      >
                        {TYPE_ICONS[entity.type]} {entity.type}
                      </span>
                      {entity.nationality && <span className="text-[11px] text-white/50">{entity.nationality}</span>}
                      {entity.netWorth && (
                        <span className="text-[11px] text-white/50">{entity.netWorth}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div 
                      className="px-2 py-0.5 rounded inline-block text-[10px] font-mono font-bold"
                      style={{ 
                        backgroundColor: entity.score >= 0.8 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                        color: entity.score >= 0.8 ? "#10B981" : "#F59E0B"
                      }}
                    >
                      {(entity.score * 100).toFixed(0)}
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <button className="fixed bottom-6 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-40 bg-emerald-500 hover:bg-emerald-600 transition-colors" style={{ boxShadow: "0 0 20px rgba(16,185,129,0.4)" }}>
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}
