import React from "react";
import { 
  Filter, 
  Download, 
  Search, 
  Home, 
  Users, 
  Share2, // Using Share2 as Graph
  MoreHorizontal,
  ChevronRight
} from "lucide-react";

export default function Ledger() {
  const entities = [
    {
      id: 1,
      name: "James Whitmore",
      type: "HNWI",
      country: "US",
      flag: "🇺🇸",
      access: "A",
      netWorth: "$12.4M",
      typeColor: "bg-[#10B981]"
    },
    {
      id: 2,
      name: "Victoria Chen",
      type: "Corporation",
      country: "HK",
      flag: "🇭🇰",
      access: "B+",
      netWorth: "—",
      typeColor: "bg-[#3B82F6]"
    },
    {
      id: 3,
      name: "Sheikh H. Al-Rashid",
      type: "HNWI",
      country: "AE",
      flag: "🇦🇪",
      access: "B",
      netWorth: "$89M",
      typeColor: "bg-[#10B981]"
    },
    {
      id: 4,
      name: "Nordvik AS",
      type: "Corporation",
      country: "NO",
      flag: "🇳🇴",
      access: "C",
      netWorth: "—",
      typeColor: "bg-[#3B82F6]"
    },
    {
      id: 5,
      name: "Cedar Ridge Trust",
      type: "Trust",
      country: "KY",
      flag: "🇰🇾",
      access: "C+",
      netWorth: "—",
      typeColor: "bg-[#A855F7]"
    },
    {
      id: 6,
      name: "Dr. Elena Vasquez",
      type: "Gatekeeper",
      country: "ES",
      flag: "🇪🇸",
      access: "A-",
      netWorth: "—",
      typeColor: "bg-[#F59E0B]"
    },
    {
      id: 7,
      name: "Pacific Eagle Ltd",
      type: "Corporation",
      country: "SG",
      flag: "🇸🇬",
      access: "B-",
      netWorth: "—",
      typeColor: "bg-[#3B82F6]"
    },
    {
      id: 8,
      name: "Lord R. Ashworth",
      type: "HNWI",
      country: "GB",
      flag: "🇬🇧",
      access: "A",
      netWorth: "$34M",
      typeColor: "bg-[#10B981]"
    }
  ];

  const getAccessColor = (access: string) => {
    if (access.startsWith('A')) return 'text-[#10B981]';
    if (access.startsWith('B')) return 'text-[#3B82F6]';
    if (access.startsWith('C')) return 'text-[#F59E0B]';
    return 'text-[#64748B]';
  };

  return (
    <div className="dark">
      <div 
        className="min-h-screen bg-[#0B0F19] text-[#F1F5F9] mx-auto relative pb-[80px]"
        style={{ width: "390px", fontFamily: "Inter, sans-serif" }}
      >
        {/* Header bar (56px) */}
        <div className="h-[56px] px-4 flex items-center justify-between border-b border-[#2A3045] bg-[#0B0F19] sticky top-0 z-10">
          <div className="text-[17px] font-semibold tracking-tight">Entity Ledger</div>
          <div className="flex items-center gap-4 text-[#64748B]">
            <button className="p-1 hover:text-[#F1F5F9] transition-colors"><Filter size={20} /></button>
            <button className="p-1 hover:text-[#F1F5F9] transition-colors"><Download size={20} /></button>
          </div>
        </div>

        {/* Search bar (44px) */}
        <div className="px-4 py-3 bg-[#0B0F19]">
          <div className="h-[44px] w-full bg-[#141824] border border-[#2A3045] rounded-[6px] flex items-center px-3 text-[#64748B]">
            <Search size={18} className="mr-2" />
            <input 
              type="text" 
              placeholder="Search names, registries…" 
              className="bg-transparent border-none outline-none w-full text-[15px] text-[#F1F5F9] placeholder:text-[#64748B]"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide flex-nowrap whitespace-nowrap">
          <button className="h-[32px] px-3 bg-[#022C22] border border-[#065F46] text-[#34D399] rounded-[4px] text-[12px] font-mono shrink-0">
            All (247)
          </button>
          <button className="h-[32px] px-3 bg-[#141824] border border-[#2A3045] text-[#64748B] rounded-[4px] text-[12px] font-mono shrink-0">
            HNWI
          </button>
          <button className="h-[32px] px-3 bg-[#141824] border border-[#2A3045] text-[#64748B] rounded-[4px] text-[12px] font-mono shrink-0">
            Corp
          </button>
          <button className="h-[32px] px-3 bg-[#141824] border border-[#2A3045] text-[#64748B] rounded-[4px] text-[12px] font-mono shrink-0">
            Trust
          </button>
          <button className="h-[32px] px-3 bg-[#141824] border border-[#2A3045] text-[#64748B] rounded-[4px] text-[12px] font-mono shrink-0">
            Gatekeeper
          </button>
          <button className="h-[32px] px-3 bg-[#141824] border border-[#2A3045] text-[#64748B] rounded-[4px] text-[12px] font-mono shrink-0 flex items-center gap-1">
            <span>🔥</span> Hot
          </button>
        </div>

        {/* Sort/count row */}
        <div className="h-[32px] px-4 flex items-center justify-between border-b border-[#2A3045]">
          <span className="text-[#64748B] text-[11px] font-mono">247 profiles</span>
          <button className="text-[#64748B] text-[11px] font-mono flex items-center hover:text-[#F1F5F9]">
            Sort: Access ↓
          </button>
        </div>

        {/* Entity list */}
        <div className="divide-y divide-[#2A3045]">
          {entities.map((entity) => (
            <div key={entity.id} className="h-[64px] px-4 flex items-center active:bg-[#141824] cursor-pointer transition-colors">
              {/* Left: Avatar */}
              <div className={`w-[36px] h-[36px] rounded-full flex items-center justify-center ${entity.typeColor} text-white font-bold text-[14px]`}>
                {entity.name.charAt(0)}
              </div>
              
              {/* Middle: Info */}
              <div className="flex-1 ml-3 min-w-0">
                <div className="font-semibold text-[14px] text-[#F1F5F9] truncate">
                  {entity.name}
                </div>
                <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1 mt-0.5 truncate">
                  {entity.type} <span className="opacity-50">•</span> {entity.flag} {entity.country}
                </div>
              </div>

              {/* Right column: Access/NW */}
              <div className="flex flex-col items-end mr-3">
                <div className={`text-[12px] font-mono font-bold ${getAccessColor(entity.access)}`}>
                  {entity.access}
                </div>
                <div className="text-[10px] font-mono text-[#64748B] flex items-center gap-0.5 mt-0.5">
                  {entity.netWorth !== "—" && "↗ "}
                  {entity.netWorth}
                </div>
              </div>

              {/* Far right: Chevron */}
              <ChevronRight size={16} className="text-[#64748B]" />
            </div>
          ))}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 w-[390px] h-[80px] bg-[#0B0F19]/95 backdrop-blur-md border-t border-[#2A3045] flex items-center justify-around px-2 pb-5 pt-3 z-50">
          <button className="flex flex-col items-center gap-1 text-[#64748B] hover:text-[#F1F5F9]">
            <Home size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-[#64748B] hover:text-[#F1F5F9]">
            <Search size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-[#10B981]">
            <Users size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-medium">Profiles</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-[#64748B] hover:text-[#F1F5F9]">
            <Share2 size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Graph</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-[#64748B] hover:text-[#F1F5F9]">
            <MoreHorizontal size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>

      </div>
      
      {/* Hide scrollbar styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
