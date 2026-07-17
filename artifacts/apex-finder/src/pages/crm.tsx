import { useListResearchSessions, useUpdateResearchStatus, useGeneratePitch } from "@workspace/api-client-react";
import { ScoreBadge } from "@/lib/utils";
import { useState } from "react";
import { FileText, MoreHorizontal, UserCircle, CheckCircle2, ChevronRight, Copy } from "lucide-react";
import { format } from "date-fns";

const CRM_COLUMNS = [
  "Lead Gen",
  "Identified",
  "Graph Mapped",
  "MCTS Path Selected",
  "Pitch Generated",
  "Contacted",
  "Follow-Up",
  "Closed"
];

export default function PipelineCRM() {
  const { data: sessions, refetch } = useListResearchSessions();
  const updateStatus = useUpdateResearchStatus();
  const generatePitch = useGeneratePitch();
  
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const moveCard = (sessionId: number, currentStatus: string, direction: 1 | -1) => {
    const currentIndex = CRM_COLUMNS.indexOf(currentStatus);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < CRM_COLUMNS.length) {
      updateStatus.mutate({ 
        id: sessionId, 
        data: { crmStatus: CRM_COLUMNS[newIndex] } 
      }, {
        onSuccess: () => refetch()
      });
    }
  };

  const handleGeneratePitch = (id: number) => {
    generatePitch.mutate({ id }, {
      onSuccess: () => {
        refetch();
        // If the side panel is open for this session, it will update via refetch
      }
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="p-6 border-b border-border bg-card">
        <h1 className="text-xl font-bold font-mono tracking-widest text-foreground uppercase">Pipeline CRM</h1>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full p-6 space-x-4 min-w-max">
          {CRM_COLUMNS.map((column) => {
            const columnSessions = sessions?.filter(s => s.crmStatus === column) || [];
            
            return (
              <div key={column} className="w-80 flex flex-col h-full bg-muted/10 border border-border rounded-md">
                <div className="p-3 border-b border-border flex justify-between items-center bg-card">
                  <h3 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider">{column}</h3>
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
                          {session.targetEntityName || "Unknown Target"}
                        </div>
                        <ScoreBadge score={session.bayesianScoreAtRuntime} />
                      </div>
                      
                      <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center">
                        <UserCircle className="w-3 h-3 mr-1" /> ID: #{session.targetEntityId}
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-border pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1 hover:text-primary disabled:opacity-30" 
                          disabled={CRM_COLUMNS.indexOf(column) === 0}
                          onClick={(e) => { e.stopPropagation(); moveCard(session.id, column, -1); }}
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Move</span>
                        <button 
                          className="p-1 hover:text-primary disabled:opacity-30"
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

      {/* Detail Panel */}
      {selectedSession && (
        <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-card border-l border-border shadow-2xl z-30 flex flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
            <h2 className="font-bold text-sm font-mono tracking-wider flex items-center">
              Target Details
            </h2>
            <button onClick={() => setSelectedSession(null)} className="text-muted-foreground hover:text-foreground font-mono text-sm">
              [CLOSE]
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">{selectedSession.targetEntityName}</h3>
              <div className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground text-xs font-mono rounded">
                STATUS: {selectedSession.crmStatus}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">Winning Path</h4>
                {selectedSession.winningPath ? (
                  <div className="text-sm font-mono text-primary bg-primary/5 p-3 rounded border border-primary/20 break-words">
                    {selectedSession.winningPath}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No path generated yet.</div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1 flex justify-between items-center">
                  <span>Generated Pitch</span>
                  {!selectedSession.generatedPitch && (
                    <button 
                      onClick={() => handleGeneratePitch(selectedSession.id)}
                      disabled={generatePitch.isPending}
                      className="text-primary hover:text-primary-foreground hover:bg-primary px-2 py-0.5 rounded transition-colors text-[10px]"
                    >
                      {generatePitch.isPending ? "GENERATING..." : "GENERATE"}
                    </button>
                  )}
                </h4>
                
                {selectedSession.generatedPitch ? (
                  <div className="relative group">
                    <pre className="text-xs font-mono text-foreground bg-muted p-4 rounded border border-border whitespace-pre-wrap">
                      {selectedSession.generatedPitch}
                    </pre>
                    <button 
                      className="absolute top-2 right-2 p-1.5 bg-card border border-border rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
                      onClick={() => navigator.clipboard.writeText(selectedSession.generatedPitch!)}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded border border-border border-dashed text-center">
                    Run pitch generation to synthesize outreach vector.
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-border flex justify-between items-center text-xs font-mono text-muted-foreground">
                <span>Created: {format(new Date(selectedSession.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                {selectedSession.lastContactDate && (
                  <span>Last Contact: {format(new Date(selectedSession.lastContactDate), 'yyyy-MM-dd')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
