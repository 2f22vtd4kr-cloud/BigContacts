import React from 'react';
import { Crosshair, Skull } from 'lucide-react';

export default function MissionBriefing() {
  return (
    <div className="min-h-screen w-full bg-[#0B0F19] font-mono text-[#E2E8F0] overflow-y-auto">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-50 bg-[#0F172A] border-b border-[#1E293B] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Crosshair className="text-[#10B981] w-5 h-5" />
          <span className="font-bold tracking-widest text-[#E2E8F0]">APEXFINDER PRO</span>
          <span className="text-[#1E293B]">|</span>
          <span className="text-[#64748B] tracking-widest">OPERATOR MANUAL</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
            <span className="text-[#64748B]">I</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
            <span className="text-[#64748B]">II</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
            <span className="text-[#64748B]">III</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
            <span className="text-[#64748B]">IV</span>
          </div>
        </div>
      </header>

      {/* DEPTH PROGRESS STRIP */}
      <div className="sticky top-[56px] z-40 w-full flex flex-col bg-[#0B0F19]">
        <div className="w-full flex h-[3px]">
          <div className="w-1/4 bg-[#10B981]"></div>
          <div className="w-1/4 bg-[#3B82F6]"></div>
          <div className="w-1/4 bg-[#F59E0B]"></div>
          <div className="w-1/4 bg-[#EF4444]"></div>
        </div>
        <div className="w-full flex text-[10px] tracking-widest text-[#64748B] py-1">
          <div className="w-1/4 text-center">BRIEFING</div>
          <div className="w-1/4 text-center">INTEL</div>
          <div className="w-1/4 text-center">CLASSIFIED</div>
          <div className="w-1/4 text-center">EYES ONLY</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto px-8 py-12 space-y-24">
        
        {/* SECTION 01 — BRIEFING */}
        <section className="relative pl-8 border-l-4 border-[#10B981]">
          <div className="absolute -top-12 -left-4 text-[120px] font-bold text-[#10B981]/10 leading-none select-none z-0">
            01
          </div>
          <div className="relative z-10 mb-8">
            <div className="inline-block bg-[#10B981] text-[#0B0F19] px-3 py-1 text-xs font-bold rounded-full mb-4">
              BRIEFING
            </div>
            <h2 className="text-3xl font-bold text-[#E2E8F0]">Get HNWI Contacts in 15 Minutes</h2>
          </div>
          
          <div className="relative z-10 space-y-6 mb-12">
            {[
              { title: 'Open Entity Ledger', desc: 'Click "Live Intel" → Search a name or company' },
              { title: 'Import results', desc: 'New entity appears in registry with Bayesian score' },
              { title: 'Open Network Graph', desc: 'Find entity → Explore its relationship web' },
              { title: 'Go to MCTS Terminal', desc: 'Select entity → Click "Initialize MCTS"' },
              { title: 'Review approach vector', desc: 'Open Pipeline CRM → Generate pitch sequence' }
            ].map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-[#10B981] flex items-center justify-center text-[#10B981] font-bold">
                  {i + 1}
                </div>
                <div>
                  <div className="font-bold text-[#E2E8F0]">{step.title}</div>
                  <div className="text-[#64748B] text-sm">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative z-10 mb-12">
            <div className="text-sm font-bold text-[#64748B] mb-4">TIME TO CONTACT</div>
            <div className="flex justify-between items-center bg-[#0F172A] p-4 rounded-lg border border-[#1E293B]">
              {['0min', '3min', '7min', '12min', '15min'].map((time, i, arr) => (
                <React.Fragment key={time}>
                  <div className="text-center">
                    <div className="w-3 h-3 bg-[#10B981] rounded-sm mb-2 mx-auto"></div>
                    <div className="text-xs text-[#64748B]">{time}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex-grow h-px bg-[#1E293B] mx-4"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="relative z-10 bg-[#10B981]/10 border border-[#10B981]/30 p-4 rounded-lg text-[#10B981] text-sm">
            ✓ RESULT: You now have a sequenced outreach path to a HNWI with a 60-80% warmth score — ready to execute.
          </div>
        </section>

        {/* SECTION 02 — INTEL */}
        <section className="relative pl-8 border-l-4 border-[#3B82F6]">
          <div className="absolute -top-12 -left-4 text-[120px] font-bold text-[#3B82F6]/10 leading-none select-none z-0">
            02
          </div>
          <div className="relative z-10 mb-8">
            <div className="inline-block bg-[#3B82F6] text-[#0B0F19] px-3 py-1 text-xs font-bold rounded-full mb-4">
              INTEL
            </div>
            <h2 className="text-3xl font-bold text-[#E2E8F0]">Scores, Signals & the Pipeline</h2>
          </div>

          <div className="relative z-10 mb-12">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-2">THE BAYESIAN SCORE</h3>
            <p className="text-[#64748B] text-sm mb-6">
              Every entity receives a dynamic Bayesian probability score based on verifiable public footprints, insider connection degrees, and signal density.
            </p>
            
            <div className="bg-[#0F172A] p-6 rounded-lg border border-[#1E293B] mb-6 space-y-6">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#EF4444]">RED (0-59)</span>
                <span className="text-[#F59E0B]">AMBER (60-79)</span>
                <span className="text-[#10B981]">GREEN (80-100)</span>
              </div>
              <div className="relative h-2 w-full bg-[#1E293B] rounded-full overflow-hidden flex">
                <div className="w-[60%] bg-[#EF4444]"></div>
                <div className="w-[20%] bg-[#F59E0B]"></div>
                <div className="w-[20%] bg-[#10B981]"></div>
              </div>
              <div className="flex justify-between text-xs text-[#64748B]">
                <span>0</span><span>50</span><span>70</span><span>85</span><span>100</span>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#1E293B]">
                {[
                  { name: 'Bradford Whitmore III', score: 95, color: 'bg-[#10B981]', text: 'text-[#10B981]' },
                  { name: 'Lorenzo Castellani', score: 89, color: 'bg-[#10B981]', text: 'text-[#10B981]' },
                  { name: 'Example Corp', score: 72, color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' }
                ].map(entity => (
                  <div key={entity.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{entity.name}</span>
                      <span className={`${entity.text} font-bold`}>{entity.score}</span>
                    </div>
                    <div className="h-1 w-full bg-[#1E293B] rounded-full overflow-hidden">
                      <div className={`h-full ${entity.color}`} style={{ width: `${entity.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 mb-12">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-4">THE PIPELINE</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {[
                'Lead Gen', 'Identified', 'Graph Mapped', 'MCTS Path', 
                'Pitch Generated', 'Contacted', 'Follow-Up', 'Closed'
              ].map((stage, i) => (
                <div key={stage} className="flex-shrink-0 bg-[#0F172A] border border-[#1E293B] rounded p-4 w-32 flex flex-col items-center justify-center gap-2">
                  <div className="text-[10px] text-[#3B82F6] font-bold">STEP {i + 1}</div>
                  <div className="text-xs text-center text-[#E2E8F0]">{stage}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 bg-[#3B82F6]/10 border border-[#3B82F6]/30 p-4 rounded-lg text-[#3B82F6] text-sm">
            💡 INTEL: Prioritize entities with Bayesian score {'>'} 80. The MCTS engine found warm introduction paths for all of them.
          </div>
        </section>

        {/* SECTION 03 — CLASSIFIED */}
        <section className="relative pl-8 border-l-4 border-[#F59E0B]">
          <div className="absolute -top-12 -left-4 text-[120px] font-bold text-[#F59E0B]/10 leading-none select-none z-0">
            03
          </div>
          <div className="relative z-10 mb-8">
            <div className="inline-block bg-[#F59E0B] text-[#0B0F19] px-3 py-1 text-xs font-bold rounded-full mb-4">
              CLASSIFIED
            </div>
            <h2 className="text-3xl font-bold text-[#E2E8F0]">Network Graph & Approach Vectors</h2>
          </div>

          <div className="relative z-10 mb-8">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-2">HOW THE GRAPH WORKS</h3>
            <p className="text-[#64748B] text-sm">
              The engine automatically maps second and third-degree connections. Instead of cold emailing a principal, you route through vulnerable peripheral nodes (assets and gatekeepers) to engineer a warm intro.
            </p>
          </div>

          <div className="relative z-10 bg-[#0F172A] border border-[#1E293B] rounded-lg p-8 flex justify-center mb-8">
            <svg width="300" height="180" viewBox="0 0 300 180" className="overflow-visible">
              {/* Lines */}
              <line x1="150" y1="90" x2="150" y2="20" stroke="#1E293B" strokeWidth="2" />
              <line x1="150" y1="90" x2="250" y2="90" stroke="#1E293B" strokeWidth="2" />
              <line x1="150" y1="90" x2="70" y2="150" stroke="#1E293B" strokeWidth="2" />
              <line x1="150" y1="90" x2="50" y2="90" stroke="#1E293B" strokeWidth="2" />
              
              {/* Center Node */}
              <circle cx="150" cy="90" r="24" fill="#0F172A" stroke="#10B981" strokeWidth="3" />
              <text x="150" y="94" fontSize="8" fill="#10B981" textAnchor="middle" fontWeight="bold">TARGET</text>
              
              {/* Top Node */}
              <circle cx="150" cy="20" r="16" fill="#0F172A" stroke="#F59E0B" strokeWidth="2" />
              <text x="150" y="23" fontSize="6" fill="#F59E0B" textAnchor="middle">Gatekeeper</text>
              <text x="150" y="44" fontSize="8" fill="#64748B" textAnchor="middle">geometra</text>
              
              {/* Right Node */}
              <circle cx="250" cy="90" r="16" fill="#0F172A" stroke="#F59E0B" strokeWidth="2" />
              <text x="250" y="93" fontSize="6" fill="#F59E0B" textAnchor="middle">Gatekeeper</text>
              <text x="250" y="114" fontSize="8" fill="#64748B" textAnchor="middle">yacht broker</text>
              
              {/* Bottom-left Node */}
              <circle cx="70" cy="150" r="16" fill="#0F172A" stroke="#3B82F6" strokeWidth="2" />
              <text x="70" y="153" fontSize="6" fill="#3B82F6" textAnchor="middle">Asset</text>
              <text x="70" y="174" fontSize="8" fill="#64748B" textAnchor="middle">villa</text>

              {/* Left Node */}
              <circle cx="50" cy="90" r="16" fill="#0F172A" stroke="#64748B" strokeWidth="2" />
              <text x="50" y="93" fontSize="6" fill="#64748B" textAnchor="middle">Intermed</text>
            </svg>
          </div>

          <div className="relative z-10 mb-8">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-4">GATEKEEPER TYPES</h3>
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#1E293B]/50 text-[#64748B]">
                    <th className="p-3 font-normal">Type</th>
                    <th className="p-3 font-normal">Example</th>
                    <th className="p-3 font-normal">Approach</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  <tr>
                    <td className="p-3 text-[#E2E8F0]">Geometra (IT)</td>
                    <td className="p-3 text-[#64748B]">Property manager</td>
                    <td className="p-3 text-[#64748B]">Spring/Fall visit window</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#E2E8F0]">Yacht Broker</td>
                    <td className="p-3 text-[#64748B]">Marina contact</td>
                    <td className="p-3 text-[#64748B]">Pre-season Feb-Apr</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#E2E8F0]">Family Office</td>
                    <td className="p-3 text-[#64748B]">Investment manager</td>
                    <td className="p-3 text-[#64748B]">Via fund introduction</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#E2E8F0]">Club Secretary</td>
                    <td className="p-3 text-[#64748B]">Boodle's, Pratt's</td>
                    <td className="p-3 text-[#64748B]">Member introduction only</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="relative z-10 bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-4 rounded-lg text-[#F59E0B] text-sm flex gap-3 items-start">
            <span className="text-lg leading-none">⚠</span>
            <span>CLASSIFIED: Personal contact chains — not company PR or secretarial staff — are the only valid approach vectors. The algorithm weights accordingly.</span>
          </div>
        </section>

        {/* SECTION 04 — EYES ONLY */}
        <section className="relative pl-8 border-l-4 border-[#EF4444]">
          <div className="absolute -top-12 -left-4 text-[120px] font-bold text-[#EF4444]/10 leading-none select-none z-0">
            04
          </div>
          <div className="relative z-10 mb-8 flex items-center gap-3">
            <div className="inline-flex items-center gap-1 bg-[#EF4444] text-[#0B0F19] px-3 py-1 text-xs font-bold rounded-full">
              <Skull className="w-3 h-3" /> EYES ONLY
            </div>
          </div>
          <div className="relative z-10 mb-8">
            <h2 className="text-3xl font-bold text-[#E2E8F0]">Inside the Algorithms</h2>
          </div>

          <div className="relative z-10 mb-8">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-4">BAYESIAN ENGINE</h3>
            <pre className="bg-[#050A14] p-4 rounded-lg border border-[#1E293B] text-[#10B981] text-xs overflow-x-auto whitespace-pre">
{`score = Σ log-odds(signal_k) for k in registry_hits

signal weights:
  personal_phone    → +4.2 log-odds
  sec_13d_filing    → +2.8 log-odds  
  companies_house   → +1.9 log-odds
  address_match     → +1.4 log-odds
  email_found       → +0.9 log-odds`}
            </pre>
          </div>

          <div className="relative z-10 mb-8">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-4">MCTS / UCT ENGINE</h3>
            <pre className="bg-[#050A14] p-4 rounded-lg border border-[#1E293B] text-[#3B82F6] text-xs overflow-x-auto whitespace-pre">
{`UCT(v) = Q(v)/N(v) + √2 · √(ln N(parent) / N(v))

Q(v)       = cumulative warmth of path through v
N(v)       = times node v was visited
N(parent)  = times parent was visited  
simulations = 120 per target
depth      = 4 hops maximum`}
            </pre>
          </div>

          <div className="relative z-10 mb-8 bg-[#0F172A] border border-[#1E293B] rounded-lg p-8">
            <div className="flex flex-col items-center gap-8">
              {/* Level 1 */}
              <div className="flex flex-col items-center relative">
                <div className="w-12 h-12 rounded-full border-2 border-[#64748B] flex items-center justify-center text-[#64748B] text-xs font-bold bg-[#0F172A] z-10">
                  YOU
                </div>
                {/* Branch lines from root */}
                <div className="absolute top-12 flex w-[200px] justify-between z-0">
                  <div className="w-px h-8 bg-[#1E293B] rotate-[-45deg] origin-top ml-[-20px]"></div>
                  <div className="w-px h-8 bg-[#1E293B]"></div>
                  <div className="w-px h-8 bg-[#1E293B] rotate-[45deg] origin-top mr-[-20px]"></div>
                </div>
              </div>
              
              {/* Level 2 */}
              <div className="flex justify-between w-[200px]">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-[#EF4444] flex items-center justify-center text-[10px] bg-[#0F172A] z-10 text-[#EF4444]">
                    Path A
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-[#F59E0B] flex items-center justify-center text-[10px] bg-[#0F172A] z-10 text-[#F59E0B]">
                    Path B
                  </div>
                </div>
                <div className="flex flex-col items-center relative">
                  <div className="w-10 h-10 rounded-full border-2 border-[#10B981] flex items-center justify-center text-[10px] bg-[#0F172A] z-10 text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    Path C
                  </div>
                  {/* Highlighted path down */}
                  <div className="absolute top-10 w-px h-8 bg-[#10B981] shadow-[0_0_5px_rgba(16,185,129,0.5)] z-0"></div>
                </div>
              </div>
              
              {/* Level 3 */}
              <div className="flex justify-end w-[200px]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#10B981] bg-[#10B981]/20 flex items-center justify-center text-[8px] z-10">
                    🎯
                  </div>
                  <span className="text-[#10B981] text-xs font-bold whitespace-nowrap">✓ OPTIMAL PATH</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 bg-[#EF4444]/10 border border-[#EF4444]/30 p-4 rounded-lg text-[#EF4444] text-sm flex gap-3 items-start">
            <span className="text-lg leading-none">🔴</span>
            <span>EYES ONLY: The MCTS engine runs 120 simulations per target using the UCT formula, balancing exploitation of known warm paths against exploration of new ones.</span>
          </div>
        </section>

      </main>
    </div>
  );
}
