import React from 'react';
import { Plane, AlertTriangle, ArrowRight, Play, Users, Network, Activity, Shield, MapPin, Search } from 'lucide-react';

export default function DailyBrief() {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#080C16] text-[#E8EDF5] font-sans overflow-hidden">
      {/* Compliance Banner */}
      <div className="flex items-center justify-center bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4 text-xs font-mono text-amber-500">
        <AlertTriangle className="w-3.5 h-3.5 mr-2" />
        <span>COMPLIANCE: Public-data research only.</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: 60% */}
        <div className="flex flex-col w-[60%] p-6 pr-8 h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold tracking-wide">INTELLIGENCE BRIEF</h1>
            <div className="flex items-center gap-4 font-mono text-sm">
              <span className="text-[#64748B]">23 JUL 2026</span>
              <div className="flex items-center gap-1.5 text-[#00E5A0]">
                <div className="w-2 h-2 rounded-full bg-[#00E5A0] animate-pulse" />
                <span>LIVE</span>
              </div>
            </div>
          </div>
          
          <div className="h-px bg-[#1A2035] mb-6 w-full" />

          {/* Spotlight Cards */}
          <div className="flex flex-col gap-4 flex-1">
            {/* Card 1 */}
            <div className="flex flex-col flex-1 bg-[#0D1117] hover:bg-[#111827] border border-[#1A2035] border-l-2 border-l-[#00E5A0] p-5 rounded transition-colors group cursor-pointer justify-between">
              <div className="flex justify-between items-start">
                <div className="flex flex-col w-[40%]">
                  <div className="text-[1.1rem] font-bold mb-2 group-hover:text-[#00E5A0] transition-colors">Horan John J</div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1A2035] text-xs px-2 py-0.5 rounded text-[#E8EDF5]">HNWI</span>
                    <span className="text-xs font-mono text-[#00E5A0]">REACH 99</span>
                  </div>
                </div>
                
                <div className="flex flex-col w-[40%] text-sm font-mono text-[#64748B] justify-center px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Plane className="w-4 h-4 text-[#00E5A0]" />
                    <span className="text-[#E8EDF5]">Aviation Signal</span>
                  </div>
                  <div>Turbofan N286JJ (2012)</div>
                </div>

                <div className="flex flex-col items-end justify-between h-full w-[20%]">
                  <div className="text-2xl font-mono font-medium text-[#00E5A0]">$180M</div>
                  <button className="mt-4 px-3 py-1.5 border border-[#00E5A0]/50 text-[#00E5A0] text-xs font-mono rounded hover:bg-[#00E5A0]/10 flex items-center gap-1.5 transition-colors">
                    <Play className="w-3 h-3 fill-current" />
                    RUN INTEL
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-[#1A2035] text-xs text-[#64748B] font-mono">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  US
                </div>
                <div>1 ASSET DETECTED</div>
                <div className="ml-auto text-[#00E5A0]/70">● RECENTLY UPDATED</div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col flex-1 bg-[#0D1117] hover:bg-[#111827] border border-[#1A2035] border-l-2 border-l-blue-500 p-5 rounded transition-colors group cursor-pointer justify-between">
              <div className="flex justify-between items-start">
                <div className="flex flex-col w-[40%]">
                  <div className="text-[1.1rem] font-bold mb-2 group-hover:text-blue-400 transition-colors">Aldrich Brock L</div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1A2035] text-xs px-2 py-0.5 rounded text-[#E8EDF5]">HNWI</span>
                    <span className="text-xs font-mono text-blue-400">REACH 99</span>
                  </div>
                </div>
                
                <div className="flex flex-col w-[40%] text-sm font-mono text-[#64748B] justify-center px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Plane className="w-4 h-4 text-blue-400" />
                    <span className="text-[#E8EDF5]">Aviation Signal</span>
                  </div>
                  <div>Jet N1007B (2020)</div>
                </div>

                <div className="flex flex-col items-end justify-between h-full w-[20%]">
                  <div className="text-2xl font-mono font-medium text-blue-400">$120M</div>
                  <button className="mt-4 px-3 py-1.5 border border-blue-500/50 text-blue-400 text-xs font-mono rounded hover:bg-blue-500/10 flex items-center gap-1.5 transition-colors">
                    <Play className="w-3 h-3 fill-current" />
                    RUN INTEL
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-[#1A2035] text-xs text-[#64748B] font-mono">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  US
                </div>
                <div>1 ASSET DETECTED</div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col flex-1 bg-[#0D1117] hover:bg-[#111827] border border-[#1A2035] border-l-2 border-l-amber-500 p-5 rounded transition-colors group cursor-pointer justify-between">
              <div className="flex justify-between items-start">
                <div className="flex flex-col w-[40%]">
                  <div className="text-[1.1rem] font-bold mb-2 group-hover:text-amber-400 transition-colors">Dierolf Robert S</div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1A2035] text-xs px-2 py-0.5 rounded text-[#E8EDF5]">HNWI</span>
                    <span className="text-xs font-mono text-amber-400">REACH 99</span>
                  </div>
                </div>
                
                <div className="flex flex-col w-[40%] text-sm font-mono text-[#64748B] justify-center px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Plane className="w-4 h-4 text-amber-400" />
                    <span className="text-[#E8EDF5]">Aviation Signal</span>
                  </div>
                  <div>Piston N5234F (2018)</div>
                </div>

                <div className="flex flex-col items-end justify-between h-full w-[20%]">
                  <div className="text-2xl font-mono font-medium text-amber-400">$120M</div>
                  <button className="mt-4 px-3 py-1.5 border border-amber-500/50 text-amber-400 text-xs font-mono rounded hover:bg-amber-500/10 flex items-center gap-1.5 transition-colors">
                    <Play className="w-3 h-3 fill-current" />
                    RUN INTEL
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-[#1A2035] text-xs text-[#64748B] font-mono">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  US
                </div>
                <div>1 ASSET DETECTED</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between font-mono text-sm">
            <div className="text-[#64748B]">
              <span className="text-[#00E5A0]">2</span> JOBS RUNNING
            </div>
            <button className="text-[#64748B] hover:text-[#E8EDF5] flex items-center gap-2 transition-colors group">
              View all 14,774 hot leads
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Column: 40% */}
        <div className="flex flex-col w-[40%] border-l border-[#1A2035] p-6 h-full bg-[#080C16]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#00E5A0]" />
              <h2 className="text-lg font-bold tracking-wide">ASSET ATLAS</h2>
            </div>
            <div className="text-xs font-mono text-[#64748B] bg-[#1A2035] px-2 py-1 rounded">
              32,601 PROFILES
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative bg-[#0D1117] border border-[#1A2035] rounded overflow-hidden mb-6 flex items-center justify-center">
            {/* Background grid */}
            <div className="absolute inset-0" style={{ 
              backgroundImage: 'radial-gradient(#1A2035 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}></div>
            
            {/* SVG shape representing US roughly to constrain dots */}
            <svg viewBox="0 0 800 500" className="w-[85%] h-[85%] opacity-10 absolute pointer-events-none">
              <path d="M120 50 Q300 0 450 60 T750 150 L780 250 Q750 400 650 450 L550 480 Q450 400 350 450 L200 480 Q100 400 50 250 Z" fill="white" />
            </svg>

            {/* Simulated purple map dots over US approximate shape */}
            {[...Array(60)].map((_, i) => {
              // rough approximation of US bounds
              const x = 15 + Math.random() * 70;
              const y = 20 + Math.random() * 60;
              
              // clustering somewhat
              const finalX = (x + (Math.random() > 0.5 ? Math.random() * 5 : 0));
              const finalY = (y + (Math.random() > 0.5 ? Math.random() * 5 : 0));
              
              const size = 3 + Math.random() * 4;
              
              return (
                <div 
                  key={i}
                  className="absolute rounded-full bg-purple-500/80 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                  style={{
                    left: `${finalX}%`,
                    top: `${finalY}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    opacity: 0.4 + Math.random() * 0.6
                  }}
                />
              )
            })}

            {/* Hotspots */}
            <div className="absolute left-[20%] top-[40%] w-16 h-16 bg-purple-500/10 rounded-full animate-ping" />
            <div className="absolute left-[70%] top-[35%] w-12 h-12 bg-[#00E5A0]/10 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
            
            <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs font-mono text-[#64748B]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> US COVERAGE
              </div>
              <div>61 CONTACTABLE</div>
            </div>
          </div>

          {/* Wealth Tiers */}
          <div className="mb-6">
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-[#E8EDF5]">WEALTH DISTRIBUTION</span>
              <span className="text-[#64748B]">600 HNWI</span>
            </div>
            
            <div className="h-2 w-full rounded flex overflow-hidden mb-3">
              <div className="bg-[#00E5A0]" style={{ width: '20%' }}></div>
              <div className="bg-blue-500" style={{ width: '15%' }}></div>
              <div className="bg-purple-500" style={{ width: '64%' }}></div>
              <div className="bg-[#64748B]" style={{ width: '1%' }}></div>
            </div>
            
            <div className="flex justify-between text-[10px] font-mono text-[#64748B]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-[#00E5A0]"></span>
                <span className="text-[#E8EDF5]">ULTRA</span> 7,392
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-blue-500"></span>
                <span className="text-[#E8EDF5]">VERY</span> 4,614
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-purple-500"></span>
                <span className="text-[#E8EDF5]">HNW</span> 24,568
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-[#64748B]"></span>
                <span className="text-[#E8EDF5]">UNK</span> 27
              </div>
            </div>
          </div>

          {/* Quick Action Row */}
          <div className="grid grid-cols-3 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 bg-[#0D1117] hover:bg-[#111827] border border-[#1A2035] hover:border-[#00E5A0]/50 rounded p-4 transition-colors group">
              <Play className="w-5 h-5 text-[#00E5A0] group-hover:fill-[#00E5A0] transition-colors" />
              <span className="text-[10px] font-mono text-[#E8EDF5]">RUN INTEL</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-[#0D1117] hover:bg-[#111827] border border-[#1A2035] hover:border-blue-500/50 rounded p-4 transition-colors group">
              <Users className="w-5 h-5 text-[#E8EDF5] group-hover:text-blue-400 transition-colors" />
              <span className="text-[10px] font-mono text-[#E8EDF5]">ALL PROFILES</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-[#0D1117] hover:bg-[#111827] border border-[#1A2035] hover:border-purple-500/50 rounded p-4 transition-colors group">
              <Network className="w-5 h-5 text-[#E8EDF5] group-hover:text-purple-400 transition-colors" />
              <span className="text-[10px] font-mono text-[#E8EDF5]">NETWORK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
