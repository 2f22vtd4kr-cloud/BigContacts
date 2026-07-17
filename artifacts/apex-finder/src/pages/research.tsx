import { useState, useEffect, useRef } from "react";
import { useListEntities, useRunResearch } from "@workspace/api-client-react";
import { Terminal, Play, Cpu, AlertTriangle, ChevronRight, Hash, CheckCircle2 } from "lucide-react";
import { cn } from "@/components/layout";
import { ScoreBadge } from "@/lib/utils";

// Mock JSON parser for mcts steps. We assume the API returns stringified array of step objects
type MctsStep = {
  step: number;
  registry: string;
  target: string;
  uct: number;
  warmth: number;
  reasoning: string;
};

export default function MCTSTerminal() {
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const { data: entities } = useListEntities({ type: "HNWI", limit: 20 });
  
  const runResearch = useRunResearch();
  
  const [terminalLog, setTerminalLog] = useState<MctsStep[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [winningPath, setWinningPath] = useState<any[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const startSimulation = () => {
    if (!selectedEntityId) return;
    
    setTerminalLog([]);
    setWinningPath([]);
    setIsComputing(true);
    
    runResearch.mutate({ 
      data: { entityId: selectedEntityId, depth: 3 } 
    }, {
      onSuccess: (data) => {
        // We simulate streaming the JSON log parsing
        const steps: MctsStep[] = data.mctsSteps ? JSON.parse(data.mctsSteps) : mockSteps;
        const path = data.winningPath ? JSON.parse(data.winningPath) : mockPath;
        
        let i = 0;
        const interval = setInterval(() => {
          if (i < steps.length) {
            setTerminalLog(prev => [...prev, steps[i]]);
            i++;
          } else {
            clearInterval(interval);
            setIsComputing(false);
            setWinningPath(path);
          }
        }, 300); // 300ms per step
      },
      onError: () => {
        setIsComputing(false);
        setTerminalLog([{ step: 0, registry: "SYS", target: "ERR", uct: 0, warmth: 0, reasoning: "CRITICAL FAILURE IN MCTS ENGINE" }]);
      }
    });
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLog]);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Left Panel: Entity Selector */}
      <div className="w-80 border-r border-border bg-card flex flex-col flex-shrink-0 z-10 shadow-xl">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-bold font-mono tracking-wider flex items-center uppercase text-foreground">
            <Cpu className="w-4 h-4 mr-2 text-primary" /> Target Selection
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {entities?.map((ent) => (
            <div 
              key={ent.id}
              onClick={() => !isComputing && setSelectedEntityId(ent.id)}
              className={cn(
                "p-3 rounded border text-sm font-mono cursor-pointer transition-colors flex justify-between items-center",
                selectedEntityId === ent.id 
                  ? "border-primary bg-primary/10 text-foreground" 
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                isComputing && selectedEntityId !== ent.id && "opacity-30 cursor-not-allowed"
              )}
            >
              <div className="truncate pr-2">{ent.name}</div>
              <ScoreBadge score={ent.bayesianScore} />
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-border bg-muted/20">
          <button
            disabled={!selectedEntityId || isComputing}
            onClick={startSimulation}
            className="w-full py-3 bg-primary/20 hover:bg-primary/30 disabled:bg-muted disabled:text-muted-foreground text-primary border border-primary/50 disabled:border-border font-mono text-sm uppercase tracking-widest transition-all flex items-center justify-center"
          >
            {isComputing ? (
              <span className="animate-pulse flex items-center"><Hash className="w-4 h-4 mr-2 animate-spin" /> Computing...</span>
            ) : (
              <span className="flex items-center"><Play className="w-4 h-4 mr-2" /> Initialize MCTS</span>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel: MCTS Terminal */}
      <div className="flex-1 flex flex-col bg-[#050810] relative">
        <div className="p-3 border-b border-border/50 bg-[#0B0F19] flex items-center text-xs font-mono text-muted-foreground">
          <Terminal className="w-4 h-4 mr-2" />
          root@apexfinder:~# /opt/intel/mcts --target={selectedEntityId || "NULL"} --depth=3
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2">
          {terminalLog.length === 0 && !isComputing && (
            <div className="text-muted-foreground/50 h-full flex items-center justify-center italic">
              Awaiting target selection...
            </div>
          )}
          
          {terminalLog.map((log, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-2">
              <div className="text-emerald-500">
                <span className="text-blue-500">[{log.step.toString().padStart(4, '0')}]</span>{' '}
                <span className="text-purple-400">[{log.registry}]</span>{' '}
                Target: {log.target.padEnd(20)} |{' '}
                <span className="text-amber-500">UCT: {log.uct.toFixed(3)}</span> |{' '}
                <span className={log.warmth > 80 ? 'text-red-500 font-bold' : 'text-emerald-500'}>Warmth: {log.warmth}%</span>
              </div>
              <div className="text-muted-foreground text-xs pl-2 border-l border-muted-foreground/30 mt-1 mb-3">
                {'>'} {log.reasoning}
              </div>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Winning Path Viz */}
        {winningPath.length > 0 && !isComputing && (
          <div className="h-48 border-t border-border/50 bg-[#0B0F19] p-6 animate-in slide-in-from-bottom-10 z-20">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-4 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Vector Established
            </h3>
            
            <div className="flex items-center overflow-x-auto pb-4">
              {winningPath.map((node, i) => (
                <div key={i} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col border border-border bg-card p-3 rounded min-w-[150px]">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">{node.role}</div>
                    <div className="font-bold text-foreground text-sm">{node.name}</div>
                    <div className="text-xs text-primary mt-2 font-mono flex justify-between">
                      <span>{node.type}</span>
                      <span>{(node.score * 100).toFixed(0)}</span>
                    </div>
                  </div>
                  
                  {i < winningPath.length - 1 && (
                    <div className="flex flex-col items-center mx-4">
                      <div className="text-[10px] font-mono text-muted-foreground mb-1">{node.edge}</div>
                      <ChevronRight className="w-5 h-5 text-secondary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Fallbacks for UI demonstration if API returns empty strings or not implemented
const mockSteps = [
  { step: 1, registry: "HMLR", target: "BlueWater Ltd", uct: 0.847, warmth: 32, reasoning: "Found property match in Knightsbridge. Exploring ownership layers." },
  { step: 2, registry: "CompaniesHouse", target: "IsleTrust", uct: 1.204, warmth: 45, reasoning: "BlueWater Ltd directed by IsleTrust. Analyzing trustees." },
  { step: 3, registry: "Catasto", target: "Villa Roma", uct: 0.912, warmth: 60, reasoning: "Trustee connected to Italian real estate holdings." },
  { step: 4, registry: "FAA", target: "N884X", uct: 1.544, warmth: 75, reasoning: "Private jet registered to same address. Pilot log matches target." },
  { step: 5, registry: "PrivateClub", target: "J. Sterling (Broker)", uct: 2.105, warmth: 92, reasoning: "Broker co-signed vessel registration. Identified as high-warmth gatekeeper." }
];

const mockPath = [
  { role: "Gatekeeper", name: "J. Sterling", type: "Yacht Broker", score: 0.92, edge: "Represents" },
  { role: "Asset", name: "M/Y Serenity", type: "Marine", score: 0.88, edge: "Owned By" },
  { role: "Target", name: "Target Entity", type: "HNWI", score: 0.95, edge: "" }
];
