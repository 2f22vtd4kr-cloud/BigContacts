import React, { useState } from "react";
import {
  UserCircle,
  ChevronRight,
  Clock,
  Target,
  Shield,
  MessageSquare,
  Users,
  Copy,
  Zap,
  FileText,
  CalendarDays,
  StickyNote
} from "lucide-react";
import { format } from "date-fns";

const CRM_COLUMNS = [
  "Lead Gen",
  "Identified",
  "Graph Mapped",
  "Research Path Found",
  "Pitch Generated",
  "Contacted",
  "Follow-Up",
  "Closed",
];

const STAGE_COLORS: Record<string, string> = {
  "Lead Gen": "#475569",
  "Identified": "#64748B",
  "Graph Mapped": "#3B82F6",
  "Research Path Found": "#A855F7",
  "Pitch Generated": "#F59E0B",
  "Contacted": "#10B981",
  "Follow-Up": "#F97316",
  "Closed": "#10B981",
};

const MOCK_SESSIONS = [
  {
    id: 1,
    targetEntityName: "Alexander Sterling",
    targetEntityId: "E-8472",
    crmStatus: "Lead Gen",
    bayesianScoreAtRuntime: 82,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    targetEntityName: "Victoria Vanguard",
    targetEntityId: "E-9931",
    crmStatus: "Identified",
    bayesianScoreAtRuntime: 76,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    targetEntityName: "Julian Mercer",
    targetEntityId: "E-4421",
    crmStatus: "Graph Mapped",
    bayesianScoreAtRuntime: 89,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    targetEntityName: "Sophia Cross",
    targetEntityId: "E-1192",
    crmStatus: "Graph Mapped",
    bayesianScoreAtRuntime: 68,
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    targetEntityName: "Marcus Thorne",
    targetEntityId: "E-5510",
    crmStatus: "Research Path Found",
    bayesianScoreAtRuntime: 91,
    createdAt: new Date().toISOString(),
  },
  {
    id: 6,
    targetEntityName: "Elena Rostova",
    targetEntityId: "E-8833",
    crmStatus: "Pitch Generated",
    bayesianScoreAtRuntime: 94,
    createdAt: new Date().toISOString(),
  }
];

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null) return null;
  const color =
    score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div
      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border"
      style={{
        color: color,
        borderColor: color + "40",
        backgroundColor: color + "10",
      }}
    >
      {score.toFixed(0)}
    </div>
  );
}

export default function CrmDesktop() {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);

  const stageCounts = CRM_COLUMNS.map((col) => ({
    col,
    count: sessions.filter((s) => s.crmStatus === col).length,
  }));

  return (
    <div className="w-[1280px] h-[800px] flex flex-col bg-[#0B0F19] text-slate-200 overflow-hidden font-sans border border-slate-800 shadow-2xl mx-auto my-8 rounded-xl">
      <div className="px-6 py-3 border-b border-slate-800 bg-[#0F172A] flex-shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold font-mono tracking-widest text-slate-100 uppercase">
          Pipeline CRM
        </h1>
        <span className="text-xs font-mono text-slate-400">
          {sessions.length} sessions
        </span>
      </div>

      {/* Stage summary strip (desktop) */}
      <div className="relative border-b border-slate-800 bg-[#0F172A]/50 flex-shrink-0">
        <div className="flex px-4 py-2 gap-2 overflow-x-auto pb-px">
          {stageCounts.map(({ col, count }) => {
            const color = STAGE_COLORS[col] ?? "#64748B";
            const hasData = count > 0;
            return (
              <button
                key={col}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wide border transition-all flex-shrink-0"
                style={{
                  borderColor: hasData ? color : color + "30",
                  color: hasData ? color : color + "60",
                  backgroundColor: hasData ? color + "15" : "transparent",
                }}
              >
                {col}
                {hasData && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: color, color: "#000" }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0F172A] to-transparent pointer-events-none z-10" />
      </div>

      {/* Desktop: Kanban Board */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full p-4 gap-3">
          {CRM_COLUMNS.slice(0, 6).map((column) => {
            const columnSessions = sessions.filter((s) => s.crmStatus === column);

            return (
              <div
                key={column}
                className="w-[280px] flex-shrink-0 flex flex-col h-full bg-slate-900/40 border border-slate-800 rounded-md"
              >
                <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-[#0F172A] flex-shrink-0">
                  <h3 className="font-mono text-sm font-bold text-slate-400 uppercase tracking-wider">
                    {column}
                  </h3>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    {columnSessions.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnSessions.length === 0 && column === "Lead Gen" && (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-center border border-dashed border-slate-700/60 rounded bg-slate-800/20">
                      <p className="text-xs font-mono text-slate-500">No leads yet</p>
                      <button className="text-xs font-mono text-blue-500 border border-blue-500/20 px-2.5 py-1 rounded hover:bg-blue-500/10 transition-colors">
                        Run Intel Analysis
                      </button>
                    </div>
                  )}
                  {columnSessions.length === 0 && column !== "Lead Gen" && (
                    <div className="flex flex-col items-center justify-center h-24 border border-dashed border-slate-700/60 rounded bg-slate-800/20">
                      <span className="text-xs font-mono text-slate-500">No leads in this stage</span>
                    </div>
                  )}
                  {columnSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-[#0F172A] border border-slate-800 p-3 rounded shadow-sm hover:border-blue-500/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-sm text-slate-200 truncate mr-2">
                          {session.targetEntityName}
                        </div>
                        <ScoreBadge score={session.bayesianScoreAtRuntime} />
                      </div>

                      <div className="text-xs font-mono text-slate-500 mb-3 flex items-center">
                        <UserCircle className="w-3 h-3 mr-1" /> ID: #{session.targetEntityId}
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-slate-800 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:text-blue-400 disabled:opacity-30 transition-colors" disabled={CRM_COLUMNS.indexOf(column) === 0}>
                          <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                        <span className="text-xs uppercase text-slate-500 tracking-wider">Move</span>
                        <button className="p-1 hover:text-blue-400 disabled:opacity-30 transition-colors" disabled={CRM_COLUMNS.indexOf(column) === CRM_COLUMNS.length - 1}>
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
    </div>
  );
}
