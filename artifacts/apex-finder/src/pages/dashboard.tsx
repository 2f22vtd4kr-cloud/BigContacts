import { useGetDashboardStats } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { isMockMode, mockDashboardStats } from "@/lib/dev-mock-data";
import {
  ChevronRight,
  CircleAlert,
  Database,
  Network,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { LaunchAtlasButton } from "@/components/launch-atlas-button";

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  testId,
  href,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  testId: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="atlas-card atlas-pressable group block p-4 transition-colors hover:border-[#9CFF1A]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CFF1A]/50"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground group-hover:text-[#9CFF1A]">{label}</span>
        <Icon className="atlas-stat-icon h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-[#9CFF1A]/80" />
      </div>
      <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
    </Link>
  );
}

export default function Dashboard() {
  const mock = isMockMode();
  const statsQuery = useGetDashboardStats();
  // Keep the canonical research-lead projection warm without rendering the retired Home feed.
  useQuery({
    queryKey: ["dashboard", "research-leads"],
    queryFn: async () => {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const response = await fetch(`${base}/api/dashboard/research-leads?limit=8`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Research leads request failed (${response.status}).`);
      return response.json() as Promise<{ leads?: unknown[]; sourceLeads?: unknown[]; activeDiscovery?: boolean }>;
    },
    enabled: !mock,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
  const apiHealthQuery = useQuery({
    queryKey: ["dashboard", "api-health"],
    queryFn: async () => {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const response = await fetch(`${base}/api/healthz`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Research API unavailable (" + response.status + ").");
      return response.json() as Promise<Record<string, unknown>>;
    },
    enabled: !mock,
    retry: false,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const stats = mock ? mockDashboardStats() : statsQuery.data;
  const apiUnavailable = !mock && apiHealthQuery.isError;

  return (
    <div className="atlas-page atlas-home-board w-full min-w-0 max-w-full pb-12">
      <div className="atlas-home-board-grid">
        <div className="atlas-home-board-left">
          <section className="atlas-home-board-intro" aria-labelledby="atlas-home-title">
            <h1 id="atlas-home-title">People worth knowing</h1>
            <p>Describe who you want to reach. Atlas searches public records, links the evidence and maps the shortest route to them.</p>
          </section>

          <section className="atlas-home-actions atlas-home-board-console" aria-label="Launch console">
            <div className="atlas-home-console-inner">
              <LaunchAtlasButton variant="primary" className="atlas-home-launch" apiUnavailable={apiUnavailable} onRetryApi={() => { void apiHealthQuery.refetch(); }} />
            </div>
          </section>

          {!mock && (stats as { registryShallowRisk?: boolean } | undefined)?.registryShallowRisk ? (
            <div role="status" data-testid="banner-registry-shallow-risk" className="atlas-home-risk">
              <CircleAlert aria-hidden="true" />
              <p><strong>Registry-shallow risk.</strong> No active web-search provider slots — discovery may stay filings-only until keys are live and the API is restarted.</p>
              <Link href="/status">System status</Link>
            </div>
          ) : null}

          {apiUnavailable && stats && (
            <div className="atlas-home-stale-note" role="status">Saved copy remains visible. Scores may be out of date.</div>
          )}
          <section className="atlas-home-figures" aria-label="Bureau figures">
            <StatTile href="/profiles" label="Entities" value={stats?.totalEntities ?? "—"} detail="people, companies and trusts" icon={Users} testId="stat-total-entities" />
            <StatTile href="/network" label="Relationships" value={stats?.totalRelationships ?? "—"} detail="recorded connections" icon={Network} testId="stat-total-relationships" />
            <StatTile href="/profiles" label="Evidence records" value={stats?.totalAssets ?? "—"} detail="linked public records and assets" icon={Database} testId="stat-total-assets" />
          </section>

        </div>

        <aside className="atlas-home-board-routes" aria-labelledby="atlas-home-routes-title">
          <div className="atlas-home-section-heading">
            <div>
              <h2 id="atlas-home-routes-title">Strongest routes</h2>
              <p>Evidence-backed connections</p>
            </div>
            <Link href="/network" aria-label="Open all connections">All routes <ChevronRight aria-hidden="true" /></Link>
          </div>
          <div className="atlas-home-route-empty">
            <div className="atlas-home-route-empty-line"><span className="atlas-evidence-dot is-verified" /> <strong>Verified</strong><span>Confirmed in a primary record</span></div>
            <div className="atlas-home-route-empty-line"><span className="atlas-evidence-dot is-corroborated" /> <strong>Corroborated</strong><span>Two independent sources agree</span></div>
            <div className="atlas-home-route-empty-line"><span className="atlas-evidence-dot is-review" /> <strong>In review</strong><span>One source so far, a second is pending</span></div>
            <p>{Number(stats?.totalRelationships ?? 0) > 0 ? "Recorded relationships are available in Connections. A ranked, evidence-backed route is shown here only when its complete path is available." : "No routes yet. Launch a run and the strongest evidenced paths will appear here."}</p>
          </div>
        </aside>

      </div>

    </div>
  );
}