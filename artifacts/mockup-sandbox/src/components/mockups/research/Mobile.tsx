import { Terminal, Play, Target, Shield, GitBranch, CheckCircle2, Mail, Phone, ChevronDown, ChevronRight, Cpu } from "lucide-react";

const MOCK_ENTITIES = [
  { id: 1, name: "Rajesh Kumar", type: "HNWI", score: 87, isHot: true },
  { id: 2, name: "Chen Wei", type: "HNWI", score: 82, isHot: false },
  { id: 3, name: "Sarah Thompson", type: "HNWI", score: 78, isHot: true },
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

export default function MobileMockup() {
  const selectedEntity = MOCK_ENTITIES[0];

  return (
    <div className="w-[390px] h-[844px] bg-[#050810] flex flex-col overflow-hidden font-sans antialiased">
      {/* Mobile Header */}
      <div className="flex-shrink-0 border-b border-[#1F2937] bg-[#0A0F1A]/80 backdrop-blur p-3 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest">Target Selection</span>
          <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded border text-[#10B981] border-[#10B981]/40 bg-[#10B981]/5">
            PATH: 87/100
          </span>
        </div>

        {/* Entity Dropdown */}
        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded border border-[#1F2937] bg-[#050810] text-sm font-mono text-white">
          <span>{selectedEntity.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981]">
              {selectedEntity.score}
            </span>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </div>
        </button>

        {/* Pipeline */}
        <div className="bg-[#050810]/60 border border-[#1F2937]/60 rounded px-2 py-1.5">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-0.5">Pipeline</div>
          <div className="text-[10px] font-mono text-[#10B981]/70 leading-relaxed overflow-x-auto whitespace-nowrap scrollbar-none">
            {PIPELINE}
          </div>
        </div>

        {/* Run Button */}
        <button className="w-full py-2.5 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/50 font-mono text-sm uppercase tracking-widest transition-all flex items-center justify-center rounded">
          <Play className="w-4 h-4 mr-2" /> Run Analysis
        </button>

        <div className="text-[10px] font-mono text-white/30 text-center">
          Session ready
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#050810] p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Optimal Path — {MOCK_PATH.length} nodes
          </h3>
        </div>

        {/* VERTICAL TIMELINE - Single Column */}
        <div className="space-y-2">
          {MOCK_PATH.map((node, i) => (
            <div key={i}>
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
                          <span className="truncate max-w-[200px]">{node.contactEmail}</span>
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

              {/* Connector */}
              {i < MOCK_PATH.length - 1 && (
                <div className="flex justify-center py-1">
                  <ChevronRight className="w-4 h-4 text-white/30 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* MCTS Steps - Collapsible */}
        <div className="mt-6 border-t border-[#1F2937] pt-4">
          <button className="w-full flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-widest mb-3">
            <span>Show Steps (3)</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
