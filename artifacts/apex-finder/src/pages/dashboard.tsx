import { useGetDashboardStats, useGetConnectionPath, useListEntities } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { isMockMode, mockDashboardStats } from "@/lib/dev-mock-data";
import { ChevronRight, CircleAlert } from "lucide-react";
import { Link } from "wouter";
import { LaunchAtlasButton } from "@/components/launch-atlas-button";

type RouteEvidenceStatus = "supported" | "corroborated" | "disputed" | "review" | "rejected" | "unclassified";

function routeEvidenceStatus(value: unknown): RouteEvidenceStatus {
  const status = String(value ?? "").toLowerCase();
  return ["supported", "corroborated", "disputed", "review", "rejected"].includes(status)
    ? status as RouteEvidenceStatus
    : "unclassified";
}

function routeEvidenceLabel(status: RouteEvidenceStatus) {
  return status === "review" ? "In review" : status === "unclassified" ? "Status unavailable" : status[0].toUpperCase() + status.slice(1);
}

function routePatternStatus(edges: Array<{ evidenceStatus?: unknown }>): "supported" | "corroborated" | "disputed" | "review" {
  const statuses = edges.map((edge) => routeEvidenceStatus(edge.evidenceStatus));
  if (statuses.length === 0 || statuses.some((status) => ["review", "rejected", "unclassified"].includes(status))) return "review";
  if (statuses.includes("disputed")) return "disputed";
  if (statuses.includes("corroborated")) return "corroborated";
  return "supported";
}

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
  const statsQuery = useGetDashboardStats();
  const entitiesQuery = useListEntities({ limit: 500 }, { query: { enabled: !mock, staleTime: 30_000 } });
  const [sourceId, setSourceId] = useState(0);
  const [targetId, setTargetId] = useState(0);
  const [findPath, setFindPath] = useState(false);
  const routeQuery = useGetConnectionPath({ sourceId, targetId }, {
    query: { enabled: findPath && sourceId > 0 && targetId > 0 && sourceId !== targetId },
  });
  const entities = Array.isArray(entitiesQuery.data) ? entitiesQuery.data : [];
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
            <StatTile href="/network" label="Relationships" value={stats?.totalRelationships ?? "—"} testId="stat-total-relationships" />
            <StatTile href="/profiles" label="Assets" value={stats?.totalAssets ?? "—"} testId="stat-total-assets" />
          </section>

        </div>

        <aside className="atlas-home-board-routes" aria-labelledby="atlas-home-routes-title">
          <div className="atlas-home-section-heading">
            <div>
              <h2 id="atlas-home-routes-title">Shortest connection path</h2>
              <p>Warm-introduction route between two recorded entities</p>
            </div>
            <Link href="/network" aria-label="Open all connections">All connections <ChevronRight aria-hidden="true" /></Link>
          </div>
          <div className="atlas-home-route-finder">
            <label>
              <span>Starting record</span>
              <select
                value={sourceId || ""}
                disabled={mock || entitiesQuery.isLoading || entities.length === 0}
                onChange={(event) => { setSourceId(Number(event.target.value)); setFindPath(false); }}
              >
                <option value="">Choose a starting record</option>
                {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.type}</option>)}
              </select>
            </label>
            <label>
              <span>Destination</span>
              <select
                value={targetId || ""}
                disabled={mock || entitiesQuery.isLoading || entities.length === 0}
                onChange={(event) => { setTargetId(Number(event.target.value)); setFindPath(false); }}
              >
                <option value="">Choose a destination</option>
                {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.type}</option>)}
              </select>
            </label>
            <button
              type="button"
              disabled={mock || entitiesQuery.isLoading || sourceId <= 0 || targetId <= 0 || sourceId === targetId || routeQuery.isFetching}
              onClick={() => setFindPath(true)}
            >
              {routeQuery.isFetching ? "Finding path…" : "Find shortest path"}
            </button>
            {sourceId > 0 && sourceId === targetId && <p role="status">Choose two different records.</p>}
            {mock && <p role="status">Route search is disabled in the design preview.</p>}
            {!mock && entitiesQuery.isError && <p role="alert">The entity register could not be loaded. Check System status.</p>}
            {!mock && !entitiesQuery.isLoading && !entitiesQuery.isError && entities.length === 0 && <p role="status">No visible entities are available to build a route.</p>}
            {findPath && routeQuery.isLoading && <p role="status">Calculating the shortest path through the recorded network…</p>}
            {findPath && routeQuery.isError && (
              <p role="alert">The route could not be calculated. <button type="button" onClick={() => void routeQuery.refetch()}>Retry</button></p>
            )}
            {findPath && routeQuery.data && !routeQuery.data.found && (
              <p className="atlas-home-route-result-empty" role="status">{routeQuery.data.recommendation || "No connection path was found within the loaded graph neighborhood."}</p>
            )}
            {findPath && routeQuery.data?.found && (
              <div className={"atlas-route-pattern-card is-" + routePatternStatus(routeQuery.data.edges)}>
              <div className="atlas-home-route-result" aria-live="polite">
                <div className="atlas-home-route-result-meta">
                  <span>{routeQuery.data.hops} hops</span>
                  {typeof routeQuery.data.pathScore === "number" && <strong>{Math.round(routeQuery.data.pathScore * 100)}% path confidence</strong>}
                </div>
                <ol className="atlas-home-route-nodes">
                  {routeQuery.data.path.map((node, index) => (
                    <li key={node.id}>
                      <span>{node.label}</span>
                      <small>{node.nodeType}</small>
                      {index < routeQuery.data.path.length - 1 && <span className="atlas-home-route-node-arrow" aria-hidden="true">↓</span>}
                    </li>
                  ))}
                </ol>
                {routeQuery.data.edges.length > 0 && (
                  <ul className="atlas-home-route-evidence">
                    {routeQuery.data.edges.map((edge) => {
                      const status = routeEvidenceStatus((edge as any).evidenceStatus);
                      const hasPattern = status === "supported" || status === "corroborated" || status === "review";
                      return (
                        <li key={edge.id}>
                          {hasPattern
                            ? <span className={"atlas-evidence-pattern is-" + status} aria-hidden="true" />
                            : (status === "disputed" || status === "rejected")
                              ? <CircleAlert className="atlas-evidence-disputed-mark" aria-hidden="true" />
                              : null}
                          <span>{edge.label}</span>
                          <strong>{routeEvidenceLabel(status)}</strong>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {routeQuery.data.recommendation && <p className="atlas-home-route-recommendation">{routeQuery.data.recommendation}</p>}
              </div>
              </div>
            )}
            {!findPath && !mock && !entitiesQuery.isLoading && entities.length > 0 && (
              <p className="atlas-home-route-prompt">Choose a starting record and destination to calculate the shortest warm-introduction path.</p>
            )}
          </div>
          <div className="atlas-home-route-legend" aria-label="Route evidence status legend">
            <div><span className="atlas-evidence-pattern is-supported" aria-hidden="true" /><strong>Supported</strong><span>Provenance meets Atlas’s support threshold</span></div>
            <div><span className="atlas-evidence-pattern is-corroborated" aria-hidden="true" /><strong>Corroborated</strong><span>Independent sources support the same claim</span></div>
            <div><CircleAlert className="atlas-evidence-disputed-mark" aria-hidden="true" /><strong>Disputed</strong><span>The relationship carries a dispute or rejection note</span></div>
            <div><span className="atlas-evidence-pattern is-review" aria-hidden="true" /><strong>In review</strong><span>Provenance does not meet the support threshold yet</span></div>
          </div>
        </aside>

      </div>

    </div>
  );
}