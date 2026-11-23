import { useEffect, useMemo, useState } from "react";
import { useListEntities } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AlertTriangle, ArrowUpRight, RefreshCw, Search } from "lucide-react";
import { BoardPageFrame } from "@/components/board-page-frame";
import { displayEntityType, entityEvidenceLabel, entityWorkSummary } from "@/lib/utils";
import { normalizeEntityType } from "@/lib/entity-taxonomy";
import { resolveBoardEvidenceStatus, type BoardEvidenceStatus } from "@/lib/board-ledger-evidence";

function evidenceStatusLabel(status: BoardEvidenceStatus) {
  if (status === "verified") return "Verified";
  if (status === "corroborated") return "Corroborated";
  if (status === "disputed") return "Disputed";
  return "In review";
}

function initials(value: unknown): string {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("") || "—";
}

function sourceList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch { return []; }
}

function scoreLabel(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 ? score.toFixed(2) : "—";
}

export default function BoardLedgerPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | BoardEvidenceStatus>("all");
  const [visibleCount, setVisibleCount] = useState(5);
  const { data: rawEntities, isLoading, isError, refetch } = useListEntities({ limit: 500 });

  const entities = useMemo(() => {
    const raw = Array.isArray(rawEntities)
      ? rawEntities
      : Array.isArray((rawEntities as any)?.entities)
        ? (rawEntities as any).entities
        : [];
    // Preserve the API's reachability-first order; do not re-rank by wealth locally.
    return raw
      .filter((entity: any) => !entity.isHidden)
      .filter((entity: any) => ["HNWI", "PersonCandidate", "Gatekeeper"].includes(normalizeEntityType(displayEntityType(entity))))
      .map((entity: any) => ({ ...entity, boardBoardEvidenceStatus: resolveBoardEvidenceStatus(entity.contacts) }));
  }, [rawEntities]);

  const counts = useMemo(() => ({
    all: entities.length,
    verified: entities.filter((entity: any) => entity.boardBoardEvidenceStatus === "verified").length,
    corroborated: entities.filter((entity: any) => entity.boardBoardEvidenceStatus === "corroborated").length,
    review: entities.filter((entity: any) => entity.boardBoardEvidenceStatus === "review").length,
    disputed: entities.filter((entity: any) => entity.boardBoardEvidenceStatus === "disputed").length,
  }), [entities]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return entities.filter((entity: any) => {
      if (filter !== "all" && entity.boardBoardEvidenceStatus !== filter) return false;
      if (!query) return true;
      const role = entityWorkSummary(entity) ?? "";
      const sources = sourceList(entity.sourceRegistries).join(" ");
      return [entity.name, role, entity.type, entity.nationality, sources, entity.contactOutcome].some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
    });
  }, [entities, filter, search]);

  useEffect(() => { setVisibleCount(5); }, [filter, search]);
  const displayed = visible.slice(0, visibleCount);
  const staleDataAvailable = isError && entities.length > 0;

  return (
    <BoardPageFrame
      className="atlas-board-ledger"
      split
      title="Everyone on the register"
      description="The Ledger is the Bureau’s register. Each person Atlas has found is entered once, with the evidence that stands behind them."
    >
      <div className="atlas-ledger-layout">
        <section className="atlas-ledger-console" aria-labelledby="atlas-ledger-console-title">
          <div className="atlas-ledger-section-heading">
            <h2 id="atlas-ledger-console-title">Register console</h2>
            <span>Strongest first</span>
          </div>
          <label className="atlas-ledger-search">
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the register…" aria-label="Search the register" />
          </label>
          <div className="atlas-ledger-filters" role="group" aria-label="Filter register by evidence status">
            {([
              { value: "all", label: "All", count: counts.all },
              { value: "verified", label: "Verified", count: counts.verified },
              { value: "corroborated", label: "Corroborated", count: counts.corroborated },
              { value: "review", label: "In review", count: counts.review },
              ...(counts.disputed > 0 ? [{ value: "disputed" as const, label: "Disputed", count: counts.disputed }] : []),
            ] as const).map((item) => (
              <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
                <span>{item.label}</span><strong>{item.count}</strong>
              </button>
            ))}
          </div>
          <div className="atlas-ledger-counts" aria-label="Evidence status totals">
            <div><strong>{counts.verified.toLocaleString()}</strong><span>Verified</span></div>
            <div><strong>{counts.corroborated.toLocaleString()}</strong><span>Corroborated</span></div>
            <div><strong>{counts.review.toLocaleString()}</strong><span>In review</span></div>
          </div>
        </section>

        <section className="atlas-ledger-register" aria-labelledby="atlas-ledger-register-title">
          <div className="atlas-ledger-register-heading">
            <div>
              <h2 id="atlas-ledger-register-title">Register</h2>
              <p>Every person appears once, with the record behind them.</p>
            </div>
            <div className="atlas-ledger-register-meta">
              <span>Showing</span>
              <strong>{displayed.length} of {visible.length}</strong>
            </div>
          </div>

          {isLoading && !rawEntities ? (
            <div className="atlas-ledger-state" role="status">Loading the register…</div>
          ) : staleDataAvailable ? (
            <div className="atlas-ledger-stale" role="alert">
              <div><strong>Atlas can’t reach the research API.</strong><span>Showing the saved register. Evidence statuses may be out of date.</span></div>
              <button type="button" onClick={() => void refetch()}><RefreshCw aria-hidden="true" /> Retry</button>
            </div>
          ) : isError && entities.length === 0 ? (
            <div className="atlas-ledger-state" role="alert">
              <strong>The register could not be loaded.</strong>
              <span>Saved research remains intact. Retry when the API is available.</span>
              <button type="button" onClick={() => void refetch()}><RefreshCw aria-hidden="true" /> Retry</button>
            </div>
          ) : visible.length === 0 ? (
            <div className="atlas-ledger-state">
              <strong>{search || filter !== "all" ? "No entries match this view." : "No one on the register yet."}</strong>
              <span>{search || filter !== "all" ? "Clear the search or choose another evidence status." : "Run a free dig from Overview and the first evidence-backed person will appear here."}</span>
              {!search && filter === "all" && <Link href="/" className="atlas-ledger-empty-link">Open Overview <ArrowUpRight aria-hidden="true" /></Link>}
            </div>
          ) : (
            <div className="atlas-ledger-table-wrap">
              <table className="atlas-ledger-table">
                <thead><tr><th>Person</th><th>Evidence</th><th>Score</th><th>Sources</th></tr></thead>
                <tbody>
                  {displayed.map((entity: any) => {
                    const sources = sourceList(entity.sourceRegistries).filter((source) => !/^(manual|user|seed|imported)$/i.test(source));
                    const evidence = entity.boardBoardEvidenceStatus as BoardEvidenceStatus;
                    const pattern = evidence === "verified" ? "supported" : evidence === "corroborated" ? "corroborated" : evidence === "review" ? "review" : null;
                    const role = entityWorkSummary(entity);
                    return (
                      <tr key={entity.id}>
                        <td>
                          <Link href={"/profile/" + entity.id} className="atlas-ledger-person">
                            <span className={"atlas-ledger-avatar is-" + evidence}>{initials(entity.name)}</span>
                            <span><strong>{entity.name || "Unnamed record"}</strong><small>{role || entity.type || "Person"}</small></span>
                            <ArrowUpRight aria-hidden="true" />
                          </Link>
                        </td>
                        <td>
                          <span className={"atlas-ledger-status is-" + evidence}>
                            {pattern && <span className={"atlas-evidence-pattern is-" + pattern} aria-hidden="true" />}
                            {evidence === "disputed" && <AlertTriangle className="atlas-evidence-disputed-mark" aria-hidden="true" />}
                            {evidenceStatusLabel(evidence)}
                          </span>
                        </td>
                        <td className="atlas-ledger-score">{scoreLabel(entity.bayesianScore)}</td>
                        <td className="atlas-ledger-sources">{sources.length > 0 ? sources[0] + (sources.length > 1 ? " + " + (sources.length - 1) : "") : entityEvidenceLabel(entity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visible.length > displayed.length && (
                <button type="button" className="atlas-ledger-view-all" onClick={() => setVisibleCount((value) => Math.min(visible.length, value + 25))}>
                  Show 25 more
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </BoardPageFrame>
  );
}
