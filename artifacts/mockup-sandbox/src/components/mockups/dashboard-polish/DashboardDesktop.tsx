import { Database, MapPin, TrendingUp, Mail, Phone, Zap, AlertTriangle, Globe, DollarSign, Users, Activity } from "lucide-react";

export function DashboardDesktop() {
  // Mock data
  const heroStats = [
    { label: "Total Entities", value: "47,392", icon: Database, color: "text-foreground" },
    { label: "Hot Leads", value: "1,847", icon: AlertTriangle, color: "text-amber-400", highlight: true },
    { label: "Contactable", value: "12,394", icon: Mail, color: "text-emerald-400" },
    { label: "Net Worth Tracked", value: "$84.2B", icon: DollarSign, color: "text-violet-400" },
  ];

  const secondaryStats = [
    { label: "Assets", value: "89,473", icon: MapPin },
    { label: "Signal Avg", value: "73.4%", icon: Activity },
    { label: "W-HNWIs", value: "8,942", icon: Globe },
    { label: "Enriched", value: "67.2%", icon: Zap },
  ];

  const wealthTiers = [
    { label: "Ultra >$100M", count: 284, pct: 12, color: "bg-violet-500" },
    { label: "Very $30–100M", count: 892, pct: 38, color: "bg-emerald-500" },
    { label: "HNW $4–30M", count: 671, pct: 28, color: "bg-amber-500" },
    { label: "Unknown", count: 521, pct: 22, color: "bg-muted" },
  ];

  const hotLeads = [
    { name: "Marcus Hjelm", type: "HNWI", nationality: "NOR", score: 94, netWorth: "$47.2M", email: true, phone: true, assets: "Real Estate, Marine" },
    { name: "Offshore Holding AS", type: "Corp", nationality: "NOR", score: 91, netWorth: "$120M", email: true, phone: false, assets: "Marine, Aviation" },
    { name: "Sarah Chen", type: "HNWI", nationality: "USA", score: 89, netWorth: "$68.5M", email: true, phone: true, assets: "Aviation" },
    { name: "Nordic Trust III", type: "Trust", nationality: "SWE", score: 87, netWorth: "$215M", email: false, phone: false, assets: "Real Estate" },
    { name: "James Westbrook", type: "HNWI", nationality: "GBR", score: 84, netWorth: "$52.8M", email: true, phone: false, assets: "Marine, Real Estate" },
  ];

  const liveSignals = [
    { entity: "Alexandra Morrison", event: "New asset registered", category: "Aviation", location: "London, UK", time: "2m ago" },
    { entity: "Omega Capital Ltd", event: "Directorship change", category: "Corporate", location: "Oslo, NO", time: "8m ago" },
    { entity: "Robert Lindgren", event: "Property transfer", category: "Real Estate", location: "Stockholm, SE", time: "14m ago" },
    { entity: "Pacific Holdings", event: "Vessel registration", category: "Marine", location: "Miami, US", time: "22m ago" },
    { entity: "Emma Johannsen", event: "SEC filing update", category: "Corporate", location: "New York, US", time: "31m ago" },
    { entity: "Nordic Marine AS", event: "Ownership change", category: "Marine", location: "Bergen, NO", time: "38m ago" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6">
      <div className="max-w-[1280px] mx-auto space-y-4">
        {/* Hero Stats - 2x2 Grid */}
        <div className="grid grid-cols-4 gap-4">
          {heroStats.map((stat, i) => (
            <div
              key={i}
              className={`bg-[#141824] border border-[#2A3045] rounded-lg p-6 ${
                stat.highlight ? "ring-2 ring-amber-500/30" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                {stat.highlight && (
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-mono text-amber-400 uppercase tracking-wider">
                    Priority
                  </span>
                )}
              </div>
              <div className={`text-3xl font-bold mb-1 ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Secondary Stats - Compact Row */}
        <div className="grid grid-cols-4 gap-3">
          {secondaryStats.map((stat, i) => (
            <div key={i} className="bg-[#141824]/50 border border-[#2A3045]/50 rounded px-4 py-3 flex items-center gap-3">
              <stat.icon className="w-4 h-4 text-[#10B981] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground">{stat.value}</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Wealth Distribution */}
        <div className="bg-[#141824] border border-[#2A3045] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Wealth Distribution</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden mb-3 bg-[#0B0F19]">
            {wealthTiers.map((tier, i) => (
              <div
                key={i}
                className={tier.color}
                style={{ width: `${tier.pct}%` }}
                title={tier.label}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {wealthTiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${tier.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-foreground">{tier.count.toLocaleString()}</div>
                  <div className="text-[9px] font-mono text-muted-foreground truncate">{tier.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Hot Leads Table */}
          <div className="col-span-2 bg-[#141824] border border-[#2A3045] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2A3045] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Top Hot Leads</span>
              </div>
              <span className="text-[10px] font-mono text-amber-500">PRIORITY TARGETS</span>
            </div>
            <div className="divide-y divide-[#2A3045]">
              {hotLeads.map((lead, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#1E2332] transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-foreground group-hover:text-[#10B981] transition-colors truncate">
                          {lead.name}
                        </span>
                        <span className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[9px] font-mono text-violet-400 uppercase shrink-0">
                          {lead.type}
                        </span>
                        <span className="px-1.5 py-0.5 bg-[#141824] border border-[#2A3045] rounded text-[9px] font-mono text-muted-foreground uppercase shrink-0">
                          {lead.nationality}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                        <span className="text-[#10B981]">{lead.netWorth}</span>
                        <span>•</span>
                        <span className="truncate">{lead.assets}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.email && (
                        <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Mail className="w-3 h-3 text-emerald-400" />
                        </div>
                      )}
                      {lead.phone && (
                        <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                          <Phone className="w-3 h-3 text-cyan-400" />
                        </div>
                      )}
                      <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
                        <span className="text-xs font-bold text-amber-400">{lead.score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Signals Feed */}
          <div className="bg-[#141824] border border-[#2A3045] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2A3045] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Live Signals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[9px] font-mono text-[#10B981]">LIVE</span>
              </div>
            </div>
            <div className="divide-y divide-[#2A3045] max-h-[400px] overflow-y-auto">
              {liveSignals.map((signal, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#1E2332] transition-colors cursor-pointer">
                  <div className="font-mono text-xs text-foreground mb-1 truncate">
                    {signal.entity}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mb-2 truncate">
                    {signal.event}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-1.5 py-0.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded text-[9px] font-mono text-[#10B981] uppercase truncate">
                      {signal.category}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                      {signal.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
