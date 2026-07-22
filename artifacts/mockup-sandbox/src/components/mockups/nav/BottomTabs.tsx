import React from 'react';
import { Crosshair, Activity, Network, FileTerminal, KanbanSquare, Database, X, BookOpen, BrainCircuit, Bot, Radio, Copy, Telescope, Grid3x3 } from 'lucide-react';

export default function BottomTabs() {
  const bottomTabs = [
    { name: "HQ", icon: Activity, active: false },
    { name: "Search", icon: BrainCircuit, active: false },
    { name: "Graph", icon: Network, active: false },
    { name: "Terminal", icon: FileTerminal, active: false },
    { name: "More", icon: Grid3x3, active: true },
  ];

  const moreItems = [
    { name: "Pipeline CRM", icon: KanbanSquare },
    { name: "Entity Ledger", icon: Database },
    { name: "Persona Loop", icon: Bot },
    { name: "Duplicates", icon: Copy },
    { name: "Data Sources", icon: Radio },
    { name: "OSINT Tools", icon: Telescope },
    { name: "Field Manual", icon: BookOpen },
  ];

  return (
    <div className="w-[390px] h-[844px] bg-[#050A14] text-slate-200 font-mono relative overflow-hidden flex flex-col">
       <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]" 
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
       />
       
       <div className="flex items-center h-14 px-4 border-b border-[#1E293B] bg-[#0B1220] flex-shrink-0 z-40">
          <Crosshair className="h-4 w-4 text-[#10B981] mr-3 flex-shrink-0" />
          <span className="text-sm font-bold tracking-widest text-[#10B981] uppercase flex-1 truncate">Intelligence HQ</span>
       </div>

       <div className="flex-1 bg-[#050A14] relative z-10 p-4">
         {/* Blank background content */}
       </div>

       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40" />

       <div className="absolute bottom-[76px] left-0 right-0 bg-[#0B1220] border-t border-[#1E293B] rounded-t-2xl z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
         <div className="w-full flex justify-center py-3">
           <div className="w-12 h-1 bg-[#1E293B] rounded-full" />
         </div>
         <div className="px-5 pb-8 pt-2">
           <h3 className="text-xs font-bold text-[#10B981] uppercase tracking-widest mb-4 flex items-center justify-between">
             <span>System Modules</span>
             <X className="h-4 w-4 text-slate-400" />
           </h3>
           <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
             {moreItems.map((item, idx) => (
               <div key={idx} className="flex flex-col items-center justify-center bg-[#050A14] border border-[#1E293B] rounded-xl p-4 text-center">
                 <item.icon className="h-6 w-6 text-slate-400 mb-3" />
                 <span className="text-[11px] text-slate-300 font-medium tracking-wide">{item.name}</span>
               </div>
             ))}
           </div>
         </div>
       </div>

       <div className="h-[76px] bg-[#0B1220] border-t border-[#1E293B] flex items-center justify-around px-2 flex-shrink-0 z-50 relative pb-4 pt-2">
         {bottomTabs.map((tab, idx) => (
           <div key={idx} className="flex flex-col items-center justify-center w-16 relative">
             {tab.active && (
               <div className="absolute -top-[9px] w-8 h-[2px] bg-[#10B981] rounded-b-sm shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
             )}
             <tab.icon className={`h-5 w-5 mb-1 ${tab.active ? 'text-[#10B981]' : 'text-slate-500'}`} />
             <span className={`text-[9px] tracking-wide ${tab.active ? 'text-[#10B981] font-bold' : 'text-slate-500 font-medium'}`}>
               {tab.name}
             </span>
           </div>
         ))}
       </div>
    </div>
  );
}
