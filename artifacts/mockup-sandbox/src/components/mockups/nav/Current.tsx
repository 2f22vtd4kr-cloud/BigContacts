import React from 'react';
import { Crosshair, Activity, Network, FileTerminal, KanbanSquare, Database, ShieldAlert, X, BookOpen, Menu, BrainCircuit, Bot, Radio, Copy, Telescope } from 'lucide-react';

export default function Current() {
  const navItems = [
    { name: "Intelligence HQ", icon: Activity, active: true },
    { name: "Deep Search", icon: BrainCircuit, active: false },
    { name: "Network Graph", icon: Network, active: false },
    { name: "Intel Terminal", icon: FileTerminal, active: false },
    { name: "Pipeline CRM", icon: KanbanSquare, active: false },
    { name: "Entity Ledger", icon: Database, active: false },
    { name: "Persona Loop", icon: Bot, active: false },
    { name: "Duplicates", icon: Copy, active: false },
    { name: "Data Sources", icon: Radio, active: false },
    { name: "OSINT Tools", icon: Telescope, active: false },
    { name: "Field Manual", icon: BookOpen, active: false },
  ];

  return (
    <div className="w-[390px] h-[844px] bg-[#050A14] text-slate-200 font-mono relative overflow-hidden flex flex-col">
       <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]" 
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
       />
       
       <div className="flex items-center h-14 px-4 border-b border-[#1E293B] bg-[#0B1220] flex-shrink-0 z-40">
          <Menu className="h-5 w-5 text-slate-400 mr-3" />
          <Crosshair className="h-4 w-4 text-[#10B981] mr-2" />
          <span className="text-sm font-bold tracking-widest text-[#10B981] uppercase">ApexFinder Pro</span>
       </div>

       <div className="flex-shrink-0 bg-amber-950/40 border-b border-amber-600/25 px-4 py-2 flex items-start justify-between z-30 gap-2">
          <div className="flex items-start gap-2 min-w-0">
             <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
             <span className="text-[11px] text-amber-400/80 leading-relaxed">
               <span className="text-amber-500 font-bold">COMPLIANCE NOTICE:</span> For professional networking and public-data research only. All data sourced exclusively from public registries and OSINT. Comply with GDPR, CCPA, and all applicable local privacy legislation.
             </span>
          </div>
          <X className="w-3.5 h-3.5 text-amber-600/60 mt-0.5 flex-shrink-0" />
       </div>

       <div className="absolute inset-0 z-50 flex">
         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
         <div className="relative z-10 flex h-full">
            <aside className="flex flex-col bg-[#0B1220] border-r border-[#1E293B] w-72 h-full">
              <div className="h-14 flex items-center px-5 border-b border-[#1E293B]">
                <Crosshair className="h-5 w-5 text-[#10B981] mr-3 flex-shrink-0" />
                <h1 className="text-base font-bold tracking-widest text-[#10B981] uppercase leading-tight">ApexFinder Pro</h1>
                <button className="ml-auto text-slate-400 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item, idx) => (
                  <div key={idx} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${item.active ? 'bg-[#10B981]/10 text-[#10B981]' : 'text-slate-400'}`}>
                    <item.icon className={`h-4 w-4 mr-3 flex-shrink-0 ${item.active ? 'text-[#10B981]' : 'text-slate-400'}`} />
                    {item.name}
                  </div>
                ))}
              </nav>
              <div className="p-4 border-t border-[#1E293B]">
                <div className="px-3 py-2 text-xs text-slate-500/40 uppercase tracking-widest">v0.2 · Private Build</div>
              </div>
            </aside>
         </div>
       </div>
    </div>
  );
}
