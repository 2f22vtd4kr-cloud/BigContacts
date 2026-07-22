import { Database, MapPin, TrendingUp, Mail, Phone, Zap, AlertTriangle, Globe, DollarSign, Users, Activity } from "lucide-react";

export function DashboardMobile() {
  // Mock data
  const heroStats = [
    { label: "Entities", value: "47,392", icon: Database, color: "text-foreground" },
    { label: "Hot Leads", value: "1,847", icon: AlertTriangle, color: "text-amber-400" },
    { label: "Contactable", value: "12,394", icon: Mail, color: "text-emerald-400" },
    { label: "Net Worth", value: "$84.2B", icon: DollarSign, color: "text-violet-400" },
  ];

  const secondaryStats = [
    { label: "Assets", value: "89,473" },
    { label: "Signal Avg", value: "73.4%" },
    { label: "W-HNWIs", value: "8,942" },
    { label: "Enriched", value: "67.2%" },
  ];

  const wealthTiers = [
    { label: "Ultra", count: 284, pct: 12, color: "bg-violet-500" },
    { label: "Very", count: 892, pct: 38, color: "bg-emerald-500" },
    { label: "HNW", count: 671, pct: 28, color: "bg-amber-500" },
    { label: "Unknown", count: 521, pct: 22, color: "bg-muted" },
  ];

  const hotLeads = [
    { name: "Marcus Hjelm", type: "HNWI", nationality: "NOR", score: 94, netWorth: "$47.2M", email: true, phone: true },
    { name: "Offshore Holding AS", type: "Corp", nationality: "NOR", score: 91, netWorth: "$120M", email: true, phone: false },
    { name: "Sarah Chen", type: "HNWI", nationality: "USA", score: 89, netWorth: "$68.5M", email: true, phone: true },
    { name: "Nordic Trust III", type: "Trust", nationality: "SWE", score: 87, netWorth: "$215M", email: false, phone: false },
  ];

  const liveSignals = [
    { entity: "Alexandra Morrison", event: "New asset registered", time: "2m ago" },
    { entity: "Omega Capital Ltd", event: "Directorship change", time: "8m ago" },
    { entity: "Robert Lindgren", event: "Property transfer", time: "14m ago" },
    { entity: "Pacific Holdings", event: "Vessel registration", time: "22m ago" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] px-4 py-6">
      <div className="space-y-4">
        {/* Hero Stats - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          {heroStats.map((stat, i) => (
            <div
              key={i}
              className="bg-[#141824] border border-[#2A3045] rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider truncate">
                  {stat.label}
                </div>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Secondary Stats - Scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {secondaryStats.map((stat, i) => (
            <div key={i} className="bg-[#141824]/50 border border-[#2A3045]/50 rounded px-3 py-2 flex-shrink-0">
              <div className="text-xs font-bold text-foreground whitespace-nowrap">{stat.value}</div>
              <div className="text-[9px] font-mono text-muted-foreground uppercase whitespace-nowrap">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Wealth Distribution */}
        <div className="bg-[#141824] border border-[#2A3045] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground">Wealth Distribution</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden mb-3 bg-[#0B0F19]">
            {wealthTiers.map((tier, i) => (
              <div
                key={i}
                className={tier.color}
                style={{ width: `${tier.pct}%` }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {wealthTiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tier.color}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-foreground">{tier.count.toLocaleString()}</span>
                  <span className="text-[9px] font-mono text-muted-foreground ml-1">{tier.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Leads */}
        <div className="bg-[#141824] border border-[#2A3045] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A3045] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground">Hot Leads</span>
            </div>
            <span className="text-[9px] font-mono text-amber-500">{hotLeads.length}</span>
          </div>
          <div className="divide-y divide-[#2A3045]">
            {hotLeads.map((lead, i) => (
              <div key={i} className="p-4 active:bg-[#1E2332] transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-foreground mb-1 truncate">
                      {lead.name}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[9px] font-mono text-violet-400 uppercase">
                        {lead.type}
                      </span>
                      <span className="px-1.5 py-0.5 bg-[#141824] border border-[#2A3045] rounded text-[9px] font-mono text-muted-foreground uppercase">
                        {lead.nationality}
                      </span>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded shrink-0">
                    <span className="text-xs font-bold text-amber-400">{lead.score}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#10B981]">
                    {lead.netWorth}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {lead.email && (
                      <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Mail className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                    )}
                    {lead.phone && (
                      <div className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Phone className="w-2.5 h-2.5 text-cyan-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Signals */}
        <div className="bg-[#141824] border border-[#2A3045] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A3045] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground">Live Signals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[9px] font-mono text-[#10B981]">LIVE</span>
            </div>
          </div>
          <div className="divide-y divide-[#2A3045]">
            {liveSignals.map((signal, i) => (
              <div key={i} className="px-4 py-3 active:bg-[#1E2332] transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-mono text-xs text-foreground flex-1 truncate">
                    {signal.entity}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                    {signal.time}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground truncate">
                  {signal.event}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
