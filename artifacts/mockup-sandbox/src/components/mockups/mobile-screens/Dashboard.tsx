import { useState } from "react";
import { Activity, MapPin, Database, AlertTriangle, ChevronRight, Map, Radio } from "lucide-react";

const STATS = [
  { icon: Database, label: "ENTITIES", value: "31", color: "#94A3B8" },
  { icon: MapPin, label: "ASSETS", value: "35", color: "#94A3B8" },
  { icon: Activity, label: "SIGNAL AVG", value: "61.6%", color: "#10B981" },
  { icon: AlertTriangle, label: "HOT LEADS", value: "9", color: "#F59E0B" },
];

const LEADS = [
  { name: "Bradford Whitmore III", type: "HNWI", nat: "American", nw: "$2.1B", assets: 1, score: 95, signal: "Whitmore Capital Group: SEC 13F filed — $2.1B new European allocation", id: 1 },
  { name: "Rashid Al-Mansouri", type: "HNWI", nat: "Emirati", nw: "$1.2B", assets: 2, score: 94, signal: "A6-RMN (BBJ2) departed DWC → LHR London — VVIP arrival sequence", id: 2 },
  { name: "Edward Fitzwilliam-Holt", type: "HNWI", nat: "British", nw: "$560M", assets: 1, score: 92, signal: "Boodle's Club — dinner reservation via PH confirmed", id: 3 },
  { name: "Carlos Ibáñez Varela", type: "HNWI", nat: "Spanish", nw: "$890M", assets: 3, score: 91, signal: "Motor Yacht Doña Valentina — Marina Portals Nous, berth 17 booked", id: 4 },
  { name: "Patrick Beaumont", type: "HNWI", nat: "French", nw: "$340M", assets: 2, score: 83, signal: "Château Beaumont-Leray: Notaire filing — 3rd lot sold, inheritance split", id: 5 },
];

function ScorePill({ score }: { score: number }) {
  const color = score >= 90 ? "#10B981" : score >= 80 ? "#F59E0B" : "#EF4444";
  return (
    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border" style={{ color, borderColor: color + "44", backgroundColor: color + "15" }}>
      {score}
    </span>
  );
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"map" | "signals">("signals");

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white font-sans overflow-hidden">

      {/* Stats grid 2×2 */}
      <div className="grid grid-cols-2 border-b border-[#1E293B]">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className="flex flex-col px-4 py-3"
            style={{
              borderRight: i % 2 === 0 ? "1px solid #1E293B" : undefined,
              borderBottom: i < 2 ? "1px solid #1E293B" : undefined,
            }}
          >
            <span className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1" style={{ color: s.color }}>
              <s.icon className="w-2.5 h-2.5" /> {s.label}
            </span>
            <span className="text-2xl font-bold mt-1" style={{ color: s.color === "#94A3B8" ? "#E2E8F0" : s.color }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#1E293B] bg-[#0F172A]">
        {[
          { id: "map", label: "MAP VIEW", icon: Map },
          { id: "signals", label: "LIVE SIGNALS", icon: Radio },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: activeTab === tab.id ? "#10B981" : "#475569",
              borderBottom: activeTab === tab.id ? "2px solid #10B981" : "2px solid transparent",
            }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "map" ? (
          <div className="flex flex-col h-full">
            {/* Map placeholder */}
            <div className="flex-1 relative" style={{ background: "linear-gradient(135deg, #070D1A 0%, #0B1425 50%, #0A1220 100%)" }}>
              {/* Subtle grid */}
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, #1E293B 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.4 }} />
              {/* Asset dots */}
              {[
                { x: "28%", y: "38%", color: "#10B981" },
                { x: "35%", y: "45%", color: "#F59E0B" },
                { x: "22%", y: "55%", color: "#A855F7" },
                { x: "60%", y: "30%", color: "#10B981" },
                { x: "55%", y: "50%", color: "#F59E0B" },
                { x: "70%", y: "60%", color: "#A855F7" },
                { x: "80%", y: "35%", color: "#10B981" },
              ].map((dot, i) => (
                <div
                  key={i}
                  className="absolute w-2.5 h-2.5 rounded-full border border-[#0B0F19]"
                  style={{ left: dot.x, top: dot.y, backgroundColor: dot.color, boxShadow: `0 0 6px ${dot.color}80` }}
                />
              ))}
              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-[#0F172A]/90 rounded px-3 py-2 border border-[#1E293B] text-[10px] font-mono">
                {[["#10B981", "Real Estate"], ["#F59E0B", "Marine"], ["#A855F7", "Aviation"]].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1.5" style={{ color: "#94A3B8" }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest">Live Signals</span>
              </div>
            </div>
            <div className="space-y-0 divide-y divide-[#1E293B]">
              {LEADS.map((lead) => (
                <div key={lead.id} className="px-4 py-3">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="font-semibold text-[#E2E8F0] text-sm leading-tight truncate">{lead.name}</div>
                      <div className="text-[11px] text-[#64748B] font-mono mt-0.5">{lead.type} · {lead.nat}</div>
                    </div>
                    <ScorePill score={lead.score} />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#64748B] mb-2">
                    <span>NW: <span className="text-[#94A3B8]">{lead.nw}</span></span>
                    <span>Assets: <span className="text-[#94A3B8]">{lead.assets}</span></span>
                  </div>
                  <div className="bg-[#0F172A] rounded px-3 py-2 text-[11px] font-mono border border-[#1E293B]">
                    <span className="text-[#10B981] mr-1">SIGNAL:</span>
                    <span className="text-[#94A3B8]">{lead.signal}</span>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button className="text-[11px] font-mono text-[#3B82F6] flex items-center gap-0.5">
                      View Network <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
