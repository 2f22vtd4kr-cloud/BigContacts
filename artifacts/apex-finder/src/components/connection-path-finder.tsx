import { useState } from "react";
import { useGetConnectionPath, useListEntities } from "@workspace/api-client-react";
import { CircleAlert } from "lucide-react";
import { isMockMode } from "@/lib/dev-mock-data";

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

export function ConnectionPathFinder() {
  const mock = isMockMode();
  const entitiesQuery = useListEntities({ limit: 500 }, { query: { enabled: !mock, staleTime: 30_000 } });
  const [sourceId, setSourceId] = useState(0);
  const [targetId, setTargetId] = useState(0);
  const [findPath, setFindPath] = useState(false);
  const routeQuery = useGetConnectionPath({ sourceId, targetId }, {
    query: { enabled: findPath && sourceId > 0 && targetId > 0 && sourceId !== targetId },
  });
  const entities = Array.isArray(entitiesQuery.data) ? entitiesQuery.data : [];

  return (
    <section className="atlas-connections-path-finder" aria-labelledby="atlas-connections-path-finder-title">
      <div className="atlas-connections-path-finder-heading">
        <h3 id="atlas-connections-path-finder-title">Routes through recorded relationships</h3>
        <p>Choose two records to inspect a path through Atlas’s relationship graph.</p>
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
          className="atlas-connections-path-finder-submit"
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
                    <span className="atlas-home-route-node">
                      <span>{node.label}</span>
                      <small>{node.nodeType}</small>
                    </span>
                    {index < routeQuery.data.path.length - 1 && <span className="atlas-home-route-node-arrow" aria-hidden="true">→</span>}
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
          <p className="atlas-home-route-prompt">Choose a starting record and destination to calculate the shortest recorded path through the relationship graph.</p>
        )}
      </div>
    </section>
  );
}
