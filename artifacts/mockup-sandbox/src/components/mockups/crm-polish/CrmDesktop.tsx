import React from 'react';
import { Clock, Shield, Target, Activity, Zap, Search } from 'lucide-react';

const STAGES = [
  { id: 'identified', name: 'Identified', color: '#64748B' },
  { id: 'researched', name: 'Researched', color: '#3B82F6' },
  { id: 'outreach', name: 'Outreach', color: '#A855F7' },
  { id: 'engaged', name: 'Engaged', color: '#F59E0B' },
  { id: 'closed', name: 'Closed', color: '#10B981' },
];

const MOCK_CARDS = [
  { id: 1, stage: 'identified', name: 'Alexander Sterling', score: 89, approach: 'Alumni Network', time: '2h ago', idTag: 'ID-8991' },
  { id: 2, stage: 'identified', name: 'Eleanor Vance', score: 74, approach: 'Direct Board Member', time: '5h ago', idTag: 'ID-4122' },
  { id: 7, stage: 'identified', name: 'Harrison Croft', score: 68, approach: 'Yacht Registration', time: '1d ago', idTag: 'ID-3392' },
  { id: 3, stage: 'researched', name: 'Julian Pierce', score: 92, approach: 'Venture Syndicate', time: '1d ago', idTag: 'ID-9921' },
  { id: 8, stage: 'researched', name: 'Sophia Lin', score: 88, approach: 'Philanthropy Graph', time: '2d ago', idTag: 'ID-1055' },
  { id: 4, stage: 'outreach', name: 'Marcus Thorne', score: 85, approach: 'Charity Gala Intro', time: '2d ago', idTag: 'ID-7724' },
  { id: 5, stage: 'engaged', name: 'Victoria Hayes', score: 95, approach: 'Private Family Office', time: '4h ago', idTag: 'ID-8810' },
  { id: 6, stage: 'engaged', name: 'Nathaniel Roth', score: 91, approach: 'Direct Warm Intro', time: '1w ago', idTag: 'ID-2109' },
];

export function CrmDesktop() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#2A3045] bg-[#0B0F19] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold font-mono tracking-widest text-white uppercase flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Pipeline CRM
          </h1>
          <div className="h-4 w-px bg-[#2A3045]" />
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#141824] border border-[#2A3045] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              24 ACTIVE SESSIONS
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#141824] border border-[#2A3045] text-slate-400">
              <Zap className="w-3 h-3 text-amber-500" />
              12 ENGAGED
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search entities..." 
              className="bg-[#141824] border border-[#2A3045] rounded pl-9 pr-4 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50 w-64 transition-colors placeholder:text-slate-600"
            />
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="p-6 h-[calc(100vh-65px)] overflow-hidden">
        <div className="flex h-full gap-4 w-full">
          {STAGES.map(stage => {
            const cards = MOCK_CARDS.filter(c => c.stage === stage.id);
            return (
              <div key={stage.id} className="flex-1 flex flex-col min-w-0 bg-[#0B0F19] rounded-lg border border-[#2A3045] overflow-hidden">
                {/* Column Header */}
                <div className="p-3 border-b border-[#2A3045] bg-[#141824] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
                      {stage.name}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0B0F19] border border-[#2A3045] text-slate-400 min-w-[24px] text-center">
                    {cards.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 relative [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2A3045] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                  {cards.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-10 h-10 rounded-full border border-dashed border-[#2A3045] flex items-center justify-center mb-3">
                        <Target className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-xs font-mono text-slate-500 mb-1">No entities</p>
                      <p className="text-[10px] text-slate-600">Empty stage.</p>
                    </div>
                  ) : (
                    cards.map(card => (
                      <div 
                        key={card.id} 
                        className="group bg-[#141824] border border-[#2A3045] p-3 rounded hover:border-[#3B82F6]/50 transition-colors cursor-grab relative overflow-hidden"
                      >
                        {/* Subtle left border accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 opacity-50 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: stage.color }} />
                        
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 pr-2">
                            <h4 className="font-bold text-sm text-white truncate group-hover:text-[#3B82F6] transition-colors">{card.name}</h4>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                              <Shield className="w-3 h-3" /> {card.idTag}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              card.score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                              card.score >= 80 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {card.score}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#2A3045] flex items-center justify-between">
                          <div className="text-[10px] text-slate-400 truncate pr-2 flex items-center gap-1.5">
                            <Target className="w-3 h-3 shrink-0" />
                            <span className="truncate">{card.approach}</span>
                          </div>
                          <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {card.time}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
