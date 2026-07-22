import React from 'react';
import { 
  Activity, 
  BrainCircuit, 
  Network, 
  FileTerminal, 
  KanbanSquare, 
  Database, 
  Bot, 
  Copy, 
  Radio, 
  Telescope, 
  BookOpen, 
  Crosshair 
} from 'lucide-react';

export default function SidebarNav() {
  return (
    <div className="w-[280px] min-h-screen bg-[#070D1A] text-slate-300 flex flex-col font-sans border-r border-slate-800/50">
      <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
        <Crosshair className="w-5 h-5 text-[#10B981] mr-3" />
        <span className="font-mono text-sm tracking-[0.2em] font-bold text-slate-100 uppercase">
          ApexFinder Pro
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <NavGroup title="Intelligence">
          <NavItem icon={Activity} label="Intelligence HQ" active />
          <NavItem icon={BrainCircuit} label="Deep Search" />
          <NavItem icon={Network} label="Network Graph" />
        </NavGroup>

        <NavGroup title="Operations">
          <NavItem icon={FileTerminal} label="Intel Terminal" />
          <NavItem icon={KanbanSquare} label="Pipeline CRM" />
          <NavItem icon={Database} label="Entity Ledger" />
        </NavGroup>

        <NavGroup title="Analysis">
          <NavItem icon={Bot} label="Persona Loop" />
          <NavItem icon={Copy} label="Duplicates" />
        </NavGroup>

        <NavGroup title="Tools">
          <NavItem icon={Radio} label="Data Sources" />
          <NavItem icon={Telescope} label="OSINT Tools" />
          <NavItem icon={BookOpen} label="Field Manual" />
        </NavGroup>
      </div>

      <div className="p-4 border-t border-slate-800/50">
        <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest px-2">
          v0.2 · Private Build
        </div>
      </div>
    </div>
  );
}

function NavGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="px-2 text-[10px] font-mono font-bold text-slate-500/70 uppercase tracking-widest mb-3">
        {title}
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center px-2 py-2.5 rounded-md cursor-pointer transition-colors relative ${active ? 'bg-[#10B981]/10 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}>
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#10B981] rounded-r-md" />
      )}
      <Icon className={`w-4 h-4 mr-3 ${active ? 'text-[#10B981]' : 'text-slate-500'}`} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
