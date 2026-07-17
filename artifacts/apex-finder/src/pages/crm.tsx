import { useState } from "react";
import {
  useListResearchSessions,
  useUpdateResearchStatus,
  useGeneratePitch,
} from "@workspace/api-client-react";
import { ScoreBadge } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  FileText, UserCircle, ChevronRight, Copy,
  MessageSquare, Clock, Users, Shield, Target,
} from "lucide-react";
import { format } from "date-fns";

const CRM_COLUMNS = [
  "Lead Gen",
  "Identified",
  "Graph Mapped",
  "MCTS Path Selected",
  "Pitch Generated",
  "Contacted",
  "Follow-Up",
  "Closed",
];

// ── Pitch sequence display with tab switching ─────────────────────────────────

interface PitchSequence {
  initial: string;
  followUp: string;
  introScript: string;
}

function PitchSequenceDisplay({ pitch }: { pitch: string }) {
  const [activeTab, setActiveTab] = useState<keyof PitchSequence>("initial");

  let sequence: PitchSequence | null = null;
  try {
    sequence = JSON.parse(pitch) as PitchSequence;
    // Validate it actually has the expected keys
    if (!sequence.initial) sequence = null;
  } catch {
    sequence = null;
  }

  // Legacy plain-text pitch (pre-sequence format)
  if (!sequence) {
    return (
      <div className="relative group">
        <pre className="text-xs font-mono text-foreground bg-muted p-4 rounded border border-border whitespace-pre-wrap max-h-72 overflow-y-auto">
          {pitch}
        </pre>
        <button
          className="absolute top-2 right-2 p-1.5 bg-card border border-border rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
          onClick={() => navigator.clipboard.writeText(pitch)}
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
    );
  }

  const tabs: { key: keyof PitchSequence; label: string; icon: React.ElementType; color: string }[] = [
    { key: "initial", label: "Initial", icon: MessageSquare, color: "text-primary" },
    { key: "followUp", label: "Follow-Up", icon: Clock, color: "text-amber-400" },
    { key: "introScript", label: "Intro Script", icon: Users, color: "text-secondary" },
  ];

  const activeContent = sequence[activeTab];

  return (
    <div className="space-y-2">
      <div className="flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-mono border transition-colors",
              activeTab === tab.key
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border/60 hover:text-foreground"
            )}
          >
            <tab.icon className="w-3 h-3" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="relative group">
        <pre className="text-xs font-mono text-foreground bg-muted p-4 rounded border border-border whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
          {activeContent}
        </pre>
        <button
          className="absolute top-2 right-2 p-1.5 bg-card border border-border rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
          onClick={() => navigator.clipboard.writeText(activeContent ?? "")}
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Approach vector (winning path) renderer ───────────────────────────────────

