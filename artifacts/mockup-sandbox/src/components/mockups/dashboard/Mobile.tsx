import React from 'react';
import { Activity, Database, Users, ShieldAlert, Radio, Zap, Mail, Menu } from 'lucide-react';

export default function Mobile() {
  const priorityStats = [
    { label: 'ENTITIES', value: '42,109', icon: Database, color: 'text-blue-500' },
    { label: 'HOT LEADS', value: '342', icon: Zap, color: 'text-rose-500' },
    { label: 'W-HNWIs', value: '1,204', icon: Users, color: 'text-emerald-500' },
  ];

  const secondaryStats = [
    { label: 'ASSETS', value: '18,492', icon: Activity, color: 'text-purple-500' },
    { label: 'SIGNAL AVG', value: '87.4', icon: Radio, color: 'text-amber-500' },
    { label: 'CONTACT', value: '12.8k', icon: Mail, color: 'text-cyan-500' },
    { label: 'ENRICHED', value: '94%', icon: ShieldAlert, color: 'text-indigo-500' },
  ];

  const signals = [
    { name: 'Alexander Volkov', type: 'HNWI', signal: 'StockHolding: Large-shareholder position in Global Tech', score: 94 },
    { name: 'Meridian Capital', type: 'CORP', signal: 'Real Estate: Acquired luxury property in London', score: 88 },
    { name: 'Elena Rostova', type: 'HNWI', signal: 'Aviation: Private jet registered in Isle of Man', score: 91 },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-[390px] mx-auto bg-[#050810] text-[#94A3B8] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#0B0F19] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="p-1 hover:bg-[#1E293B] rounded-md transition-colors text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#10B981]" />
            <span className="text-lg font-bold text-white tracking-wider">APEX<span className="text-[#10B981]">PRO</span></span>
          </div>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
      </div>

      <div className="overflow-y-auto pb-6">
        {/* Stats Section */}
        <div className="p-4 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-2 opacity-50">Intelligence Overview</h2>
          
          <div className="space-y-3">
            {/* Priority Stats - Full Width */}
            {priorityStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-[#0B0F19] border border-[#1E293B] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-[#1E293B]/50 rounded-md ${stat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-medium text-[#94A3B8] uppercase">{stat.label}</div>
                  </div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                </div>
              );
            })}
          </div>

          {/* Secondary Stats - 2 Col Grid */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {secondaryStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="flex flex-col items-center justify-center p-3 bg-[#0B0F19] border border-[#1E293B] rounded-lg text-center">
                  <div className={`mb-1 ${stat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] font-medium text-[#94A3B8] uppercase mt-0.5">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-2 border-t border-b border-[#1E293B] bg-[#0B0F19]">
          <div className="p-3 flex items-center gap-2 border-b border-[#1E293B]">
            <Activity className="w-4 h-4 text-[#10B981]" /> 
            <h2 className="text-xs font-bold text-white uppercase">Asset Map</h2>
          </div>
          
          <div className="relative h-[240px] bg-[#050810] overflow-hidden">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>
            
            {/* Map Placeholder Content */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <svg viewBox="0 0 1000 500" className="w-[150%] h-[150%] fill-current text-[#1E293B]">
                <path d="M150,100 Q300,50 450,150 T800,100 T950,250 T800,400 T450,300 T150,100 Z" />
              </svg>
            </div>
            
            {/* Dots */}
            <div className="absolute top-[35%] left-[45%] w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></div>
            <div className="absolute top-[50%] left-[65%] w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-[25%] left-[30%] w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="p-3 grid grid-cols-2 gap-2 text-[10px] font-medium">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Real Estate</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Marine</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Aviation</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> Other</span>
          </div>
        </div>

        {/* Live Signals */}
        <div className="mt-4 p-4 space-y-3">
          <h2 className="text-xs font-bold text-white uppercase flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-rose-500" /> LIVE SIGNALS
          </h2>
          
          <div className="space-y-3">
            {signals.map((sig, i) => (
              <div key={i} className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${sig.type === 'HNWI' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {sig.type}
                    </span>
                    <span className="font-bold text-white text-sm">{sig.name}</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-amber-400">
                    {sig.score}
                  </div>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-2">
                  <strong className="text-slate-300">Signal:</strong> {sig.signal}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}