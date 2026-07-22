import React, { useState } from 'react';
import { Clock, Shield, Target, ChevronRight, Activity } from 'lucide-react';

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

export function CrmMobile() {
  const [activeStage, setActiveStage] = useState('identified');
  
  const activeStageData = STAGES.find(s => s.id === activeStage);
  const cards = MOCK_CARDS.filter(c => c.stage === activeStage);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 font-sans pb-20 selection:bg-emerald-500/30">
      {/* Header */}
      <header className="px-4 py-4 border-b border-[#2A3045] bg-[#0B0F19] sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-lg font-bold font-mono tracking-widest text-white uppercase flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          Pipeline
        </h1>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-400">24 ACTIVE</span>
        </div>
      </header>

      {/* Stage Selector */}
      <div className="px-4 py-3 border-b border-[#2A3045] bg-[#0B0F19] overflow-x-auto [&::-webkit-scrollbar]:hidden sticky top-[61px] z-10">
        <div className="flex gap-2 w-max">
          {STAGES.map(stage => {
            const isActive = stage.id === activeStage;
            const count = MOCK_CARDS.filter(c => c.stage === stage.id).length;
            
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wide transition-all ${
                  isActive 
                    ? 'bg-white text-black' 
                    : 'bg-[#141824] border border-[#2A3045] text-slate-400 hover:border-slate-500'
                }`}
              >
                {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />}
                {stage.name}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? 'bg-slate-200 text-black' : 'bg-[#0B0F19] border border-[#2A3045]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List View */}
      <main className="p-4 space-y-3">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#2A3045] rounded-xl bg-[#141824]/50">
            <div className="w-12 h-12 rounded-full bg-[#0B0F19] border border-[#2A3045] flex items-center justify-center mb-4">
              <Target className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-sm font-mono text-slate-400 mb-1">No entities</p>
            <p className="text-xs text-slate-500">Pipeline empty for this stage.</p>
          </div>
        ) : (
          cards.map(card => (
            <div 
              key={card.id} 
              className="bg-[#141824] border border-[#2A3045] rounded-xl p-4 active:scale-[0.98] transition-transform relative overflow-hidden"
            >
              {/* Left Accent */}
              <div className="absolute left-0 top-0 bottom-0 w-1 opacity-70" style={{ backgroundColor: activeStageData?.color }} />
              
              <div className="flex justify-between items-start mb-3">
                <div className="pr-4">
                  <h3 className="font-bold text-base text-white mb-1">{card.name}</h3>
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> {card.idTag}
                  </div>
                </div>
                <div className={`shrink-0 flex items-center justify-center min-w-[36px] h-7 rounded border font-mono font-bold text-xs ${
                  card.score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  card.score >= 80 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {card.score}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-[#2A3045]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Target className="w-3.5 h-3.5 text-slate-500" />
                    {card.approach}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                    <Clock className="w-3 h-3" />
                    {card.time}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 flex gap-2">
                <button className="flex-1 py-2.5 rounded text-xs font-mono font-bold bg-[#0B0F19] border border-[#2A3045] text-slate-300 active:bg-slate-800 transition-colors">
                  VIEW DOSSIER
                </button>
                <button 
                  className="w-12 flex items-center justify-center rounded border border-[#2A3045] bg-[#0B0F19] text-white active:bg-slate-800 transition-colors"
                  style={{ borderColor: `${activeStageData?.color}40` }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
