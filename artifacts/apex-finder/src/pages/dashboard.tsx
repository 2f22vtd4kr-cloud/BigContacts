import { getGetDashboardStatsQueryKey, useGetDashboardStats } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { isMockMode, mockDashboardStats } from "@/lib/dev-mock-data";
import { ChevronRight, CircleAlert } from "lucide-react";
import { Link } from "wouter";
import { LaunchAtlasButton, type HomeSourceReadiness } from "@/components/launch-atlas-button";

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
      <span className="atlas-home-figure-value">{typeof value === "number" ? value.toLocaleString("en-US") : value}</span>
      <span className="atlas-home-figure-label">{label}</span>
    </Link>
  );
}

export default function Dashboard() {
  const mock = isMockMode();
  const statsQuery = useGetDashboardStats({ query: { enabled: !mock, queryKey: getGetDashboardStatsQueryKey() } });
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
  const objectiveMaxChars = (apiHealthQuery.data as { launchLimits?: { discoveryObjectiveMaxChars?: unknown } } | undefined)?.launchLimits?.discoveryObjectiveMaxChars;
  const hasAtlasHealth = typeof objectiveMaxChars === "number" && Number.isSafeInteger(objectiveMaxChars) && objectiveMaxChars > 0;
  const apiUnavailable = !mock && apiHealthQuery.isFetched && (apiHealthQuery.isError || !hasAtlasHealth);
  const sourceAvailabilityQuery = useQuery({
    queryKey: ["dashboard", "source-availability"],
    queryFn: async (): Promise<HomeSourceReadiness> => {
      const unknown: HomeSourceReadiness = { webSearch: "unknown", registries: "unknown", footprint: "unknown" };
      try {
        const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
        const [statusResponse, registryResponse] = await Promise.all([
          fetch(`${base}/api/system/status`, { credentials: "include", cache: "no-store" }),
          fetch(`${base}/api/registry-matrix`, { credentials: "include", cache: "no-store" }),
        ]);
        if (!statusResponse.ok || !registryResponse.ok) return unknown;
        const [status, registry] = await Promise.all([statusResponse.json(), registryResponse.json()]);
        const ai = (status?.ai ?? {}) as Record<string, Array<{ state?: string }> | undefined>;
        const pythonTools = (status?.pythonTools ?? {}) as Record<string, boolean>;
        const registries = Array.isArray(registry?.sources) ? registry.sources : [];
        return {
          webSearch: ["serper", "tavily", "exa"].some((key) => ai[key]?.some((slot) => slot.state === "active")) ? "ready" : "unavailable",
          registries: registries.some((source: { productionReviewStatus?: string; runtimeAdapterImplemented?: boolean }) => source.productionReviewStatus === "reviewed_for_production" && source.runtimeAdapterImplemented === true) ? "ready" : "unavailable",
          footprint: Object.values(pythonTools).some(Boolean) ? "ready" : "unavailable",
        };
      } catch { return unknown; }
    },
    enabled: !mock && apiHealthQuery.isSuccess && hasAtlasHealth && !apiUnavailable,
    retry: false, staleTime: 60_000, refetchInterval: 60_000, refetchOnWindowFocus: true,
  });
  const sourceStatuses: HomeSourceReadiness = apiUnavailable
    ? { webSearch: "unavailable", registries: "unavailable", footprint: "unavailable" }
    : sourceAvailabilityQuery.data ?? { webSearch: "unknown", registries: "unknown", footprint: "unknown" };

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
              <LaunchAtlasButton variant="primary" className="atlas-home-launch" apiUnavailable={apiUnavailable} sourceStatuses={sourceStatuses} onRetryApi={() => { void apiHealthQuery.refetch(); }} />
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
            <StatTile href="/network" label="Relationships" value={stats?.totalRelationships ?? "—"} testId="stat-total-relationships" />
            <StatTile href="/profiles" label="Assets" value={stats?.totalAssets ?? "—"} testId="stat-total-assets" />
          </section>

        </div>

        <aside className="atlas-home-board-routes" aria-labelledby="atlas-home-routes-title">
          <div className="atlas-home-section-heading">
            <div>
              <h2 id="atlas-home-routes-title">Strongest routes</h2>
              <p>Evidence-backed paths through the recorded network</p>
            </div>
            <Link href="/network" aria-label="Open all connections">All connections <ChevronRight aria-hidden="true" /></Link>
          </div>
          <div className="atlas-home-route-card">
            <div className="atlas-home-route-empty">
              {apiUnavailable ? (
                <><strong>Route data unavailable</strong><p>Atlas could not confirm recorded routes while the research API is offline.</p></>
              ) : (
                <><strong>No routes yet</strong><p>The register contains entity and asset links, but no personal contact routes to rank yet. Use Connections to inspect recorded links or calculate a shortest path.</p>
                  <Link href="/network" className="atlas-home-route-empty-link">Find a shortest path in Connections <ChevronRight aria-hidden="true" /></Link>
                </>
              )}
            </div>
            <div className="atlas-home-route-legend" aria-label="Route evidence status legend">
            <div><span className="atlas-evidence-pattern is-supported" aria-hidden="true" /><strong>Supported</strong><span>Provenance meets Atlas’s support threshold</span></div>
            <div><span className="atlas-evidence-pattern is-corroborated" aria-hidden="true" /><strong>Corroborated</strong><span>Independent sources support the same claim</span></div>
            <div><CircleAlert className="atlas-evidence-disputed-mark" aria-hidden="true" /><strong>Disputed</strong><span>The relationship carries a dispute or rejection note</span></div>
              <div><span className="atlas-evidence-pattern is-review" aria-hidden="true" /><strong>In review</strong><span>Provenance does not meet the support threshold yet</span></div>
            </div>
          </div>
        </aside>

      </div>

    </div>
  );
}