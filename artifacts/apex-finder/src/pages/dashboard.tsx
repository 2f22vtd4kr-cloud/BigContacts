import { useGetDashboardStats, useGetMapData, useGetHotLeads } from "@workspace/api-client-react";
import { ShieldAlert, Crosshair, Users, MapPin, Database, ChevronRight, Activity, AlertTriangle, Map, Radio } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { formatCurrency, ScoreBadge } from "@/lib/utils";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function createCustomIcon(category: string, isHot: boolean = false) {
  let colorClass = "marker-blue";
  if (category === "RealEstate") colorClass = "marker-emerald";
  else if (category === "Marine") colorClass = "marker-amber";
  else if (category === "Aviation") colorClass = "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]";

  return L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-3 h-3 rounded-full ${colorClass} ${isHot ? 'pulsing-node' : ''} border border-background"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
}

function MapInvalidator({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active) {
      // Wait one frame for the CSS display change to apply before measuring
      const t = setTimeout(() => map.invalidateSize(), 50);
      return () => clearTimeout(t);
    }
  }, [active, map]);
  return null;
}

function StatsBar() {
  const { data: stats } = useGetDashboardStats();

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-20">
      <div className="flex flex-col px-4 py-3 border-r border-border border-b md:border-b-0">
        <span className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
          <Database className="w-3 h-3 mr-1" /> Entities
        </span>
        <span className="text-xl md:text-2xl font-bold text-foreground">{stats.totalEntities}</span>
      </div>
      <div className="flex flex-col px-4 py-3 border-b md:border-b-0 md:border-r md:border-border">
        <span className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
          <MapPin className="w-3 h-3 mr-1" /> Assets
        </span>
        <span className="text-xl md:text-2xl font-bold text-foreground">{stats.totalAssets}</span>
      </div>
      <div className="flex flex-col px-4 py-3 border-r border-border">
        <span className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 flex items-center">
          <Activity className="w-3 h-3 mr-1" /> Signal Avg
        </span>
        <span className="text-xl md:text-2xl font-bold text-primary">{(stats.avgBayesianScore * 100).toFixed(1)}%</span>
      </div>
      <div className="flex flex-col px-4 py-3">
        <span className="text-[10px] md:text-xs font-mono text-amber-500 uppercase tracking-wider mb-1 flex items-center">
          <AlertTriangle className="w-3 h-3 mr-1" /> Hot Leads
        </span>
        <span className="text-xl md:text-2xl font-bold text-amber-500">{stats.hotLeadsCount}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: mapData } = useGetMapData();
  const { data: hotLeads } = useGetHotLeads({ limit: 10 });
  const [mobileTab, setMobileTab] = useState<"map" | "signals">("signals");

  return (
    <div className="flex flex-col md:h-full">
      <StatsBar />

      {/* Mobile tab bar */}
      <div className="flex border-b border-border bg-card/80 md:hidden flex-shrink-0">
        {[
          { id: "map" as const, label: "MAP VIEW", Icon: Map },
          { id: "signals" as const, label: "LIVE SIGNALS", Icon: Radio },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors border-b-2",
              mobileTab === id
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
        {/* Map Section */}
        <div className={cn(
          "relative bg-muted/20",
          mobileTab !== "map" ? "hidden md:block" : "flex flex-col h-[60vh] md:flex-1"
        )}>
          {mapData && (
            <MapContainer
              center={[40.7128, -74.0060]}
              zoom={3}
              style={{ height: "100%", width: "100%", background: "#0B0F19" }}
              zoomControl={false}
            >
              <MapInvalidator active={mobileTab === "map"} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {mapData.map((asset) => (
                <Marker
                  key={asset.id}
                  position={[asset.latitude, asset.longitude]}
                  icon={createCustomIcon(asset.category, (asset.ownerBayesianScore || 0) > 0.8)}
                >
                  <Popup className="dark-popup">
                    <div className="p-1 bg-card text-foreground font-mono text-xs border border-border">
                      <div className="font-bold text-primary mb-1 border-b border-border pb-1">
                        {asset.identifier}
                      </div>
                      <div>Type: {asset.category}</div>
                      <div>Jurisdiction: {asset.jurisdiction}</div>
                      <div>Value: {formatCurrency(asset.estimatedValue)}</div>
                      <div className="mt-1 pt-1 border-t border-border flex justify-between items-center">
                        <span className="text-muted-foreground">{asset.ownerName || "Unknown"}</span>
                        {asset.ownerBayesianScore && (
                          <span className={asset.ownerBayesianScore > 0.8 ? "text-primary" : "text-amber-500"}>
                            {(asset.ownerBayesianScore * 100).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          <div className="absolute bottom-6 left-6 z-[400] bg-card/80 backdrop-blur border border-border p-2 md:p-3 rounded flex space-x-3 md:space-x-4 text-[10px] md:text-xs font-mono">
            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></div>Real Estate</div>
            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></div>Marine</div>
            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></div>Aviation</div>
          </div>
        </div>

        {/* Hot Leads Feed */}
        <div className={cn(
          "border-border bg-card/50 backdrop-blur-sm flex flex-col z-20",
          "md:w-96 md:border-l md:overflow-hidden",
          mobileTab !== "signals" ? "hidden md:flex" : "flex flex-col"
        )}>
          <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
            <h2 className="text-sm font-bold font-mono tracking-wider flex items-center uppercase text-amber-500">
              <ShieldAlert className="w-4 h-4 mr-2" /> Live Signals
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              LIVE
            </span>
          </div>

          <div className="md:flex-1 md:overflow-y-auto divide-y divide-border">
            {hotLeads?.map((lead) => (
              <div key={lead.entityId} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {lead.entityName}
                    </h3>
                    <div className="text-xs font-mono text-muted-foreground mt-1">
                      {lead.entityType} • {lead.nationality || 'Unk'}
                    </div>
                  </div>
                  <ScoreBadge score={lead.bayesianScore} />
                </div>

                <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
                  <span>Net Worth: <span className="text-foreground">{formatCurrency(lead.estimatedNetWorth)}</span></span>
                  <span>Assets: <span className="text-foreground">{lead.assetCount}</span></span>
                </div>

                <div className="bg-background rounded p-2 text-xs font-mono border border-border">
                  <span className="text-primary mr-2">SIGNAL:</span>
                  <span className="text-foreground/80">{lead.signal}</span>
                </div>

                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/graph?entity=${lead.entityId}`}
                    className="text-xs font-mono text-primary flex items-center hover:underline"
                  >
                    View Network <ChevronRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            ))}

            {(!hotLeads || hotLeads.length === 0) && (
              <div className="text-center p-8 text-muted-foreground text-sm font-mono">
                No active signals detected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
