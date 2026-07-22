import React from 'react';
import { Activity, Database, Users, ShieldAlert, Radio, Zap, Mail } from 'lucide-react';

export default function Desktop() {
  const stats = [
    { label: 'ENTITIES', value: '42,109', icon: Database, color: 'text-blue-500' },
    { label: 'ASSETS', value: '18,492', icon: Activity, color: 'text-purple-500' },
    { label: 'W-HNWIs', value: '1,204', icon: Users, color: 'text-emerald-500' },
    { label: 'SIGNAL AVG', value: '87.4', icon: Radio, color: 'text-amber-500' },
    { label: 'HOT LEADS', value: '342', icon: Zap, color: 'text-rose-500' },
    { label: 'CONTACTABLE', value: '12.8k', icon: Mail, color: 'text-cyan-500' },
    { label: 'ENRICHED %', value: '94%', icon: ShieldAlert, color: 'text-indigo-500' },
  ];

  const signals = [
    { name: 'Alexander Volkov', type: 'HNWI', signal: 'StockHolding: Large-shareholder position in Global Tech', score: 94 },
    { name: 'Meridian Capital Ltd', type: 'CORP', signal: 'Real Estate: Acquired luxury property in London', score: 88 },
    { name: 'Elena Rostova', type: 'HNWI', signal: 'Aviation: Private jet registered in Isle of Man', score: 91 },
    { name: 'Quantum Holdings', type: 'CORP', signal: 'Network: New link to sanctioned entity detected', score: 97 },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050810] text-[#94A3B8] font-sans overflow-hidden">
      {/* Header / Stats Bar */}
      <div className="p-4 border-b border-[#1E293B] bg-[#0B0F19]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-[#10B981]" />
            <span className="text-xl font-bold text-white tracking-wider">APEX<span className="text-[#10B981]">FINDER</span> PRO</span>
            <span className="ml-4 px-2 py-1 text-xs font-medium bg-[#1E293B] text-white rounded-md uppercase">Intelligence HQ</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div> System Online</span>
            <span className="text-xs">08:42:15 UTC</span>
          </div>
        </div>

        <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#050810] border border-[#1E293B] rounded-lg">
                <div className={`p-2 bg-[#1E293B]/50 rounded-md ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs font-medium text-[#94A3B8]">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Map */}
        <div className="w-[65%] flex flex-col border-r border-[#1E293B] bg-[#0B0F19]">
          <div className="p-3 border-b border-[#1E293B] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#10B981]" /> ASSET MAP
            </h2>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Real Estate</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Marine</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Aviation</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-500"></div> Other</span>
            </div>
          </div>
          <div className="flex-1 relative bg-[#050810] overflow-hidden group">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
            
            {/* Map Placeholder Content */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <svg viewBox="0 0 1000 500" className="w-full h-full fill-current text-[#1E293B]">
                <path d="M150,100 Q300,50 450,150 T800,100 T950,250 T800,400 T450,300 T150,100 Z" />
              </svg>
            </div>
            
            {/* Dots */}
            <div className="absolute top-[30%] left-[40%] w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
            <div className="absolute top-[45%] left-[60%] w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-[20%] left-[70%] w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-[60%] left-[25%] w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute top-[75%] left-[55%] w-3 h-3 rounded-full bg-slate-500 shadow-[0_0_10px_rgba(100,116,139,0.8)] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            
            {/* Tooltip mockup */}
            <div className="absolute top-[28%] left-[42%] bg-[#0B0F19] border border-blue-500/50 p-2 text-xs rounded shadow-lg backdrop-blur-sm hidden group-hover:block">
              <div className="text-white font-bold">M/Y Eclipse</div>
              <div className="text-blue-400">Marine Asset • $400M</div>
            </div>

            {/* Coordinates */}
            <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[#1E293B]">
              LAT: 51.5074 N / LON: 0.1278 W
            </div>
          </div>
        </div>

        {/* Right: Live Signals */}
        <div className="w-[35%] flex flex-col bg-[#050810]">
          <div className="p-3 border-b border-[#1E293B] bg-[#0B0F19]">
            <h2 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose-500" /> LIVE SIGNALS
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {signals.map((sig, i) => (
              <div key={i} className="bg-[#0B0F19] border border-[#1E293B] rounded-lg p-3 hover:border-[#10B981]/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${sig.type === 'HNWI' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {sig.type}
                    </span>
                    <span className="font-bold text-white text-sm group-hover:text-[#10B981] transition-colors">{sig.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    SCORE {sig.score}
                  </div>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">
                  <strong className="text-slate-300">Signal:</strong> {sig.signal}
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 py-1.5 bg-[#1E293B] hover:bg-[#1E293B]/80 text-xs font-medium text-white rounded transition-colors">Profile</button>
                  <button className="flex-1 py-1.5 border border-[#1E293B] hover:bg-[#1E293B] text-xs font-medium text-slate-300 rounded transition-colors">Network</button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#1E293B] bg-[#0B0F19]">
            <div className="mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">WESTERN HNWI ENGINE</h3>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  defaultValue="1000" 
                  className="w-full bg-[#050810] border border-[#1E293B] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#94A3B8]">Target Count</span>
              </div>
              <button className="px-4 py-2 bg-[#10B981] hover:bg-[#10B981]/90 text-[#050810] font-bold text-sm rounded transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                INGEST
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}