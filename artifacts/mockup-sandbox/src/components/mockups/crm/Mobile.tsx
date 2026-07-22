import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FileText, Copy, Printer, Target, Shield, ChevronRight,
  MessageSquare, Clock, Users, X, Plus
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
  { id: 5, name: "Marcus von Berg", type: "UHNW", score: 97, date: "10/20", stage: "Pitch Generated" },
  { id: 7, name: "Helena Rostova", type: "Family Office", score: 94, date: "10/18", stage: "Pitch Generated" },
];

export default function MobileCRM() {
  const [selectedStage, setSelectedStage] = useState("Pitch Generated");
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [activePitchTab, setActivePitchTab] = useState("initial");

  const selectedData = MOCK_DATA.find(d => d.id === selectedCard);
  const currentCards = MOCK_DATA.filter(c => c.stage === selectedStage);

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0A0A] text-slate-200 font-sans flex flex-col overflow-hidden border border-slate-800 rounded-[2rem] shadow-2xl mx-auto my-4 relative">
      {/* Top Header */}
      <div className="h-16 border-b border-slate-800 bg-[#0F0F11] flex items-center px-5 shrink-0 justify-between mt-6">
        <h1 className="text-base font-bold font-mono tracking-widest text-white uppercase">
          Pipeline CRM
        </h1>
      </div>

      {/* Stage Selector */}
      <div className="flex overflow-x-auto p-4 gap-2 border-b border-slate-800 bg-[#0A0A0A] shrink-0 no-scrollbar">
        {STAGES.map(stage => {
          const isSelected = selectedStage === stage;
          const color = STAGE_COLORS[stage];
          return (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wide whitespace-nowrap transition-all border",
                isSelected ? "border-transparent text-black" : "bg-transparent text-slate-400"
              )}
              style={{
                backgroundColor: isSelected ? color : "transparent",
                borderColor: isSelected ? color : "#1e293b",
              }}
            >
              {stage}
            </button>
          );
        })}
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentCards.length > 0 ? currentCards.map(card => {
          const color = STAGE_COLORS[card.stage];
          return (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card.id)}
              className="bg-[#151518] border border-slate-800 rounded-lg p-4 cursor-pointer relative overflow-hidden active:scale-[0.98] transition-transform"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
              <div className="flex justify-between items-start mb-3 ml-2">
                <div className="font-bold text-base text-slate-100 truncate pr-2">
                  {card.name}
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded font-mono font-bold shrink-0",
                  card.score >= 90 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                )}>
                  {card.score}
                </span>
              </div>
              <div className="flex justify-between items-center ml-2">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {card.date}
                </span>
                <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300">
                  {card.type}
                </span>
              </div>
            </div>
          )
        }) : (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-6">
            <div className="text-slate-500 text-sm font-mono">No leads in this stage.</div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button className="absolute bottom-8 right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 transition-colors z-10">
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Full-screen Drawer/Sheet for Detail */}
      <div
        className={cn(
          "absolute inset-0 z-50 bg-[#0F0F11] flex flex-col transition-transform duration-300 ease-in-out",
          selectedCard ? "translate-y-0" : "translate-y-full"
        )}
      >
        {selectedData && (
          <>
            <div className="h-16 border-b border-slate-800 bg-[#151518] flex justify-between items-center px-5 shrink-0 mt-6">
              <h2 className="font-bold text-sm font-mono tracking-wider flex items-center text-slate-200">
                <FileText className="w-4 h-4 mr-2 text-blue-500" />
                Entity Profile
              </h2>
              <button onClick={() => setSelectedCard(null)} className="p-2 -mr-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-12">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {selectedData.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-mono px-2.5 py-1.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedData.type}
                  </span>
                  <span className="text-xs font-mono px-2.5 py-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    SCORE: {selectedData.score}/100
                  </span>
                  <span className="text-xs font-mono px-2.5 py-1.5 rounded border" style={{ borderColor: STAGE_COLORS[selectedData.stage], color: STAGE_COLORS[selectedData.stage], backgroundColor: STAGE_COLORS[selectedData.stage] + '22' }}>
                    {selectedData.stage.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Status Dropdown Mockup */}
              <div>
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Move Stage
                </h4>
                <div className="w-full bg-[#1A1A1E] border border-slate-800 rounded p-3 text-sm font-mono text-slate-300 flex justify-between items-center">
                  <span>{selectedData.stage}</span>
                  <ChevronRight className="w-4 h-4 rotate-90 text-slate-500" />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
                  Outreach Sequence
                </h4>
                
                <div className="flex space-x-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: "initial", label: "Initial", icon: MessageSquare },
                    { id: "followUp", label: "Follow-Up", icon: Clock },
                    { id: "intro", label: "Intro", icon: Users }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePitchTab(tab.id)}
                      className={cn(
                        "flex items-center space-x-1.5 px-3 py-2 rounded text-xs font-mono border transition-colors whitespace-nowrap shrink-0",
                        activePitchTab === tab.id
                          ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                          : "border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300 bg-[#151518]"
                      )}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="relative group">
                  <pre className="text-xs font-mono text-slate-300 bg-[#151518] p-4 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed min-h-[200px]">
                    {activePitchTab === "initial" && `Subject: Private inquiry regarding recent trust structuring\n\nDear Marcus,\n\nI noted your recent adjustments to the philanthropic trust foundation via your UBS wealth management team.\n\nWe specialize in cross-border structural compliance for European mandates. Would you be open to a brief review?`}
                    {activePitchTab === "followUp" && `Subject: Re: Private inquiry regarding recent trust structuring\n\nFollowing up on my previous note. We've mapped out the secondary asset exposures that might affect the trust's tax efficiency in Q4.\n\nLet me know if we should align with your gatekeeper first.`}
                    {activePitchTab === "intro" && `[For Intro via Gatekeeper]\n\nHello [Name],\n\nI'm reaching out to connect with Marcus regarding the recent trust setup. We have specific data mapped to his asset structure that needs review.\n\nPlease advise on the best window.`}
                  </pre>
                  <button className="absolute top-3 right-3 p-2 bg-slate-800 rounded-md text-slate-400 hover:text-white border border-slate-700">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
