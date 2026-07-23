import React from "react";
import {
  ArrowLeft,
  Search as SearchIcon,
  Cpu,
  Network,
  Microscope,
  ShieldCheck,
  Home,
  Users,
  Share2,
  Menu,
  X,
  Crosshair,
  ChevronDown
} from "lucide-react";

export default function Search() {
  return (
    <div className="dark">
      <div
        className="min-h-screen bg-[#0B0F19] text-[#F1F5F9] font-sans relative pb-20"
        style={{ width: "390px", margin: "0 auto", border: "1px solid #2A3045" }}
      >
        {/* Header bar */}
        <header className="h-[56px] flex items-center justify-between px-4 border-b border-[#2A3045] bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-10">
          <button className="h-11 w-11 flex items-center justify-center -ml-3 text-[#64748B]">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight">Deep Search</h1>
          <div className="h-11 w-11" /> {/* Spacer for centering */}
        </header>

        {/* Search Bar */}
        <div className="px-4 mt-3">
          <div className="h-[52px] w-full bg-[#141824] border border-[#2A3045] rounded-[4px] flex items-center px-4 shadow-sm focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981] transition-all">
            <SearchIcon size={20} className="text-[#10B981] shrink-0" />
            <input
              type="text"
              placeholder="Search intelligence…"
              className="bg-transparent border-none outline-none flex-1 ml-3 text-[16px] text-[#F1F5F9] placeholder:text-[#64748B]"
            />
            <div className="shrink-0 flex items-center justify-center bg-[#0B0F19] border border-[#2A3045] rounded px-1.5 h-6 ml-2">
              <span className="text-[11px] font-mono text-[#64748B]">⌘K</span>
            </div>
          </div>
        </div>

        {/* Example Queries */}
        <div className="mt-3 w-full overflow-x-auto scrollbar-hide flex gap-2 px-4 pb-1">
          {["Jet owners Texas", "UK company directors", "Aviation Norway", "SEC shareholders"].map((q, i) => (
            <button
              key={i}
              className="shrink-0 h-8 flex items-center justify-center bg-[#141824] border border-[#2A3045] rounded-full px-3 text-[12px] font-mono text-[#64748B] hover:text-[#F1F5F9] hover:border-[#F1F5F9] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Pipeline Status */}
        <div className="px-4 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-[#141824] border border-[#2A3045] rounded-[4px] flex items-center px-3 gap-2">
              <Cpu size={14} className="text-[#64748B]" />
              <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex-1">Planner</span>
              <span className="text-[9px] font-mono text-[#64748B]/60">READY</span>
            </div>
            <div className="h-12 bg-[#141824] border border-[#2A3045] rounded-[4px] flex items-center px-3 gap-2">
              <Network size={14} className="text-[#64748B]" />
              <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex-1">Retriever</span>
              <span className="text-[9px] font-mono text-[#64748B]/60">READY</span>
            </div>
            <div className="h-12 bg-[#141824] border border-[#2A3045] rounded-[4px] flex items-center px-3 gap-2">
              <Microscope size={14} className="text-[#64748B]" />
              <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex-1">Analyst</span>
              <span className="text-[9px] font-mono text-[#64748B]/60">READY</span>
            </div>
            <div className="h-12 bg-[#141824] border border-[#2A3045] rounded-[4px] flex items-center px-3 gap-2">
              <ShieldCheck size={14} className="text-[#64748B]" />
              <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex-1">Critic</span>
              <span className="text-[9px] font-mono text-[#64748B]/60">READY</span>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="mt-6 mb-4 px-4 flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#64748B]">4 results · 1.2s</span>
          <span className="text-[9px] font-mono text-[#64748B]/60">BM25 + Semantic + Graph</span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Result 1 */}
          <div className="mx-4 bg-[#141824] border border-[#2A3045] rounded-[4px] p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#10B981]">#1</span>
              <div className="bg-[#10B981]/10 border border-[#10B981]/20 px-1.5 py-0.5 rounded flex items-center">
                <span className="text-[9px] font-mono text-[#10B981] font-medium tracking-wide">HIGH</span>
              </div>
            </div>
            <h3 className="text-[15px] font-semibold text-[#F1F5F9]">James Whitmore</h3>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">BM25</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] w-[85%] rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">SEMANTIC</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6] w-[92%] rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">GRAPH</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#A855F7] w-[78%] rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] italic leading-relaxed">
              "Aviation registry match · Texas residency · High asset count"
            </p>

            <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#2A3045]/50">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span className="text-[10px] font-mono text-[#F1F5F9]">HNWI</span>
              </div>
              <button className="text-[11px] font-medium text-[#10B981] flex items-center hover:underline">
                View Profile →
              </button>
            </div>
          </div>

          {/* Result 2 */}
          <div className="mx-4 bg-[#141824] border border-[#2A3045] rounded-[4px] p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#F59E0B]">#2</span>
              <div className="bg-[#10B981]/10 border border-[#10B981]/20 px-1.5 py-0.5 rounded flex items-center">
                <span className="text-[9px] font-mono text-[#10B981] font-medium tracking-wide">HIGH</span>
              </div>
            </div>
            <h3 className="text-[15px] font-semibold text-[#F1F5F9]">Whitmore Aviation Holdings LLC</h3>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">BM25</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] w-[95%] rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">SEMANTIC</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6] w-[64%] rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">GRAPH</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#A855F7] w-[88%] rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] italic leading-relaxed">
              "Registered to J. Whitmore · Shared address with Texas properties"
            </p>

            <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#2A3045]/50">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                <span className="text-[10px] font-mono text-[#F1F5F9]">CORPORATION</span>
              </div>
              <button className="text-[11px] font-medium text-[#10B981] flex items-center hover:underline">
                View Profile →
              </button>
            </div>
          </div>

          {/* Result 3 */}
          <div className="mx-4 bg-[#141824] border border-[#2A3045] rounded-[4px] p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#64748B]">#3</span>
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-1.5 py-0.5 rounded flex items-center">
                <span className="text-[9px] font-mono text-[#F59E0B] font-medium tracking-wide">MED</span>
              </div>
            </div>
            <h3 className="text-[15px] font-semibold text-[#F1F5F9]">Victoria Chen</h3>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">BM25</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] w-[30%] rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">SEMANTIC</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6] w-[81%] rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748B] w-12 shrink-0">GRAPH</span>
                <div className="h-1 flex-1 bg-[#0B0F19] rounded-full overflow-hidden">
                  <div className="h-full bg-[#A855F7] w-[45%] rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] italic leading-relaxed">
              "Co-director on Whitmore Aviation Holdings · Legal representation"
            </p>

            <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#2A3045]/50">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                <span className="text-[10px] font-mono text-[#F1F5F9]">GATEKEEPER</span>
              </div>
              <button className="text-[11px] font-medium text-[#10B981] flex items-center hover:underline">
                View Profile →
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 w-[390px] h-[64px] bg-[#141824] border-t border-[#2A3045] flex items-center justify-around px-2 z-20 pb-safe">
          <button className="flex flex-col items-center justify-center w-[60px] h-full gap-1 text-[#64748B] hover:text-[#F1F5F9] transition-colors">
            <Home size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center justify-center w-[60px] h-full gap-1 text-[#10B981]">
            <SearchIcon size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button className="flex flex-col items-center justify-center w-[60px] h-full gap-1 text-[#64748B] hover:text-[#F1F5F9] transition-colors">
            <Users size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">Profiles</span>
          </button>
          <button className="flex flex-col items-center justify-center w-[60px] h-full gap-1 text-[#64748B] hover:text-[#F1F5F9] transition-colors">
            <Share2 size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">Graph</span>
          </button>
          <button className="flex flex-col items-center justify-center w-[60px] h-full gap-1 text-[#64748B] hover:text-[#F1F5F9] transition-colors">
            <Menu size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
        
        {/* Style for hiding scrollbar cleanly */}
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
    </div>
  );
}

