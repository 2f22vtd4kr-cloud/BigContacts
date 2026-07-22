import React, { useState } from 'react';
import { 
  Search, Filter, ShieldAlert, UserCheck, Building2, 
  Briefcase, Shield, Mail, Phone, Linkedin, ChevronRight
} from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  HNWI: "#10B981",
  Corporation: "#3B82F6",
  Trust: "#A855F7",
  Gatekeeper: "#F59E0B",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  HNWI: <UserCheck className="w-3 h-3" />,
  Corporation: <Building2 className="w-3 h-3" />,
  Trust: <Briefcase className="w-3 h-3" />,
  Gatekeeper: <Shield className="w-3 h-3" />,
};

const MOCK_ENTITIES = [
  {
    id: 1,
    name: "Alexander V. Petrov",
    type: "HNWI",
    bayesianScore: 92,
    location: "London, UK / Dubai, UAE",
    contact: ["email", "phone"],
    isHot: true,
  },
  {
    id: 2,
    name: "Crescent Horizon Holdings Ltd",
    type: "Corporation",
    bayesianScore: 84,
    location: "British Virgin Islands",
    contact: ["email"],
    isHot: false,
  },
  {
    id: 3,
    name: "Eleanor Vance-Sterling",
    type: "HNWI",
    bayesianScore: 78,
    location: "New York, USA",
    contact: ["phone"],
    isHot: false,
  },
  {
    id: 4,
    name: "Oakhaven Family Trust",
    type: "Trust",
    bayesianScore: 88,
    location: "Delaware, USA",
    contact: [],
    isHot: true,
  },
  {
    id: 5,
    name: "Marcus G. Thorne",
    type: "Gatekeeper",
    bayesianScore: 65,
    location: "Geneva, Switzerland",
    contact: ["email", "phone", "linkedin"],
    isHot: false,
  }
];

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || "#64748B";
  return (
    <span 
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider"
      style={{ color: color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
    >
      {TYPE_ICONS[type]} {type}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10" 
              : score >= 70 ? "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10" 
              : "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10";
  return (
    <div className={`px-2 py-0.5 rounded border font-mono text-xs font-bold ${color}`}>
      {score}
    </div>
  );
}

export function EntitiesMobile() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 font-sans flex flex-col mx-auto max-w-[390px] border-x border-[#2A3045] relative overflow-hidden">
      
      {/* Header */}
      <div className="px-3 pt-4 pb-2 sticky top-0 bg-[#0B0F19]/90 backdrop-blur-md z-10">
        <div className="flex justify-between items-center gap-2">
          <div 
            className={`flex items-center bg-[#141824] border border-[#2A3045] rounded-full transition-all duration-300 ease-in-out ${
              isSearchFocused || searchValue ? 'flex-1 px-3 py-2' : 'w-10 h-10 justify-center cursor-pointer hover:bg-[#2A3045]/50'
            }`}
            onClick={() => !isSearchFocused && setIsSearchFocused(true)}
          >
             <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
             {(isSearchFocused || searchValue) && (
               <input 
                 className="ml-2 bg-transparent outline-none text-sm text-slate-200 w-full font-mono placeholder:text-slate-500" 
                 autoFocus={isSearchFocused} 
                 value={searchValue}
                 onChange={(e) => setSearchValue(e.target.value)}
                 onBlur={() => !searchValue && setIsSearchFocused(false)} 
                 placeholder="Search entities..." 
               />
             )}
          </div>
          
          {(!isSearchFocused && !searchValue) && (
            <div className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest flex-1 text-center">
              Ledger
            </div>
          )}
          
          <button className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-[#141824] border border-[#2A3045] rounded-full text-slate-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-3 py-2 flex flex-col gap-3 pb-8">
        {MOCK_ENTITIES.map(entity => (
          <div 
            key={entity.id} 
            className="bg-[#141824] border border-[#2A3045] rounded-xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                {entity.isHot && (
                  <div className="flex items-center gap-1 text-amber-500 mb-1.5">
                    <ShieldAlert className="w-3 h-3" />
                    <span className="text-[9px] uppercase font-bold tracking-wider">Hot Lead</span>
                  </div>
                )}
                <h3 className="text-sm font-bold text-slate-100 leading-tight truncate">{entity.name}</h3>
                <div className="text-[11px] text-slate-400 mt-1 truncate">{entity.location}</div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0 gap-2">
                 <ScoreBadge score={entity.bayesianScore} />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#2A3045]/50">
               <TypeBadge type={entity.type} />
               <div className="flex items-center gap-3 text-slate-500">
                  {entity.contact.includes('email') && <Mail className="w-3.5 h-3.5" />}
                  {entity.contact.includes('phone') && <Phone className="w-3.5 h-3.5" />}
                  {entity.contact.includes('linkedin') && <Linkedin className="w-3.5 h-3.5" />}
                  <div className="w-px h-3 bg-[#2A3045] mx-1"></div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
               </div>
            </div>
          </div>
        ))}
        
        <div className="text-center mt-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">End of results</p>
        </div>
      </div>
      
    </div>
  );
}
