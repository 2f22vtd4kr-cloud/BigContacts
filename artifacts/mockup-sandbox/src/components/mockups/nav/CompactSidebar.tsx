import React from 'react';
import { Crosshair, Activity, Network, FileTerminal, KanbanSquare, Database, ShieldAlert, X, BookOpen, Menu, BrainCircuit, Bot, Radio, Copy, Telescope } from 'lucide-react';

export default function CompactSidebar() {
  const groups = [
    {
      label: "INTEL",
      bgClass: "bg-[#10B981]/[0.03]",
      borderClass: "border-[#10B981]/10",
      textClass: "text-[#10B981]",
      mutedClass: "text-[#10B981]/60",
      activeBg: "bg-[#10B981]/10",
      items: [
        { name: "Intelligence HQ", icon: Activity, active: true },
        { name: "Deep Search", icon: BrainCircuit, active: false },
        { name: "Network Graph", icon: Network, active: false },
        { name: "Intel Terminal", icon: FileTerminal, active: false },
      ]
    },
    {
      label: "OPS",
      bgClass: "bg-[#3B82F6]/[0.03]",
      borderClass: "border-[#3B82F6]/10",
      textClass: "text-[#3B82F6]",
      mutedClass: "text-[#3B82F6]/60",
      activeBg: "bg-[#3B82F6]/10",
      items: [
        { name: "Pipeline CRM", icon: KanbanSquare, active: false },
        { name: "Entity Ledger", icon: Database, active: false },
        { name: "Duplicates", icon: Copy, active: false },
      ]
    },
    {
      label: "SYSTEM",
      bgClass: "bg-[#8B5CF6]/[0.03]",
      borderClass: "border-[#8B5CF6]/10",
      textClass: "text-[#8B5CF6]",
      mutedClass: "text-[#8B5CF6]/60",
      activeBg: "bg-[#8B5CF6]/10",
      items: [
        { name: "Data Sources", icon: Radio, active: false },
        { name: "OSINT Tools", icon: Telescope, active: false },
        { name: "Persona Loop", icon: Bot, active: false },
        { name: "Field Manual", icon: BookOpen, active: false },
      ]
    }
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

       <div className="absolute inset-0 z-50 flex">
         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
         <div className="relative z-10 flex h-full">
            <aside className="flex flex-col bg-[#0B1220] border-r border-[#1E293B] w-[260px] h-full shadow-2xl">
              <div className="h-14 flex items-center px-4 border-b border-[#1E293B]">
                <Crosshair className="h-4 w-4 text-[#10B981] mr-3 flex-shrink-0" />
                <h1 className="text-[13px] font-bold tracking-widest text-[#10B981] uppercase leading-tight">ApexFinder Pro</h1>
                <X className="h-4 w-4 ml-auto text-slate-400" />
              </div>
              <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-4">
                {groups.map((group, gIdx) => (
                  <div key={gIdx} className={`rounded-md border ${group.borderClass} ${group.bgClass} overflow-hidden`}>
                    <div className={`px-3 py-2 text-[9px] font-bold ${group.mutedClass} uppercase tracking-widest border-b ${group.borderClass}`}>
                      {group.label}
                    </div>
                    <div className="px-1.5 py-1.5 space-y-0.5">
                      {group.items.map((item, idx) => (
                        <div key={idx} className={`flex items-center px-2 py-1.5 text-xs font-medium rounded transition-colors ${item.active ? `${group.activeBg} ${group.textClass}` : 'text-slate-400 hover:text-slate-200'}`}>
                          <item.icon className={`h-3.5 w-3.5 mr-2.5 flex-shrink-0 ${item.active ? group.textClass : 'text-slate-400'}`} />
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="p-3 border-t border-[#1E293B]">
                <div className="px-2 py-1 text-[10px] text-slate-500/40 uppercase tracking-widest">v0.2 · Private Build</div>
              </div>
            </aside>
         </div>
       </div>
    </div>
  );
}