export function SearchNavDrawer() {
  return (
    <div className="dark">
      <div
        className="min-h-screen bg-[#0B0F19] text-[#F1F5F9] font-sans relative"
        style={{ width: "390px", margin: "0 auto", border: "1px solid #2A3045" }}
      >
        <div className="w-[288px] h-full min-h-screen bg-[#141824] border-r border-[#2A3045] flex flex-col shadow-2xl relative z-30">
          {/* Header */}
          <div className="h-[56px] flex items-center justify-between px-5 border-b border-[#2A3045]">
            <div className="flex items-center gap-2">
              <Crosshair size={16} className="text-[#10B981]" strokeWidth={2.5} />
              <span className="text-[13px] font-mono font-bold tracking-widest text-[#F1F5F9]">
                APEX ATLAS
              </span>
            </div>
            <button className="h-10 w-10 flex items-center justify-end text-[#64748B] hover:text-[#F1F5F9] transition-colors">
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Nav Items - Main */}
          <div className="flex-1 py-4 flex flex-col">
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              Home
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#10B981] bg-[#10B981]/5 border-l-[3px] border-[#10B981]">
              Search
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              Profiles
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              Network
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              Intel Terminal
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              CRM
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              Outreach
            </button>

            {/* Nav Items - Tools */}
            <div className="mt-6 mb-2 px-5 flex items-center justify-between group cursor-pointer">
              <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider">
                Tools
              </span>
              <ChevronDown size={14} className="text-[#64748B]" />
            </div>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              Data Sources
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              Background Jobs
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              OSINT Tools
            </button>
            <button className="h-[48px] px-5 flex items-center justify-start text-[15px] font-medium text-[#F1F5F9]/80 hover:bg-[#2A3045]/30 hover:text-[#F1F5F9] transition-all">
              Field Manual
            </button>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#2A3045] flex items-center justify-between">
            <span className="text-[9px] font-mono text-[#64748B]">Phase G · v0.3</span>
            <div className="bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-1 rounded text-[9px] font-mono text-[#10B981]">
              OSINT use only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