function WinningPathDisplay({ raw }: { raw: string }) {
  let path: any[] = [];
  try {
    path = JSON.parse(raw);
  } catch {
    return <div className="text-xs text-muted-foreground italic">Unable to parse path data.</div>;
  }

  if (!path.length) {
    return <div className="text-xs text-muted-foreground italic">No path recorded.</div>;
  }

  return (
    <div className="space-y-1.5">
      {path.map((node: any, i: number) => (
        <div
          key={i}
          className={cn(
            "flex items-start p-2.5 rounded border text-xs font-mono",
            node.role === "GATEKEEPER"
              ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
              : node.role === "TARGET"
              ? "border-primary/30 bg-primary/5 text-primary"
              : node.role === "ASSET"
              ? "border-secondary/30 bg-secondary/5 text-secondary"
              : "border-border bg-muted/10 text-muted-foreground"
          )}
        >
          <div className="flex items-center mr-2 mt-0.5 flex-shrink-0">
            {node.role === "TARGET" ? (
              <Target className="w-3 h-3" />
            ) : node.role === "GATEKEEPER" ? (
              <Shield className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-widest opacity-50 mb-0.5">{node.role}</div>
            <div className="font-bold text-foreground leading-tight">{node.label}</div>
            {node.nodeType && <div className="text-[10px] opacity-50 mt-0.5">{node.nodeType}</div>}
            {node.actionRequired && (
              <div className="text-[10px] opacity-70 mt-1 leading-snug">{node.actionRequired}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main CRM component ────────────────────────────────────────────────────────

export default function PipelineCRM() {
  const { data: sessions, refetch } = useListResearchSessions();
  const updateStatus = useUpdateResearchStatus();
  const generatePitch = useGeneratePitch();

  const [selectedSession, setSelectedSession] = useState<any>(null);

  const moveCard = (sessionId: number, currentStatus: string, direction: 1 | -1) => {
    const currentIndex = CRM_COLUMNS.indexOf(currentStatus);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < CRM_COLUMNS.length) {
      updateStatus.mutate(
        { id: sessionId, data: { crmStatus: CRM_COLUMNS[newIndex] } },
        { onSuccess: () => refetch() }
      );
    }
  };

  const handleGeneratePitch = (id: number) => {
    generatePitch.mutate({ id }, { onSuccess: () => refetch() });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden relative">
      <div className="px-6 py-3 border-b border-border bg-card flex-shrink-0">
        <h1 className="text-xl font-bold font-mono tracking-widest text-foreground uppercase">
          Pipeline CRM
        </h1>
      </div>

      {/* ── Kanban Board ── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full p-4 space-x-4 min-w-max">
          {CRM_COLUMNS.map((column) => {
            const columnSessions = sessions?.filter((s) => s.crmStatus === column) ?? [];

            return (
              <div
                key={column}
                className="w-80 flex flex-col h-full bg-muted/10 border border-border rounded-md"
              >
                <div className="p-3 border-b border-border flex justify-between items-center bg-card flex-shrink-0">
                  <h3 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    {column}
                  </h3>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    {columnSessions.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-card border border-border p-3 rounded shadow-sm hover:border-primary/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-sm text-foreground truncate mr-2">
                          {session.targetEntityName ?? "Unknown Target"}
                        </div>
                        <ScoreBadge score={session.bayesianScoreAtRuntime} />
                      </div>

                      <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center">
                        <UserCircle className="w-3 h-3 mr-1" /> ID: #{session.targetEntityId}
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-border pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1 hover:text-primary disabled:opacity-30 transition-colors"
                          disabled={CRM_COLUMNS.indexOf(column) === 0}
                          onClick={(e) => { e.stopPropagation(); moveCard(session.id, column, -1); }}
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Move</span>
                        <button
                          className="p-1 hover:text-primary disabled:opacity-30 transition-colors"
                          disabled={CRM_COLUMNS.indexOf(column) === CRM_COLUMNS.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveCard(session.id, column, 1); }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Session Detail Panel ── */}
      {selectedSession && (
        <div className="absolute top-0 right-0 bottom-0 w-[42%] bg-card border-l border-border shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20 flex-shrink-0">
            <h2 className="font-bold text-sm font-mono tracking-wider flex items-center text-foreground">
              <FileText className="w-4 h-4 mr-2 text-primary" />
              Target Intelligence
            </h2>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-muted-foreground hover:text-foreground font-mono text-xs border border-border px-2 py-1 rounded transition-colors"
            >
              [CLOSE]
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {selectedSession.targetEntityName}
              </h3>
              <div className="flex items-center space-x-3">
                <div className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground text-xs font-mono rounded border border-border">
                  STATUS: {selectedSession.crmStatus}
                </div>
                {selectedSession.pathScore != null && (
                  <div className={cn(
                    "text-xs font-mono px-2 py-1 rounded border",
                    selectedSession.pathScore >= 0.7
                      ? "text-primary border-primary/30 bg-primary/5"
                      : "text-amber-500 border-amber-500/30 bg-amber-500/5"
                  )}>
                    PATH: {(selectedSession.pathScore * 100).toFixed(0)}/100
                  </div>
                )}
              </div>
            </div>

            {/* Approach Vector */}
            <div>
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-1">
                Approach Vector
              </h4>
              {selectedSession.winningPath ? (
                <WinningPathDisplay raw={selectedSession.winningPath} />
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  No path generated. Run MCTS analysis first.
                </div>
              )}
            </div>

            {/* Outreach Sequence */}
            <div>
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-1 flex justify-between items-center">
                <span>Outreach Sequence</span>
                {!selectedSession.generatedPitch && (
                  <button
                    onClick={() => handleGeneratePitch(selectedSession.id)}
                    disabled={generatePitch.isPending}
                    className="text-primary hover:bg-primary/10 px-2 py-0.5 rounded transition-colors text-[10px] border border-primary/30"
                  >
                    {generatePitch.isPending ? "GENERATING..." : "GENERATE"}
                  </button>
                )}
              </h4>

              {selectedSession.generatedPitch ? (
                <PitchSequenceDisplay pitch={selectedSession.generatedPitch} />
              ) : (
                <div className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded border border-border border-dashed text-center text-xs font-mono">
                  Generate outreach sequence to synthesize Initial → Follow-Up → Intro Script
                </div>
              )}
            </div>

            {/* Footer timestamps */}
            <div className="pt-2 border-t border-border flex justify-between items-center text-xs font-mono text-muted-foreground">
              <span>Created: {format(new Date(selectedSession.createdAt), "yyyy-MM-dd HH:mm")}</span>
              {selectedSession.lastContactDate && (
                <span>
                  Last Contact: {format(new Date(selectedSession.lastContactDate), "yyyy-MM-dd")}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
