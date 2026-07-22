import { Terminal, Play, Target, Shield, GitBranch, CheckCircle2, Mail, Phone, Search, ChevronRight } from "lucide-react";

const MOCK_ENTITIES = [
  { id: 1, name: "Rajesh Kumar", type: "HNWI", score: 87, isHot: true },
  { id: 2, name: "Chen Wei", type: "HNWI", score: 82, isHot: false },
  { id: 3, name: "Sarah Thompson", type: "HNWI", score: 78, isHot: true },
  { id: 4, name: "Deutsche Vermögen AG", type: "Corporation", score: 74, isHot: false },
  { id: 5, name: "Elena Vasquez", type: "HNWI", score: 71, isHot: false },
];

const MOCK_PATH = [
  {
    step: 1,
    role: "TARGET" as const,
    label: "Rajesh Kumar",
    nodeType: "HNWI",
    registry: "CH-Geneva",
    warmth: 0.32,
    contactEmail: "r.kumar@kgroup.ch",
    contactPhone: "+41 22 XXX XXXX",
    contactConfidence: 68,
    action: "Direct outreach via Geneva connection"
  },
  {
    step: 2,
    role: "GATEKEEPER" as const,
    label: "Michael Chen",
    nodeType: "Family Office Director",
    registry: "SG-MAS",
    warmth: 0.71,
    contactEmail: "m.chen@kfamilyoffice.sg",
    contactPhone: "+65 XXXX XXXX",
    contactConfidence: 82,
    action: "Request introduction through shared board seat"
  },
  {
    step: 3,
    role: "INTERMEDIARY" as const,
    label: "Anna Kowalski",
    nodeType: "Investment Advisor",
    registry: "UK-FCA",
    warmth: 0.88,
    contactEmail: "anna.k@wealthbridge.co.uk",
    contactPhone: "+44 20 XXXX XXXX",
    contactConfidence: 94,
    action: "Leverage mutual client connection"
  },
  {
    step: 4,
    role: "ASSET" as const,
    label: "Kumar Group Holdings Ltd",
    nodeType: "Corporation",
    registry: "SG-ACRA",
    warmth: 0.54,
    contactEmail: null,
    contactPhone: null,
    contactConfidence: 0,
    action: "Background research on corp structure"
  },
];

const PIPELINE = "L1: BM25+Semantic+Graph · L2: Planner→Retriever→Analyst→Critic · L3: QueryExpansion · L4: UCT(120 rollouts) · L5: Bayesian-UCB";

function roleColor(role: string) {
  if (role === "TARGET") return "border-[#10B981]/40 bg-[#10B981]/5 text-[#10B981]";
  if (role === "GATEKEEPER") return "border-[#F59E0B]/40 bg-[#F59E0B]/5 text-[#F59E0B]";
  if (role === "ASSET") return "border-[#3B82F6]/30 bg-[#3B82F6]/5 text-[#3B82F6]";
  return "border-[#64748B]/30 bg-[#64748B]/5 text-[#64748B]";
}

function roleIcon(role: string) {
  if (role === "TARGET") return <Target className="w-3 h-3 text-[#10B981]" />;
  if (role === "GATEKEEPER") return <Shield className="w-3 h-3 text-[#F59E0B]" />;
  if (role === "ASSET") return <GitBranch className="w-3 h-3 text-[#3B82F6]" />;
  return <ChevronRight className="w-3 h-3 text-[#64748B]" />;
}

