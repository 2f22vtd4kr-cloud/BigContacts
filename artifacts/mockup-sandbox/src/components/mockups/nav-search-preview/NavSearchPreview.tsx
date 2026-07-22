import React from 'react';
import {
  Crosshair, Activity, Network, FileTerminal,
  KanbanSquare, Database, Bot, Copy, Telescope,
  Radio, BookOpen, Search, Zap, Globe, Loader2, CheckCircle2,
  Cpu, Microscope, ShieldCheck, Clock, SlidersHorizontal, Menu, ShieldAlert,
} from 'lucide-react';

export default function NavSearchPreview() {
  return (
    <div className="w-full h-full min-h-[760px] bg-[#0B0F19] text-[#E2E8F0] font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* --- DESKTOP PREVIEW PORTION (Left side) --- */}
      <div className="hidden xl:flex flex-1 flex-col md:flex-row border-r border-[#2A3045] min-w-0">
        
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 h-full flex flex-col bg-[#141824] border-r border-[#2A3045]">
          <div className="h-16 flex items-center px-5 border-b border-[#2A3045] shrink-0">
            <Crosshair className="h-5 w-5 text-[#10B981] mr-3 shrink-0" />
            <h1 className="text-lg font-bold tracking-widest text-[#10B981] uppercase font-mono leading-tight truncate">
              ApexFinder Pro
            </h1>
          </div>
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <Activity className="w-4 h-4 shrink-0" /> <span className="truncate">Intelligence HQ</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium bg-[#10B981]/10 text-[#10B981] border-l-2 border-[#10B981] rounded-r-md gap-2.5 cursor-pointer">
              <Cpu className="w-4 h-4 shrink-0" /> <span className="truncate">Deep Search</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <Network className="w-4 h-4 shrink-0" /> <span className="truncate">Network Graph</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <FileTerminal className="w-4 h-4 shrink-0" /> <span className="truncate">Intel Terminal</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <KanbanSquare className="w-4 h-4 shrink-0" /> <span className="truncate">Pipeline CRM</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <Database className="w-4 h-4 shrink-0" /> <span className="truncate">Entity Ledger</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <Bot className="w-4 h-4 shrink-0" /> <span className="truncate">Persona Loop</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <Copy className="w-4 h-4 shrink-0" /> <span className="truncate">Duplicates</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <Radio className="w-4 h-4 shrink-0" /> <span className="truncate">Data Sources</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <Telescope className="w-4 h-4 shrink-0" /> <span className="truncate">OSINT Tools</span>
            </div>
            <div className="flex items-center px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#1E2332] hover:text-[#E2E8F0] rounded-r-md border-l-2 border-transparent gap-2.5 cursor-pointer">
              <BookOpen className="w-4 h-4 shrink-0" /> <span className="truncate">Field Manual</span>
            </div>
          </nav>
          <div className="p-4 border-t border-[#2A3045] shrink-0">
            <div className="px-3 py-2 text-xs font-mono text-[#64748B]/40 uppercase tracking-widest">
              v0.2 · Private Build
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-shrink-0 border-b border-[#2A3045] bg-[#141824]/50 px-6 py-4">
            <div className="flex items-center gap-3 mb-1">
              <Network className="w-5 h-5 text-[#10B981]" />
              <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-[#10B981]">
                Intelligent Deep Search
              </h1>
              <span className="text-xs font-mono text-[#64748B] ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" /> 140ms total
              </span>
            </div>
            <p className="text-xs font-mono text-[#64748B] mb-4">
              BM25 · TF-IDF cosine · Graph/Bayesian · RRF fusion · Planner → Retriever → Analyst → Critic
            </p>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                <input
                  defaultValue="US private jet owners in Texas"
                  className="w-full bg-[#0B0F19] border border-[#2A3045] rounded-lg pl-10 pr-4 py-2.5 text-sm font-mono text-[#E2E8F0] focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <button className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition-all bg-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
                <Zap className="w-4 h-4" /> Search
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs uppercase tracking-wider transition-all border-[#2A3045] text-[#64748B]">
                <SlidersHorizontal className="w-3 h-3" /> Filters
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden bg-[#0B0F19]">
            {/* Pipeline Panel */}
            <div className="w-80 border-r border-[#2A3045] p-5 overflow-y-auto space-y-3 shrink-0">
              <div className="text-xs font-mono text-[#64748B] uppercase tracking-widest mb-4">
                Agent Pipeline
              </div>
              <div className="border border-[#10B981]/30 bg-[#10B981]/5 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[#10B981]/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider truncate text-[#10B981]">
                      Planner
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#64748B] flex items-center gap-1 shrink-0"><Clock className="w-3 h-3"/>12ms</span>
                </div>
                <p className="text-xs text-[#64748B] font-mono mb-2 leading-relaxed">
                  Extracted asset/geo/name filters. Strategy: exact_match.
                </p>
              </div>
              
              <div className="border border-[#10B981]/50 bg-[#10B981]/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[#10B981]/20">
                      <Loader2 className="w-3.5 h-3.5 text-[#10B981] animate-spin" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider truncate text-[#10B981]">
                      Retriever
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#64748B] font-mono leading-relaxed">
                  Expanding query terms...
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="space-y-3">
                <div className="border border-[#2A3045] bg-[#141824]/30 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 w-1/2">
                      <div className="w-6 h-4 bg-[#1E2332] rounded shrink-0"></div>
                      <div className="h-4 bg-[#1E2332] rounded w-full max-w-[200px]"></div>
                    </div>
                    <div className="w-10 h-5 bg-[#1E2332] rounded shrink-0"></div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <div className="w-16 h-3 bg-[#1E2332] rounded"></div>
                    <div className="w-20 h-3 bg-[#1E2332] rounded"></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="w-full h-1.5 bg-[#1E2332] rounded-full"></div>
                    <div className="w-full h-1.5 bg-[#1E2332] rounded-full"></div>
                    <div className="w-full h-1.5 bg-[#1E2332] rounded-full"></div>
                  </div>
                  <div className="w-32 h-3 bg-[#1E2332] rounded mt-2"></div>
                </div>
                <div className="border border-[#2A3045] bg-[#141824]/30 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 w-1/2">
                      <div className="w-6 h-4 bg-[#1E2332] rounded shrink-0"></div>
                      <div className="h-4 bg-[#1E2332] rounded w-full max-w-[180px]"></div>
                    </div>
                    <div className="w-10 h-5 bg-[#1E2332] rounded shrink-0"></div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <div className="w-16 h-3 bg-[#1E2332] rounded"></div>
                    <div className="w-12 h-3 bg-[#1E2332] rounded"></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="w-full h-1.5 bg-[#1E2332] rounded-full"></div>
                    <div className="w-full h-1.5 bg-[#1E2332] rounded-full"></div>
                  </div>
                  <div className="w-24 h-3 bg-[#1E2332] rounded mt-2"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* --- MOBILE PREVIEW PORTION (Right side, 390px width fixed) --- */}
      <div className="w-[390px] h-full border-l-[8px] border-[#2A3045] flex flex-col shrink-0 bg-[#0B0F19] relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
        }} />

        {/* Mobile Header */}
        <div className="flex items-center h-12 px-4 border-b border-[#2A3045] bg-[#141824] shrink-0 z-10">
          <Menu className="h-5 w-5 text-[#64748B] mr-3 shrink-0" />
          <Crosshair className="h-4 w-4 text-[#10B981] mr-2 shrink-0" />
          <span className="text-sm font-bold tracking-widest text-[#10B981] uppercase font-mono truncate">
            ApexFinder Pro
          </span>
        </div>
        
        {/* Mobile Banner */}
        <div className="bg-[#451A03]/40 border-b border-[#B45309]/25 px-3 py-2 flex items-start gap-2 shrink-0 z-10">
          <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
          <span className="text-xs font-mono text-[#FBBF24]/80 leading-snug">
            <span className="text-[#F59E0B] font-bold">COMPLIANCE NOTICE:</span>{" "}
            For professional networking and public-data research only. All data sourced...
          </span>
        </div>

        {/* Mobile Deep Search Header */}
        <div className="border-b border-[#2A3045] bg-[#141824]/50 px-4 py-4 shrink-0 z-10">
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-4 h-4 text-[#10B981]" />
            <h1 className="text-xs font-mono font-bold uppercase tracking-widest text-[#10B981]">
              Intelligent Deep Search
            </h1>
          </div>
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
              <input
                defaultValue="SEC EDGAR large shareholders"
                className="w-full bg-[#0B0F19] border border-[#2A3045] rounded-lg pl-9 pr-3 py-2 text-sm font-mono text-[#E2E8F0] focus:outline-none"
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider font-bold bg-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Zap className="w-4 h-4" /> Search
            </button>
          </div>
          
          <div className="mt-3 p-3 bg-[#0B0F19] border border-[#2A3045] rounded-lg space-y-3">
            <div>
              <div className="text-xs font-mono text-[#64748B] uppercase tracking-widest mb-2">Sources</div>
              <div className="flex flex-wrap gap-2">
                <button className="px-2 py-1 rounded border text-xs font-mono font-bold uppercase border-[#2A3045] text-[#64748B]">
                  FAA Registry
                </button>
                <button className="px-2 py-1 rounded border text-xs font-mono font-bold uppercase bg-[#3B82F6]/20 border-[#3B82F6] text-[#60A5FA]">
                  SEC EDGAR
                </button>
                <button className="px-2 py-1 rounded border text-xs font-mono font-bold uppercase border-[#2A3045] text-[#64748B]">
                  Companies House
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10">
          <div className="border border-[#F59E0B]/30 bg-[#F59E0B]/5 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <span className="text-xs font-mono text-[#64748B] shrink-0">#1</span>
                  <Zap className="w-3 h-3 text-[#F59E0B] shrink-0" />
                  <h3 className="font-bold text-sm text-[#E2E8F0] truncate">Johnathan D. Carter</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-mono text-[#64748B]">
                    <Globe className="w-3 h-3" />United States
                  </span>
                  <span className="flex items-center gap-1 text-xs font-mono text-[#64748B]">
                    <Database className="w-3 h-3" />3 assets
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="text-xs font-mono font-bold rounded px-2 py-0.5 text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20">
                  92
                </div>
                <span className="text-xs font-mono rounded border px-1.5 py-0.5 shrink-0 text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10">
                  high
                </span>
              </div>
            </div>
            
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#64748B] w-16 shrink-0">BM25</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#1E2332]"><div className="h-full bg-[#3B82F6] rounded-full w-[85%]"></div></div>
                <span className="text-xs font-mono text-[#64748B] w-8 text-right">85%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#64748B] w-16 shrink-0">Semantic</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#1E2332]"><div className="h-full bg-[#8B5CF6] rounded-full w-[94%]"></div></div>
                <span className="text-xs font-mono text-[#64748B] w-8 text-right">94%</span>
              </div>
              <button className="text-xs font-mono text-[#10B981] hover:underline mt-1">
                + Show 3 more signals
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
