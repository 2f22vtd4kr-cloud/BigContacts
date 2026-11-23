import { useGetDashboardStats, useListRelationships } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { isMockMode, mockDashboardStats } from "@/lib/dev-mock-data";
import { ChevronRight, CircleAlert } from "lucide-react";
import { Link } from "wouter";
import { LaunchAtlasButton } from "@/components/launch-atlas-button";

function StatTile({
  label,
  value,
  testId,
  href,
}: {
  label: string;
  value: string | number;
  testId: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="atlas-home-figure"
    >
      <span className="atlas-home-figure-value">{value}</span>
      <span className="atlas-home-figure-label">{label}</span>
    </Link>
  );
}

export default function Dashboard() {
  const mock = isMockMode();
  const statsQuery = useGetDashboardStats();
  const relationshipsQuery = useListRelationships(undefined, { query: { enabled: !mock, staleTime: 10_000, refetchOnWindowFocus: true } });
  const recentRelationships = useMemo(() => (Array.isArray(relationshipsQuery.data) ? relationshipsQuery.data : []).slice(0, 4), [relationshipsQuery.data]);
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
            <StatTile href="/profiles" label="People" value={stats?.totalEntities ?? "—"} testId="stat-total-entities" />
            <StatTile href="/network" label="Routes" value={stats?.totalRelationships ?? "—"} testId="stat-total-relationships" />
            <StatTile href="/profiles" label="Evidence records" value={stats?.totalAssets ?? "—"} testId="stat-total-assets" />
          </section>

        </div>

        <aside className="atlas-home-board-routes" aria-labelledby="atlas-home-routes-title">
          <div className="atlas-home-section-heading">
            <div>
              <h2 id="atlas-home-routes-title">Recent connections</h2>
              <p>Recorded relationship edges</p>
            </div>
            <Link href="/network" aria-label="Open all connections">All connections <ChevronRight aria-hidden="true" /></Link>
          </div>
          {relationshipsQuery.isError ? (
            <div className="atlas-home-route-empty" role="status">The relationship register is unavailable. Retry from Connections.</div>
          ) : recentRelationships.length > 0 ? (
            <div className="atlas-home-recent-connections">
              {recentRelationships.map((relationship) => (
                <div className="atlas-home-recent-connection" key={relationship.id}>
                  <div className="atlas-home-recent-connection-names">
                    <Link href={`/profile/${relationship.sourceEntityId}`}>{relationship.sourceEntityName || `Entity #${relationship.sourceEntityId}`}</Link>
                    <span aria-hidden="true">→</span>
                    {relationship.targetType === "Entity"
                      ? <Link href={`/profile/${relationship.targetId}`}>{relationship.targetName || `Entity #${relationship.targetId}`}</Link>
                      : <span>{relationship.targetName || `Asset #${relationship.targetId}`}</span>}
                  </div>
                  <span className="atlas-home-recent-connection-type">{relationship.relationshipType.toLowerCase().replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="atlas-home-route-empty" role="status">
              {relationshipsQuery.isLoading ? "Loading recorded connections…" : "No relationship records yet. Connections will appear here when Atlas records them."}
            </div>
          )}
        </aside>

      </div>

    </div>
  );
}