import React, { useState } from 'react';
import { Target, Activity, Network, Terminal, Database, ArrowRight, ShieldAlert, Crosshair } from 'lucide-react';

export default function ClassifiedDossier() {
  const [activeLevel, setActiveLevel] = useState(1);

  return (
    <div className="min-h-[100dvh] w-full flex bg-[#0B0F19] font-mono text-[#E2E8F0] overflow-hidden h-screen">
      
      {/* LEFT PANEL */}
      <div className="w-[220px] shrink-0 bg-[#0F172A] border-r border-[#1E293B] flex flex-col relative z-10">
        
        {/* Logo Area */}
        <div className="p-6 border-b border-[#1E293B]">
          <div className="flex items-center gap-2 text-[#10B981] mb-2">
            <Crosshair size={20} className="animate-pulse" />
            <span className="font-bold tracking-widest text-sm">INTEL MANUAL</span>
          </div>
          <div className="text-[10px] text-[#64748B] tracking-widest font-semibold uppercase">Classified Briefing</div>
        </div>

        {/* Level Selector */}
        <div className="flex-1 py-6 flex flex-col gap-1">
          <LevelItem 
            level={1} 
            active={activeLevel === 1} 
            color="#10B981" 
            numeral="I" 
            title="BRIEFING" 
            subtitle="Beginner basics"
            onClick={() => setActiveLevel(1)} 
          />
          <LevelItem 
            level={2} 
            active={activeLevel === 2} 
            color="#3B82F6" 
            numeral="II" 
            title="INTEL" 
            subtitle="Intermediate ops"
            onClick={() => setActiveLevel(2)} 
          />
          <LevelItem 
            level={3} 
            active={activeLevel === 3} 
            color="#F59E0B" 
            numeral="III" 
            title="CLASSIFIED" 
            subtitle="Advanced tactics"
            onClick={() => setActiveLevel(3)} 
          />
          <LevelItem 
            level={4} 
            active={activeLevel === 4} 
            color="#EF4444" 
            numeral="IV" 
            title="EYES ONLY" 
            subtitle="Expert algorithms"
            onClick={() => setActiveLevel(4)} 
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] text-center">
          <span className="text-[10px] text-[#64748B] tracking-widest">v0.2 · PRIVATE BUILD</span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#0B0F19] scroll-smooth" id="dossier-content" onScroll={(e) => {
        // Optional: Update active level based on scroll position
        const target = e.target as HTMLElement;
        const scrollTop = target.scrollTop;
        if (scrollTop > 1800) setActiveLevel(4);
        else if (scrollTop > 1200) setActiveLevel(3);
        else if (scrollTop > 600) setActiveLevel(2);
        else setActiveLevel(1);
      }}>
        <div className="max-w-5xl mx-auto space-y-8 pb-32">
          
          {/* SECTION I */}
          <section id="section-1" className="relative bg-[#0F172A] border border-[#1E293B] rounded-lg p-8 overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl font-bold text-[#10B981]/10 select-none">01</div>
            
            <div className="mb-8">
              <span className="inline-block bg-[#10B981]/20 text-[#10B981] text-xs font-bold px-3 py-1 rounded-full mb-3 border border-[#10B981]/30">
                LEVEL I — BRIEFING
              </span>
              <h2 className="text-2xl font-bold text-[#E2E8F0]">Getting HNWI Contacts in 15 Minutes</h2>
            </div>

            {/* Flowchart */}
            <div className="flex items-center justify-between gap-2 mb-10 overflow-x-auto pb-4">
              <FlowBox step="01" icon={<Database size={16}/>} title="ENTITY LEDGER" desc="Initial dataset" />
              <ArrowRight className="text-[#10B981] shrink-0" size={20} />
              <FlowBox step="02" icon={<Activity size={16}/>} title="LIVE INTEL" desc="Enrich data" />
              <ArrowRight className="text-[#10B981] shrink-0" size={20} />
              <FlowBox step="03" icon={<Network size={16}/>} title="NETWORK GRAPH" desc="Map relations" />
              <ArrowRight className="text-[#10B981] shrink-0" size={20} />
              <FlowBox step="04" icon={<Terminal size={16}/>} title="MCTS TERMINAL" desc="Find paths" />
              <ArrowRight className="text-[#10B981] shrink-0" size={20} />
              <FlowBox step="05" icon={<Target size={16}/>} title="PIPELINE CRM" desc="Execute pitch" />
            </div>

            {/* Tip Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TipBox icon="🎯" title="SEARCH" desc="Use Live Intel to find HNWIs via public registries (OpenCorporates, SEC EDGAR)." />
              <TipBox icon="🔗" title="MAP" desc="Network Graph shows who knows who. Gatekeepers are your entry points." />
              <TipBox icon="📋" title="PITCH" desc="MCTS finds the optimal path. CRM stores your outreach sequence." />
            </div>
          </section>

          {/* SECTION II */}
          <section id="section-2" className="relative bg-[#0F172A] border border-[#1E293B] rounded-lg p-8 overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl font-bold text-[#3B82F6]/10 select-none">02</div>
            
            <div className="mb-8">
              <span className="inline-block bg-[#3B82F6]/20 text-[#3B82F6] text-xs font-bold px-3 py-1 rounded-full mb-3 border border-[#3B82F6]/30">
                LEVEL II — INTEL
              </span>
              <h2 className="text-2xl font-bold text-[#E2E8F0]">Scores, Signals & the Pipeline</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Bayesian Score */}
              <div className="bg-[#0B0F19] p-6 rounded border border-[#1E293B]">
                <h3 className="text-sm font-bold text-[#3B82F6] mb-4">BAYESIAN SCORE</h3>
                <div className="space-y-4 mb-6">
                  <ScoreBar entity="ALEXANDER V." score={95} color="#10B981" />
                  <ScoreBar entity="MARIA S." score={87} color="#10B981" />
                  <ScoreBar entity="ROBERT CHEN" score={72} color="#F59E0B" />
                  <ScoreBar entity="HELENA W." score={45} color="#EF4444" />
                </div>
                <div className="text-xs text-[#64748B] border-l-2 border-[#3B82F6] pl-3 py-1">
                  A score above 80 means the MCTS engine found a warm path to the target — prioritise these.
                </div>
              </div>

              {/* CRM Pipeline */}
              <div className="bg-[#0B0F19] p-6 rounded border border-[#1E293B]">
                <h3 className="text-sm font-bold text-[#3B82F6] mb-4">CRM PIPELINE</h3>
                <div className="flex flex-col gap-1 relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-[#1E293B] z-0"></div>
                  
                  <PipelineStage name="Lead Gen" active={false} />
                  <PipelineStage name="Identified" active={true} color="#3B82F6" />
                  <PipelineStage name="Graph Mapped" active={false} />
                  <PipelineStage name="MCTS Path Found" active={false} />
                  <PipelineStage name="Pitch Generated" active={false} />
                  <PipelineStage name="Contacted" active={false} />
                  <PipelineStage name="Follow-Up" active={false} />
                  <PipelineStage name="Closed" active={false} />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION III */}
          <section id="section-3" className="relative bg-[#0F172A] border border-[#1E293B] rounded-lg p-8 overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl font-bold text-[#F59E0B]/10 select-none">03</div>
            
            <div className="mb-8">
              <span className="inline-block bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-bold px-3 py-1 rounded-full mb-3 border border-[#F59E0B]/30">
                LEVEL III — CLASSIFIED
              </span>
              <h2 className="text-2xl font-bold text-[#E2E8F0]">Network Graph & Approach Vectors</h2>
            </div>

            <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg h-[400px] relative overflow-hidden mb-6 flex items-center justify-center">
              {/* Lines (SVG) */}
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                {/* Center to top-left */}
                <line x1="50%" y1="50%" x2="30%" y2="30%" stroke="#1E293B" strokeWidth="2" strokeDasharray="4 4" />
                {/* Center to top-right */}
                <line x1="50%" y1="50%" x2="70%" y2="25%" stroke="#1E293B" strokeWidth="2" strokeDasharray="4 4" />
                {/* Center to bottom */}
                <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="#1E293B" strokeWidth="2" strokeDasharray="4 4" />
                {/* Top-right to bottom-right */}
                <line x1="70%" y1="25%" x2="80%" y2="60%" stroke="#1E293B" strokeWidth="2" strokeDasharray="4 4" />
                {/* Center to bottom-right */}
                <line x1="50%" y1="50%" x2="80%" y2="60%" stroke="#1E293B" strokeWidth="2" strokeDasharray="4 4" />
              </svg>

              {/* Nodes */}
              <div className="absolute z-10" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <GraphNode title="TARGET (HNWI)" type="target" />
              </div>
              <div className="absolute z-10" style={{ top: '30%', left: '30%', transform: 'translate(-50%, -50%)' }}>
                <GraphNode title="Gatekeeper (Geometra)" type="gatekeeper" />
              </div>
              <div className="absolute z-10" style={{ top: '25%', left: '70%', transform: 'translate(-50%, -50%)' }}>
                <GraphNode title="Gatekeeper (Yacht Broker)" type="gatekeeper" />
              </div>
              <div className="absolute z-10" style={{ top: '80%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <GraphNode title="Asset (Villa)" type="asset" />
              </div>
              <div className="absolute z-10" style={{ top: '60%', left: '80%', transform: 'translate(-50%, -50%)' }}>
                <GraphNode title="Intermediary" type="intermediary" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-[#64748B]">
              <div className="flex gap-4">
                <LegendItem color="#10B981" label="HNWI" />
                <LegendItem color="#F59E0B" label="GATEKEEPER" />
                <LegendItem color="#3B82F6" label="ASSET" />
                <LegendItem color="#64748B" label="INTERMEDIARY" />
              </div>
              <div className="max-w-md text-right border-l border-[#1E293B] pl-4">
                The graph engine traverses relationships to score every possible approach path. Gatekeepers closest to the target with the highest warmth score are prioritized.
              </div>
            </div>
          </section>

          {/* SECTION IV */}
          <section id="section-4" className="relative bg-[#0F172A] border border-[#1E293B] rounded-lg p-8 overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl font-bold text-[#EF4444]/10 select-none">04</div>
            
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 bg-[#EF4444]/20 text-[#EF4444] text-xs font-bold px-3 py-1 rounded-full border border-[#EF4444]/30">
                  <ShieldAlert size={12} /> LEVEL IV — EYES ONLY
                </span>
                <span className="text-[10px] bg-[#EF4444] text-black font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  ⚠ Clearance Required
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#E2E8F0]">Inside the Algorithms</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bayesian Engine */}
              <div className="bg-[#050A14] border border-[#10B981]/30 rounded-lg p-6 relative">
                <div className="absolute top-0 right-0 bg-[#10B981]/20 text-[#10B981] text-[10px] px-2 py-1 rounded-bl border-b border-l border-[#10B981]/30 font-bold">BAYESIAN</div>
                <h3 className="text-[#10B981] font-bold text-sm mb-4">BAYESIAN ENGINE</h3>
                
                <div className="bg-[#0B0F19] text-[#E2E8F0] p-4 rounded font-mono text-sm border border-[#1E293B] mb-6 flex justify-center">
                  P(contact) ∝ Σ log-odds(signal_k)
                </div>

                <ul className="space-y-3 text-sm text-[#94A3B8]">
                  <Bullet point="Each registry hit → +log-odds update" color="#10B981" />
                  <Bullet point="Phone number found → high weight" color="#10B981" />
                  <Bullet point="SEC filing → medium weight" color="#10B981" />
                  <Bullet point="Score is a posterior probability updated continuously" color="#10B981" />
                </ul>
              </div>

              {/* MCTS Engine */}
              <div className="bg-[#050A14] border border-[#3B82F6]/30 rounded-lg p-6 relative">
                <div className="absolute top-0 right-0 bg-[#3B82F6]/20 text-[#3B82F6] text-[10px] px-2 py-1 rounded-bl border-b border-l border-[#3B82F6]/30 font-bold">UCT/MCTS</div>
                <h3 className="text-[#3B82F6] font-bold text-sm mb-4">MCTS / UCT ENGINE</h3>
                
                <div className="bg-[#0B0F19] text-[#E2E8F0] p-4 rounded font-mono text-xs border border-[#1E293B] mb-6 flex justify-center overflow-x-auto text-center whitespace-nowrap">
                  UCT(v) = Q(v)/N(v) + √2 · √(ln N(parent) / N(v))
                </div>

                <ul className="space-y-3 text-sm text-[#94A3B8]">
                  <Bullet point="Exploitation: Q/N — pick proven paths" color="#3B82F6" />
                  <Bullet point="Exploration: √2·√(ln N_parent/N) — try new paths" color="#3B82F6" />
                  <Bullet point="120 simulations per run" color="#3B82F6" />
                  <Bullet point="Winning path = highest cumulative warmth score" color="#3B82F6" />
                </ul>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

/* --- Subcomponents --- */

function LevelItem({ level, active, color, numeral, title, subtitle, onClick }: any) {
  return (
    <button 
      onClick={() => {
        onClick();
        document.getElementById(`section-${level}`)?.scrollIntoView({ behavior: 'smooth' });
      }}
      className={`w-full text-left p-4 transition-all border-l-4 flex items-center gap-4 ${
        active 
          ? `bg-[#0B0F19]` 
          : `border-transparent hover:bg-[#0B0F19]/50`
      }`}
      style={{
        borderLeftColor: active ? color : 'transparent',
        backgroundColor: active ? `${color}14` : undefined, // 14 hex = ~8% opacity
      }}
    >
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs shrink-0 transition-colors"
        style={{
          borderColor: active ? color : '#1E293B',
          color: active ? color : '#64748B',
          backgroundColor: active ? `${color}20` : 'transparent'
        }}
      >
        {numeral}
      </div>
      <div>
        <div className="font-bold text-sm transition-colors" style={{ color: active ? color : '#E2E8F0' }}>
          {title}
        </div>
        <div className="text-[10px] text-[#64748B] uppercase tracking-wider">{subtitle}</div>
      </div>
    </button>
  );
}

function FlowBox({ step, icon, title, desc }: any) {
  return (
    <div className="shrink-0 w-36 h-20 bg-[#0B0F19] border border-[#10B981]/40 rounded p-2 flex flex-col justify-between relative group hover:border-[#10B981] transition-colors">
      <div className="absolute -top-2 -left-2 w-5 h-5 bg-[#10B981] text-black font-bold text-[10px] flex items-center justify-center rounded">
        {step}
      </div>
      <div className="flex items-center gap-2 text-[#10B981] mt-1">
        {icon}
        <span className="font-bold text-[10px]">{title}</span>
      </div>
      <div className="text-[10px] text-[#94A3B8] leading-tight">
        {desc}
      </div>
    </div>
  );
}

function TipBox({ icon, title, desc }: any) {
  return (
    <div className="bg-[#0B0F19] border border-[#1E293B] rounded p-4">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="font-bold text-[#E2E8F0] text-sm">{title}</span>
      </div>
      <div className="text-xs text-[#64748B] leading-relaxed">
        {desc}
      </div>
    </div>
  );
}

function ScoreBar({ entity, score, color }: any) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#E2E8F0] font-semibold">{entity}</span>
        <span style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 w-full bg-[#1E293B] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full relative" 
          style={{ width: `${score}%`, backgroundColor: color }}
        >
          <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
}

function PipelineStage({ name, active, color = "#64748B" }: any) {
  return (
    <div className="flex items-center gap-3 relative z-10 py-1">
      <div 
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center bg-[#0B0F19]`}
        style={{ borderColor: active ? color : '#1E293B' }}
      >
        {active && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>}
      </div>
      <div 
        className={`text-xs font-bold px-2 py-1 rounded ${active ? 'border' : ''}`}
        style={{ 
          color: active ? color : '#64748B',
          borderColor: active ? `${color}40` : 'transparent',
          backgroundColor: active ? `${color}10` : 'transparent'
        }}
      >
        {name}
      </div>
    </div>
  );
}

function GraphNode({ title, type }: { title: string, type: 'target' | 'gatekeeper' | 'asset' | 'intermediary' }) {
  const styles = {
    target: { bg: '#10B98120', border: '#10B981', text: '#10B981', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]', size: 'px-4 py-2 text-sm font-bold' },
    gatekeeper: { bg: '#F59E0B20', border: '#F59E0B', text: '#F59E0B', glow: '', size: 'px-3 py-1.5 text-xs' },
    asset: { bg: '#3B82F620', border: '#3B82F6', text: '#3B82F6', glow: '', size: 'px-3 py-1.5 text-xs' },
    intermediary: { bg: '#64748B20', border: '#64748B', text: '#94A3B8', glow: '', size: 'px-2 py-1 text-[10px]' }
  };
  
  const s = styles[type];

  return (
    <div 
      className={`border rounded-full whitespace-nowrap text-center ${s.size} ${s.glow} backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer`}
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      {title}
    </div>
  );
}

function LegendItem({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full border" style={{ borderColor: color, backgroundColor: `${color}40` }}></div>
      <span className="tracking-wider">{label}</span>
    </div>
  );
}

function Bullet({ point, color }: any) {
  return (
    <li className="flex items-start gap-2">
      <div className="mt-1.5 w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: color }}></div>
      <span>{point}</span>
    </li>
  );
}