export default function DesktopMockup() {
  const selectedEntity = MOCK_ENTITIES[0];

  return (
    <div className="w-[1280px] h-[800px] bg-[#050810] flex overflow-hidden font-sans antialiased">
      {/* Left Panel: Entity Selector */}
      <div className="w-80 border-r border-[#1F2937] bg-[#0A0F1A] flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-[#1F2937] space-y-2">
          <h2 className="text-xs font-mono tracking-wider flex items-center uppercase text-white/90">
            <Terminal className="w-3.5 h-3.5 mr-2 text-[#10B981]" /> Target Selection
          </h2>
          <div className="bg-[#050810]/60 border border-[#1F2937]/60 rounded px-2 py-1.5">
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-0.5">5-Algorithm Pipeline</div>
            <div className="text-[10px] font-mono text-[#10B981]/70 leading-relaxed">{PIPELINE}</div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 flex-shrink-0 pt-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#050810] border border-[#1F2937]">
            <Search className="w-3 h-3 text-white/40 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search entities…"
              className="flex-1 bg-transparent text-xs font-mono text-white outline-none placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Entity List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {MOCK_ENTITIES.map((ent) => (
            <div
              key={ent.id}
              className={`p-3 rounded border text-sm font-mono cursor-pointer transition-colors flex justify-between items-center ${
                ent.id === 1
                  ? "border-[#10B981] bg-[#10B981]/10 text-white"
                  : "border-transparent text-white/50 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              <div className="truncate pr-2 flex items-center gap-2">
                {ent.isHot && <span className="text-[10px] text-[#F59E0B] font-bold">HOT</span>}
                {ent.name}
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                ent.score >= 80 ? "bg-[#10B981]/20 text-[#10B981]" : "bg-white/10 text-white/60"
              }`}>
                {ent.score}
              </span>
            </div>
          ))}
        </div>

        {/* Run Button */}
        <div className="p-3 border-t border-[#1F2937] bg-[#0A0F1A]/50">
          <button className="w-full py-2 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/50 font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center rounded">
            <Play className="w-3.5 h-3.5 mr-2" /> Run Analysis
          </button>
          <div className="text-[10px] font-mono text-white/30 text-center mt-2">
            Ready to execute
          </div>
        </div>
      </div>

      {/* Right Panel: Research Output */}
      <div className="flex-1 flex flex-col bg-[#050810] min-w-0">
        {/* Header */}
        <div className="p-3 border-b border-[#1F2937]/50 bg-[#0B0F19] flex items-center justify-between text-xs font-mono text-white/50 flex-shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <Terminal className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              root@apexfinder:~# /opt/intel/pipeline --target={selectedEntity.id} --algos=5 --sims=120
            </span>
          </div>
          <div className="px-2 py-0.5 rounded border text-[10px] font-mono flex-shrink-0 ml-2 border-[#10B981]/40 bg-[#10B981]/5 text-[#10B981]">
            87/100
          </div>
        </div>

        {/* Pipeline Ticker */}
        <div className="border-b border-[#1F2937]/50 bg-[#080C14] px-4 py-2 flex-shrink-0">
          <div className="text-[10px] font-mono text-[#10B981]/70 overflow-x-auto whitespace-nowrap scrollbar-none">
            {PIPELINE}
          </div>
        </div>

        {/* Main Content Area - MCTS Path Visualization */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-mono text-[#10B981] uppercase tracking-widest flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Optimal Approach Vector — {MOCK_PATH.length} nodes
            </h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#1F2937] text-white/50 hover:text-white hover:border-[#10B981]/40 font-mono text-[10px] uppercase tracking-wider transition-colors">
              Copy Brief
            </button>
          </div>

          {/* VERTICAL TIMELINE - 2 column grid for desktop */}
          <div className="grid grid-cols-2 gap-4">
            {MOCK_PATH.map((node, i) => (
              <div key={i} className="flex flex-col">
                {/* Path Node Card */}
                <div className={`flex flex-col border p-3 rounded w-full ${roleColor(node.role)}`}>
                  {/* Role Header */}
                  <div className="flex items-center mb-1.5 space-x-1">
                    {roleIcon(node.role)}
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">{node.role}</span>
                  </div>

                  {/* Label */}
                  <div className="font-bold text-white text-sm leading-tight mb-1">{node.label}</div>

                  {/* Node Type */}
                  <div className="text-xs opacity-50 mb-2">{node.nodeType}</div>

                  {/* Registry Badge */}
                  {node.registry && (
                    <div className="text-[10px] font-mono opacity-60 mb-2">
                      Registry: {node.registry}
                    </div>
                  )}

                  {/* Warmth Score Bar */}
                  <div className="mb-2">
                    <div className="h-1 flex-1 rounded-full bg-current/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current/60"
                        style={{ width: `${node.warmth * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono opacity-70 mt-1 block">
                      Warmth: {Math.round(node.warmth * 100)}%
                    </span>
                  </div>

                  {/* Contact Info */}
                  {(node.contactEmail || node.contactPhone) && (
                    <div className="pt-2 border-t border-current/20 flex flex-col gap-1">
                      {node.contactConfidence > 0 && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-1 flex-1 rounded-full bg-current/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-current/60"
                              style={{ width: `${node.contactConfidence}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono opacity-70">{node.contactConfidence}%</span>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {node.contactEmail && (
                          <div className="flex items-center gap-1 text-xs font-mono opacity-80">
                            <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate max-w-[140px]">{node.contactEmail}</span>
                          </div>
                        )}
                        {node.contactPhone && (
                          <div className="flex items-center gap-1 text-xs font-mono opacity-80">
                            <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                            <span>{node.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Required */}
                  {node.action && (
                    <div className="mt-2 text-xs leading-snug opacity-75 border-t border-current/20 pt-2">
                      {node.action}
                    </div>
                  )}
                </div>

                {/* Connector - visual only */}
                {i < MOCK_PATH.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="w-px h-4 bg-[#1F2937]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MCTS Steps Table */}
        <div className="border-t border-[#1F2937]/50 bg-[#0B0F19] p-4 flex-shrink-0 max-h-64 overflow-y-auto">
          <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-3">MCTS Search Steps</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono min-w-[500px]">
              <thead>
                <tr className="border-b border-[#1F2937]">
                  <th className="text-left py-2 px-2 text-white/50">Step</th>
                  <th className="text-left py-2 px-2 text-white/50">Action</th>
                  <th className="text-left py-2 px-2 text-white/50">Registry</th>
                  <th className="text-left py-2 px-2 text-white/50">UCT Score</th>
                  <th className="text-left py-2 px-2 text-white/50">Warmth</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#1F2937]/30">
                  <td className="py-2 px-2 text-[#3B82F6]">0001</td>
                  <td className="py-2 px-2 text-[#10B981]">TARGET IDENTIFIED</td>
                  <td className="py-2 px-2 text-[#A855F7]">CH-Geneva</td>
                  <td className="py-2 px-2 text-[#F59E0B]">0.842</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#10B981]" style={{ width: "32%" }} />
                      </div>
                      <span className="text-white/60">32%</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-[#1F2937]/30">
                  <td className="py-2 px-2 text-[#3B82F6]">0002</td>
                  <td className="py-2 px-2 text-[#F59E0B]">GATEKEEPER LOCKED</td>
                  <td className="py-2 px-2 text-[#A855F7]">SG-MAS</td>
                  <td className="py-2 px-2 text-[#F59E0B]">0.917</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#10B981]" style={{ width: "71%" }} />
                      </div>
                      <span className="text-[#F59E0B]">71%</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-[#1F2937]/30">
                  <td className="py-2 px-2 text-[#3B82F6]">0003</td>
                  <td className="py-2 px-2 text-[#3B82F6]">EXPAND NODE</td>
                  <td className="py-2 px-2 text-[#A855F7]">UK-FCA</td>
                  <td className="py-2 px-2 text-[#F59E0B]">0.883</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#10B981]" style={{ width: "88%" }} />
                      </div>
                      <span className="text-[#10B981] font-bold">88%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
