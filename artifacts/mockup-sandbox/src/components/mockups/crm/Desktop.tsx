import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FileText, Copy, Printer, Target, Shield, ChevronRight,
  MessageSquare, Clock, Users, X
} from "lucide-react";

const STAGES = [
  "Lead Gen", "Identified", "Graph Mapped", "Research Path Found",
  "Pitch Generated", "Contacted", "Follow-Up", "Closed"
];

const STAGE_COLORS: Record<string, string> = {
  "Lead Gen": "#475569",
  "Identified": "#64748B",
  "Graph Mapped": "#3B82F6",
  "Research Path Found": "#A855F7",
  "Pitch Generated": "#F59E0B",
  "Contacted": "#10B981",
  "Follow-Up": "#F97316",
  "Closed": "#10B981",
};

const MOCK_DATA = [
  { id: 1, name: "Alexander Kensington", type: "UHNW", score: 92, date: "10/24", stage: "Lead Gen" },
  { id: 2, name: "Victoria Sterling", type: "Family Office", score: 88, date: "10/23", stage: "Identified" },
  { id: 3, name: "Richard Chen", type: "UHNW", score: 95, date: "10/22", stage: "Graph Mapped" },
  { id: 4, name: "Eleanor Rothschild", type: "Principal", score: 89, date: "10/21", stage: "Research Path Found" },
  { id: 5, name: "Marcus von Berg", type: "UHNW", score: 97, date: "10/20", stage: "Pitch Generated" },
  { id: 6, name: "Sophia al-Fayed", type: "Family Office", score: 91, date: "10/19", stage: "Contacted" },
];

export default function DesktopCRM() {
  const [selectedCard, setSelectedCard] = useState<number | null>(5);
  const [activePitchTab, setActivePitchTab] = useState("initial");

  const selectedData = MOCK_DATA.find(d => d.id === selectedCard);

  return (
    <div className="w-[1280px] h-[800px] bg-[#0A0A0A] text-slate-200 font-sans flex flex-col overflow-hidden border border-slate-800 rounded-lg shadow-2xl mx-auto my-4 relative">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-[#0F0F11] flex items-center px-6 shrink-0 justify-between">
        <h1 className="text-lg font-bold font-mono tracking-widest text-white uppercase">
          Pipeline CRM
        </h1>
        <span className="text-xs font-mono text-slate-500">6 entities</span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Kanban Board */}
        <div className="flex-1 flex overflow-x-auto p-6 gap-4 custom-scrollbar">
          {STAGES.map(stage => {
            const cards = MOCK_DATA.filter(c => c.stage === stage);
            const color = STAGE_COLORS[stage];
            return (
              <div key={stage} className="min-w-[160px] max-w-[200px] flex-shrink-0 flex flex-col max-h-[700px]">
                <div className="flex items-center gap-2 mb-4 shrink-0">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 truncate">
                    {stage}
                  </h3>
                  <span className="ml-auto text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                    {cards.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[400px]">
                  {cards.map(card => (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCard(card.id)}
                      className={cn(
                        "bg-[#151518] border border-slate-800 rounded p-3 cursor-pointer hover:border-slate-600 transition-colors relative overflow-hidden",
                        selectedCard === card.id && "border-blue-500/50 bg-blue-500/5"
                      )}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
                      <div className="font-medium text-sm text-slate-100 mb-2 truncate ml-2">
                        {card.name}
                      </div>
                      <div className="flex justify-between items-center ml-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {card.date}
                        </span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded font-mono font-bold",
                          card.score >= 90 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {card.score}
                        </span>
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="h-20 border border-dashed border-slate-800 rounded flex items-center justify-center text-xs text-slate-600 font-mono">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sliding Detail Panel */}
        <div
          className={cn(
            "w-[380px] bg-[#0F0F11] border-l border-slate-800 shrink-0 flex flex-col transition-transform duration-300 ease-in-out z-10",
            selectedCard ? "translate-x-0" : "translate-x-full absolute right-0 top-0 bottom-0"
          )}
        >
          {selectedData && (
            <>
              <div className="p-5 border-b border-slate-800 bg-[#151518] flex justify-between items-center shrink-0">
                <h2 className="font-bold text-sm font-mono tracking-wider flex items-center text-slate-200">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" />
                  Entity Intelligence
                </h2>
                <button onClick={() => setSelectedCard(null)} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {selectedData.name}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedData.type}
                    </span>
                    <span className="text-xs font-mono px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      SCORE: {selectedData.score}/100
                    </span>
                    <span className="text-xs font-mono px-2 py-1 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400" style={{ borderColor: STAGE_COLORS[selectedData.stage], color: STAGE_COLORS[selectedData.stage] }}>
                      {selectedData.stage.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    Research Path Summary
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-start p-3 rounded border border-blue-500/30 bg-blue-500/5 text-blue-400 text-xs font-mono">
                      <Target className="w-4 h-4 mr-3 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Target</div>
                        <div className="font-bold">Primary Foundation</div>
                      </div>
                    </div>
                    <div className="flex items-start p-3 rounded border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs font-mono">
                      <Shield className="w-4 h-4 mr-3 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Gatekeeper</div>
                        <div className="font-bold">Wealth Manager (UBS)</div>
                      </div>
                    </div>
                    <div className="flex items-start p-3 rounded border border-slate-700 bg-slate-800/50 text-slate-300 text-xs font-mono">
                      <ChevronRight className="w-4 h-4 mr-3 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Asset</div>
                        <div className="font-bold">Recent Philanthropic Trust</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
                    <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                      Outreach Pitch
                    </h4>
                    <div className="flex gap-2">
                      <button className="text-slate-400 hover:text-white p-1.5"><Copy className="w-4 h-4" /></button>
                      <button className="text-slate-400 hover:text-white p-1.5"><Printer className="w-4 h-4" /></button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1 mb-4">
                    {[
                      { id: "initial", label: "Initial", icon: MessageSquare },
                      { id: "followUp", label: "Follow-Up", icon: Clock },
                      { id: "intro", label: "Intro Script", icon: Users }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActivePitchTab(tab.id)}
                        className={cn(
                          "flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-colors",
                          activePitchTab === tab.id
                            ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                            : "border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                        )}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  <pre className="text-xs font-mono text-slate-300 bg-[#151518] p-4 rounded border border-slate-800 whitespace-pre-wrap leading-relaxed h-[240px] overflow-y-auto">
                    {activePitchTab === "initial" && `Subject: Private inquiry regarding recent trust structuring\n\nDear Marcus,\n\nI noted your recent adjustments to the philanthropic trust foundation via your UBS wealth management team. We specialize in cross-border structural compliance for European mandates.\n\nWould you be open to a brief review of the graph dependencies?`}
                    {activePitchTab === "followUp" && `Subject: Re: Private inquiry regarding recent trust structuring\n\nFollowing up on my previous note. We've mapped out the secondary asset exposures that might affect the trust's tax efficiency in Q4.\n\nLet me know if we should align with your gatekeeper first.`}
                    {activePitchTab === "intro" && `[For Intro via Gatekeeper]\n\nHello [Name],\n\nI'm reaching out to connect with Marcus regarding the recent trust setup. We have specific data mapped to his asset structure that needs review.\n\nPlease advise on the best window.`}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}
