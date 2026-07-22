import React, { useState } from "react";
import {
  Search,
  Cpu,
  Microscope,
  ShieldCheck,
  ChevronRight,
  Zap,
  CheckCircle2,
  Database,
  Globe,
  Loader2,
  AlertCircle
} from "lucide-react";

interface ScoreBarProps {
  label: string;
  value: number;
  color: string;
}

function ScoreBar({ label, value, color }: ScoreBarProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-[9px] text-[#94A3B8]">
        <span className="uppercase tracking-widest">{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1 bg-[#1E293B] rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const MOCK_RESULTS = [
  {
    id: 1,
    name: "John R. Martinez",
    score: 89,
    isHot: true,
    confidence: "HIGH",
    confColor: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10",
    nationality: "US",
    assets: 3,
    scores: { bm25: 85, semantic: 92, graph: 88, embed: 90, final: 89 },
    reasoning:
      "High probability match. Target owns a Dassault Falcon 900EX registered via an LLC in Delaware, but operates primarily out of TX. Graph confirms connections to 3 Texas-based energy executives. Bayesian signal boosted.",
    flags: ["FAA", "SEC", "GRAPH_BOOST"],
  },
  {
    id: 2,
    name: "William T. Preston",
    score: 74,
    isHot: false,
    confidence: "MED",
    confColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    nationality: "US",
    assets: 1,
    scores: { bm25: 78, semantic: 70, graph: 65, embed: 72, final: 74 },
    reasoning:
      "Partial match. Fractional ownership in a NetJets fleet. Associated with Dallas address, but wealth indicators suggest primarily real estate focus rather than aviation.",
    flags: ["FAA_FRAC", "PROPERTY"],
  },
  {
    id: 3,
    name: "Texas Energy Holdings",
    score: 61,
    isHot: false,
    confidence: "LOW",
    confColor: "text-[#64748B] border-[#1E293B] bg-[#0B1220]",
    nationality: "US",
    assets: 5,
    scores: { bm25: 90, semantic: 60, graph: 40, embed: 55, final: 61 },
    reasoning:
      "Corporate entity match. Owns multiple turboprops. No clear UBO identified in the initial retrieval pass. Requires deep-dive into Delaware registry to unmask holding structure.",
    flags: ["CORP_MATCH"],
  },
];

export default function DeepSearchMobile() {
  const [expandedReasoning, setExpandedReasoning] = useState<number | null>(null);

  const toggleReasoning = (id: number) => {
    setExpandedReasoning((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#050A14] text-white font-mono flex flex-col overflow-hidden relative border border-[#1E293B]">
      {/* ── Search Header ── */}
      <div className="flex-shrink-0 border-b border-[#1E293B] bg-[#0B1220]/80 p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-[#10B981] font-bold uppercase tracking-widest flex items-center gap-2">
            <Search className="w-3.5 h-3.5" /> Deep Search
          </div>
          <div className="text-[9px] text-[#64748B]">840ms</div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            readOnly
            value="private jet owners Texas"
            className="w-full bg-[#050A14] border border-[#1E293B] rounded pl-9 pr-3 py-2.5 text-[13px] text-white focus:outline-none"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#10B981]/20 text-[#10B981] rounded px-2 py-1 text-[9px] uppercase font-bold">
            Edit
          </button>
        </div>

        {/* Example Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <span className="flex-shrink-0 text-[10px] text-[#10B981] border border-[#10B981]/30 bg-[#10B981]/10 rounded-full px-3 py-1 whitespace-nowrap">
            private jet owners Texas
          </span>
          <span className="flex-shrink-0 text-[10px] text-[#64748B] border border-[#1E293B] rounded-full px-3 py-1 whitespace-nowrap">
            SEC EDGAR large shareholders
          </span>
          <span className="flex-shrink-0 text-[10px] text-[#64748B] border border-[#1E293B] rounded-full px-3 py-1 whitespace-nowrap">
            UK helicopter leads
          </span>
        </div>
      </div>

      {/* ── Pipeline Ticker ── */}
      <div className="flex-shrink-0 border-b border-[#1E293B] bg-[#0B1220] p-3 flex gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="text-[10px] text-[#10B981] uppercase tracking-wider">Planner</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="text-[10px] text-[#10B981] uppercase tracking-wider">Retriever</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="text-[10px] text-[#10B981] uppercase tracking-wider">Analyst</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="text-[10px] text-[#10B981] uppercase tracking-wider">Critic</span>
        </div>
      </div>

      {/* ── Results List ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-[#64748B] uppercase tracking-widest">
            3 results — Ranked
          </div>
        </div>

        {MOCK_RESULTS.map((res, i) => (
          <div
            key={res.id}
            className={`border rounded-lg p-3 ${
              res.isHot
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-[#1E293B] bg-[#0B1220]"
            }`}
          >
            {/* Card Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-[#64748B]">#{i + 1}</span>
                  {res.isHot && <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  <h3 className="font-bold text-[14px] text-white truncate">{res.name}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                    <Globe className="w-3 h-3" />
                    {res.nationality}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                    <Database className="w-3 h-3" />
                    {res.assets} asset{res.assets > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Badges Column */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div
                  className={`text-[12px] font-bold rounded px-2 py-0.5 border ${
                    res.score >= 80
                      ? "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30"
                      : res.score >= 70
                      ? "text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/30"
                      : "text-[#64748B] bg-[#1E293B] border-[#1E293B]"
                  }`}
                >
                  {res.score}
                </div>
                <span className={`text-[9px] rounded border px-1.5 py-0.5 ${res.confColor}`}>
                  {res.confidence}
                </span>
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {res.flags.map((flag) => (
                <span
                  key={flag}
                  className="text-[9px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 rounded px-1.5 py-0.5 uppercase tracking-wider"
                >
                  {flag}
                </span>
              ))}
            </div>

            {/* 2-Column Mini-Grid for Scores */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 bg-[#050A14] p-2.5 rounded border border-[#1E293B]/50">
              <ScoreBar label="BM25" value={res.scores.bm25} color="bg-blue-500" />
              <ScoreBar label="Semantic" value={res.scores.semantic} color="bg-violet-500" />
              <ScoreBar label="Graph" value={res.scores.graph} color="bg-[#10B981]" />
              <ScoreBar label="Final" value={res.scores.final} color="bg-white" />
            </div>

            {/* Expandable Reasoning */}
            <button
              onClick={() => toggleReasoning(res.id)}
              className="w-full text-left flex items-center justify-between py-1.5"
            >
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest flex items-center gap-1.5">
                <Microscope className="w-3 h-3" /> Analyst Reasoning
              </span>
              <ChevronRight
                className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${
                  expandedReasoning === res.id ? "rotate-90" : ""
                }`}
              />
            </button>

            {expandedReasoning === res.id && (
              <div className="mt-2 text-[11px] text-[#94A3B8] bg-[#050A14] border border-[#1E293B] rounded p-2.5 leading-relaxed">
                {res.reasoning}
              </div>
            )}
          </div>
        ))}

        <div className="h-8" />
      </div>
    </div>
  );
}
