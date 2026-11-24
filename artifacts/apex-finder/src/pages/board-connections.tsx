import { useMemo, useState } from "react";
import { useListRelationships, type Relationship } from "@workspace/api-client-react";
import { Link } from "wouter";
import { RefreshCw, Search } from "lucide-react";
import { ConnectionPathFinder } from "@/components/connection-path-finder";

type RelationshipFilter = "all" | "entity" | "asset";

function relationshipLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RelationshipRow({ relationship }: { relationship: Relationship }) {
  const isEntity = relationship.targetType === "Entity";
  const sourceName = relationship.sourceEntityName || `Entity #${relationship.sourceEntityId}`;
  const targetName = relationship.targetName || `${isEntity ? "Entity" : "Asset"} #${relationship.targetId}`;

  return (
    <article className="atlas-connection-record" aria-label={`Relationship: ${sourceName} to ${targetName}`}>
      <div className="atlas-connection-record-main">
        <div className="atlas-connection-record-names">
          <Link className="atlas-connection-record-node" href={`/profile/${relationship.sourceEntityId}`}>{sourceName}</Link>
          <span className="sr-only">is linked to</span>
          <span className="atlas-connection-record-hop" aria-hidden="true" />
          {isEntity
            ? <Link className="atlas-connection-record-node" href={`/profile/${relationship.targetId}`}>{targetName}</Link>
            : <span className="atlas-connection-record-node">{targetName}</span>}
        </div>
        <div className="atlas-connection-record-meta">
          <span>{relationshipLabel(relationship.relationshipType)}</span>
          <span>{isEntity ? "Entity link" : "Asset link"}</span>
          {typeof relationship.strength === "number" && <span>Strength {relationship.strength.toFixed(2)}</span>}
        </div>
        {relationship.notes?.trim() && <p className="atlas-connection-record-note">{relationship.notes}</p>}
      </div>
      <time dateTime={relationship.createdAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(relationship.createdAt))}</time>
    </article>
  );
}

export default function BoardConnectionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RelationshipFilter>("all");
  const { data, isLoading, isError, refetch } = useListRelationships(undefined, {
    query: { staleTime: 10_000, refetchOnWindowFocus: true },
  });

  const relationships = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const counts = useMemo(() => ({
    all: relationships.length,
    entity: relationships.filter((item) => item.targetType === "Entity").length,
    asset: relationships.filter((item) => item.targetType === "Asset").length,
  }), [relationships]);
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return relationships.filter((item) => {
      if (filter === "entity" && item.targetType !== "Entity") return false;
      if (filter === "asset" && item.targetType !== "Asset") return false;
      if (!needle) return true;
      return [
        item.sourceEntityName,
        item.targetName,
        item.relationshipType,
        item.notes,
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(needle));
    });
  }, [relationships, search, filter]);
  const displayCount = (value: number) => isLoading || isError ? "—" : value.toLocaleString();

  return (
    <div className="atlas-board-page atlas-board-connections">
      <div className="atlas-connections-layout">
        <div className="atlas-connections-left-column">
          <header className="atlas-board-page-intro">
            <h1>The people between you</h1>
            <p>Recorded links between people, organizations and assets. Each connection is taken from Atlas&apos;s relationship register.</p>
          </header>

          <section className="atlas-connections-console" aria-labelledby="atlas-relationship-console-title">
            <div className="atlas-connections-console-inner">
              <div className="atlas-connections-heading">
                <h2 id="atlas-relationship-console-title">Relationship register</h2>
                <span>{isLoading ? "Loading" : isError ? "Unavailable" : `${counts.all.toLocaleString()} recorded`}</span>
              </div>
              <label className="atlas-connections-search">
                <Search aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names, links or notes" aria-label="Search relationships" />
              </label>
              <div className="atlas-connections-tabs" role="group" aria-label="Relationship filters">
                <button type="button" className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All {displayCount(counts.all)}</button>
                <button type="button" className={filter === "entity" ? "is-active" : ""} aria-pressed={filter === "entity"} onClick={() => setFilter("entity")}>Entity links {displayCount(counts.entity)}</button>
                <button type="button" className={filter === "asset" ? "is-active" : ""} aria-pressed={filter === "asset"} onClick={() => setFilter("asset")}>Assets {displayCount(counts.asset)}</button>
              </div>
              <p className="atlas-connections-console-note">Only recorded relationships are shown. Atlas does not infer personal contacts or verification status.</p>
              {isError && (
                <div className="atlas-connections-empty" role="alert">
                  <strong>The relationship register could not be loaded.</strong>
                  <p>Atlas could not retrieve the current relationship records. Try again or check system status.</p>
                  <button type="button" className="atlas-connections-retry" onClick={() => void refetch()}><RefreshCw aria-hidden="true" /> Retry</button>
                </div>
              )}
              {!isLoading && !isError && relationships.length === 0 && (
                <div className="atlas-connections-empty" role="status">
                  <strong>No relationships have been recorded yet.</strong>
                  <p>This is an empty register, not an unavailable contact source. Relationships will appear when Atlas records them.</p>
                </div>
              )}
            </div>
          </section>

          <div className="atlas-connections-counts" aria-label="Relationship totals">
            <div><strong>{displayCount(counts.all)}</strong><span>Relationships</span></div>
            <div><strong>{displayCount(counts.entity)}</strong><span>Entity links</span></div>
            <div><strong>{displayCount(counts.asset)}</strong><span>Asset links</span></div>
          </div>
        </div>

        <div className="atlas-connections-right-column">
          <section className="atlas-connections-route-panel" aria-label="Shortest path finder">
            <ConnectionPathFinder />
          </section>

          <section className="atlas-connections-routes" aria-labelledby="atlas-routes-title">
            <div className="atlas-connections-heading">
              <div>
                <h2 id="atlas-routes-title">Recorded relationships</h2>
                <p>Atlas records · filtered here</p>
              </div>
              <span>{isError ? "Unavailable" : isLoading ? "Loading" : `${visible.length} shown`}</span>
            </div>
            <div className="atlas-connections-record-list" aria-live="polite">
              {isLoading && <p className="atlas-connections-list-state">Loading recorded relationships…</p>}
              {!isLoading && !isError && visible.length === 0 && relationships.length > 0 && (
                <p className="atlas-connections-list-state">No recorded relationships match this search.</p>
              )}
              {!isLoading && !isError && relationships.length === 0 && (
                <p className="atlas-connections-list-state">No relationship records were returned by Atlas.</p>
              )}
              {!isLoading && !isError && visible.map((relationship) => (
                <RelationshipRow key={relationship.id} relationship={relationship} />
              ))}
            </div>
            <p className="atlas-connections-data-note">Each row shows the relationship record as stored: linked records, type, strength and any saved note. This register does not assign evidence-verification labels.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
