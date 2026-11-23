import { useMemo, useState } from "react";
import { useListRelationships, type Relationship } from "@workspace/api-client-react";
import { Link } from "wouter";
import { RefreshCw, Search } from "lucide-react";
import { BoardPageFrame } from "@/components/board-page-frame";

type RelationshipFilter = "all" | "entity" | "asset";

function relationshipLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RelationshipRow({ relationship }: { relationship: Relationship }) {
  const isEntity = relationship.targetType === "Entity";
  return (
    <article className="atlas-connection-record">
      <div className="atlas-connection-record-main">
        <div className="atlas-connection-record-names">
          <Link href={`/profile/${relationship.sourceEntityId}`}>{relationship.sourceEntityName || `Entity #${relationship.sourceEntityId}`}</Link>
          <span aria-hidden="true">→</span>
          {isEntity
            ? <Link href={`/profile/${relationship.targetId}`}>{relationship.targetName || `Entity #${relationship.targetId}`}</Link>
            : <span>{relationship.targetName || `Asset #${relationship.targetId}`}</span>}
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

  return (
    <BoardPageFrame
      className="atlas-board-connections"
      breadcrumb="Connections"
      split
      title="The people between you"
      description="Recorded links between people, organizations and assets. Each connection is taken from Atlas's relationship register."
    >
      <div className="atlas-connections-layout">
        <section className="atlas-connections-console" aria-labelledby="atlas-contacts-console-title">
          <div className="atlas-connections-heading">
            <h2 id="atlas-contacts-console-title">Relationship register</h2>
            <span>{isLoading ? "Loading" : isError ? "Unavailable" : `${counts.all.toLocaleString()} recorded`}</span>
          </div>
          <label className="atlas-connections-search">
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names, relationship types or notes" aria-label="Search relationships" />
          </label>
          <div className="atlas-connections-tabs" role="group" aria-label="Relationship filters">
            <button type="button" className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All {counts.all}</button>
            <button type="button" className={filter === "entity" ? "is-active" : ""} aria-pressed={filter === "entity"} onClick={() => setFilter("entity")}>People / entities {counts.entity}</button>
            <button type="button" className={filter === "asset" ? "is-active" : ""} aria-pressed={filter === "asset"} onClick={() => setFilter("asset")}>Assets {counts.asset}</button>
          </div>
          <div className="atlas-connections-counts" aria-label="Relationship totals">
            <div><strong>{isLoading ? "—" : isError ? "!" : counts.all.toLocaleString()}</strong><span>Loaded relationships</span></div>
            <div><strong>{isLoading ? "—" : isError ? "—" : counts.entity.toLocaleString()}</strong><span>Loaded entity links</span></div>
            <div><strong>{isLoading ? "—" : isError ? "—" : counts.asset.toLocaleString()}</strong><span>Loaded asset links</span></div>
          </div>
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
        </section>

        <section className="atlas-connections-routes" aria-labelledby="atlas-routes-title">
          <div className="atlas-connections-heading">
            <div>
              <h2 id="atlas-routes-title">Recorded connections</h2>
              <p>Newest first · up to 500 records returned by Atlas</p>
            </div>
            <span>{isError ? "Unavailable" : isLoading ? "Loading" : `${visible.length} shown`}</span>
          </div>
          <div className="atlas-connections-record-list" aria-live="polite">
            {isLoading && <p className="atlas-connections-list-state">Loading recorded relationships…</p>}
            {!isLoading && !isError && visible.length === 0 && relationships.length > 0 && (
              <p className="atlas-connections-list-state">No recorded relationships match this search.</p>
            )}
            {!isLoading && !isError && visible.map((relationship) => (
              <RelationshipRow key={relationship.id} relationship={relationship} />
            ))}
          </div>
          <p className="atlas-connections-data-note">Each row shows the relationship record as stored: linked records, type, strength and any saved note. This register does not assign evidence-verification labels.</p>
        </section>
      </div>
    </BoardPageFrame>
  );
}
