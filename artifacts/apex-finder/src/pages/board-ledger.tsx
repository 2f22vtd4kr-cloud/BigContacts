import { useMemo, useState } from "react";
import { useListEntities } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowUpRight, RefreshCw, Search } from "lucide-react";
import { entityEvidenceLabel, entityWorkSummary } from "@/lib/utils";

type EvidenceStatus = "verified" | "corroborated" | "review";

function parseMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

function sourceList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch { return []; }
}

function evidenceStatus(entity: any): EvidenceStatus {
  const metadata = parseMetadata(entity.metadata);
  const level = String(entity.verificationLevel ?? metadata.verificationLevel ?? metadata.evidenceStatus ?? metadata.verificationStatus ?? "").toLowerCase();
  if (level === "verified") return "verified";
  if (level === "corroborated") return "corroborated";
  return "review";
}

function statusLabel(status: EvidenceStatus) {
  return status === "verified" ? "Verified" : status === "corroborated" ? "Corroborated" : "In review";
}

function scoreLabel(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 ? score.toFixed(2) : "—";
}

export default function BoardLedgerPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | EvidenceStatus>("all");
  const [showAll, setShowAll] = useState(false);
  const { data: rawEntities, isLoading, isError, refetch } = useListEntities({ limit: 500 });

  const entities = useMemo(() => {
    const raw = Array.isArray(rawEntities)
      ? rawEntities
      : Array.isArray((rawEntities as any)?.entities)
        ? (rawEntities as any).entities
        : [];
    return raw
      .filter((entity: any) => !entity.isHidden)
      .map((entity: any) => ({ ...entity, boardEvidenceStatus: evidenceStatus(entity) }))
      .sort((a: any, b: any) => Number(b.bayesianScore ?? 0) - Number(a.bayesianScore ?? 0));
  }, [rawEntities]);

  const counts = useMemo(() => ({
    all: entities.length,
    verified: entities.filter((entity: any) => entity.boardEvidenceStatus === "verified").length,
    corroborated: entities.filter((entity: any) => entity.boardEvidenceStatus === "corroborated").length,
    review: entities.filter((entity: any) => entity.boardEvidenceStatus === "review").length,
  }), [entities]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return entities.filter((entity: any) => {
      if (filter !== "all" && entity.boardEvidenceStatus !== filter) return false;
      if (!query) return true;
      const role = entityWorkSummary(entity) ?? "";
      const sources = sourceList(entity.sourceRegistries).join(" ");
      return [entity.name, role, entity.type, entity.nationality, sources].some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
    });
  }, [entities, filter, search]);
  const displayed = showAll ? visible : visible.slice(0, 8);

  return (
    <div className="atlas-board-page atlas-board-ledger">
      <header className="atlas-board-page-intro">
        <h1>Everyone on the register</h1>
        <p>The Ledger is the Bureau’s register. Each person Atlas has found is entered once, with the evidence that stands behind them.</p>
      </header>

      <div className="atlas-ledger-layout">
        <section className="atlas-ledger-console" aria-labelledby="atlas-ledger-console-title">
          <div className="atlas-ledger-section-heading">
            <h2 id="atlas-ledger-console-title">Register console</h2>
            <span>Strongest first</span>
          </div>
          <label className="atlas-ledger-search">
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, roles or registers" aria-label="Search people, roles or registers" />
          </label>
          <div className="atlas-ledger-filters" role="group" aria-label="Filter register by evidence status">
            {([
              { value: "all", label: "All", count: counts.all },
              { value: "verified", label: "Verified", count: counts.verified },
              { value: "corroborated", label: "Corroborated", count: counts.corroborated },
              { value: "review", label: "In review", count: counts.review },
            ] as const).map((item) => (
              <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
                <span>{item.label}</span><strong>{item.count}</strong>
              </button>
            ))}
          </div>
          <p className="atlas-ledger-console-note">A person is entered only with a recorded source. Open any entry in Reactor to see every step behind it.</p>
          <Link className="atlas-ledger-reactor-link" href="/reactor">Open the research logbook <ArrowUpRight aria-hidden="true" /></Link>
        </section>

        <section className="atlas-ledger-register" aria-labelledby="atlas-ledger-register-title">
          <div className="atlas-ledger-register-heading">
            <div>
              <h2 id="atlas-ledger-register-title">Register</h2>
              <p>Every person on the register, strongest first. The pattern on each row and the written status always say the same thing.</p>
            </div>
            <span>{displayed.length} of {visible.length}</span>
          </div>

          {isLoading ? (
            <div className="atlas-ledger-state" role="status">Loading the register…</div>
          ) : isError ? (
            <div className="atlas-ledger-state" role="alert">
              <strong>The register could not be loaded.</strong>
              <span>Saved research remains intact. Retry when the API is available.</span>
              <button type="button" onClick={() => void refetch()}><RefreshCw aria-hidden="true" /> Retry</button>
            </div>
          ) : visible.length === 0 ? (
            <div className="atlas-ledger-state">
              <strong>{search || filter !== "all" ? "No entries match this view." : "The register is empty."}</strong>
              <span>{search || filter !== "all" ? "Clear the search or choose another evidence status." : "Launch Atlas to begin. Only source-backed research lands here; no specimen records are shown."}</span>
            </div>
          ) : (
            <div className="atlas-ledger-table-wrap">
              <table className="atlas-ledger-table">
                <thead><tr><th>Person</th><th>Evidence</th><th>Score</th><th>Sources</th></tr></thead>
                <tbody>
                  {displayed.map((entity: any) => {
                    const sources = sourceList(entity.sourceRegistries).filter((source) => !/^(manual|user|seed|imported)$/i.test(source));
                    const status = entity.boardEvidenceStatus as EvidenceStatus;
                    const role = entityWorkSummary(entity);
                    return (
                      <tr key={entity.id}>
                        <td>
                          <Link href={"/profile/" + entity.id} className="atlas-ledger-person">
                            <span className={"atlas-evidence-pattern is-" + status} aria-hidden="true" />
                            <span><strong>{entity.name || "Unnamed record"}</strong><small>{role || entity.type || "Person"}</small></span>
                            <ArrowUpRight aria-hidden="true" />
                          </Link>
                        </td>
                        <td><span className={"atlas-ledger-status is-" + status}>{statusLabel(status)}</span></td>
                        <td className="atlas-ledger-score">{scoreLabel(entity.bayesianScore)}</td>
                        <td className="atlas-ledger-sources">{sources.length > 0 ? sources[0] + (sources.length > 1 ? " + " + (sources.length - 1) : "") : entityEvidenceLabel(entity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visible.length > 8 && (
                <button type="button" className="atlas-ledger-view-all" onClick={() => setShowAll((value) => !value)}>
                  {showAll ? "Show fewer" : "View all " + visible.length}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
