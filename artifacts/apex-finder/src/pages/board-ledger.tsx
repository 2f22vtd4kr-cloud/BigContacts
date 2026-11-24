import { useEffect, useMemo, useState } from "react";
import { useListEntities } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowUpRight, RefreshCw, Search } from "lucide-react";
import { BoardPageFrame } from "@/components/board-page-frame";
import { displayEntityType, entityEvidenceLabel, entityWorkSummary } from "@/lib/utils";
import { normalizeEntityType } from "@/lib/entity-taxonomy";

type ContactOutcome = "direct_contact_verified" | "direct_contact_candidate" | "organization_contact" | "social_only" | "evidence_only" | "unclassified";

function contactOutcome(entity: any): ContactOutcome {
  const outcome = String(entity.contactOutcome ?? "").toLowerCase();
  return ["direct_contact_verified", "direct_contact_candidate", "organization_contact", "social_only", "evidence_only"].includes(outcome)
    ? outcome as ContactOutcome : "unclassified";
}
function contactOutcomeLabel(outcome: ContactOutcome) {
  switch (outcome) {
    case "direct_contact_verified": return "Direct contact verified";
    case "direct_contact_candidate": return "Direct contact candidate";
    case "organization_contact": return "Organization contact";
    case "social_only": return "Social contact only";
    case "evidence_only": return "Evidence only";
    default: return "Not classified";
  }
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
function initials(name: unknown) {
  const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(0, 2).map((word) => Array.from(word)[0]?.toLocaleUpperCase() ?? "").join("") : "—";
}
function entitySources(entity: any) {
  const sources = sourceList(entity.sourceRegistries).filter((source) => !/^(manual|user|seed|imported)$/i.test(source));
  return sources.length ? sources : [entityEvidenceLabel(entity)];
}

export default function BoardLedgerPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ContactOutcome>("all");
  const [visibleCount, setVisibleCount] = useState(8);
  const { data: rawEntities, isLoading, isError, refetch } = useListEntities({ limit: 500 });

  const entities = useMemo(() => {
    const raw = Array.isArray(rawEntities) ? rawEntities
      : Array.isArray((rawEntities as any)?.entities) ? (rawEntities as any).entities : [];
    // Preserve the API's reachability-first order; do not re-rank by wealth locally.
    return raw.filter((entity: any) => !entity.isHidden)
      .filter((entity: any) => ["HNWI", "PersonCandidate", "Gatekeeper"].includes(normalizeEntityType(displayEntityType(entity))))
      .map((entity: any) => ({ ...entity, boardContactOutcome: contactOutcome(entity) }));
  }, [rawEntities]);

  const counts = useMemo(() => ({
    all: entities.length,
    direct_contact_verified: entities.filter((entity: any) => entity.boardContactOutcome === "direct_contact_verified").length,
    direct_contact_candidate: entities.filter((entity: any) => entity.boardContactOutcome === "direct_contact_candidate").length,
    organization_contact: entities.filter((entity: any) => entity.boardContactOutcome === "organization_contact").length,
    social_only: entities.filter((entity: any) => entity.boardContactOutcome === "social_only").length,
    evidence_only: entities.filter((entity: any) => entity.boardContactOutcome === "evidence_only").length,
    unclassified: entities.filter((entity: any) => entity.boardContactOutcome === "unclassified").length,
  }), [entities]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return entities.filter((entity: any) => {
      if (filter !== "all" && entity.boardContactOutcome !== filter) return false;
      if (!query) return true;
      const role = entityWorkSummary(entity) ?? "";
      return [entity.name, role, entity.type, entity.nationality, entitySources(entity).join(" "), entity.contactOutcome]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
    });
  }, [entities, filter, search]);

  useEffect(() => { setVisibleCount(8); }, [filter, search]);
  const displayed = visible.slice(0, visibleCount);
  const staleDataAvailable = isError && entities.length > 0;

  return (
    <BoardPageFrame className="atlas-board-ledger" split title="Everyone on the register"
      description="The Ledger is the Bureau’s register. Each person Atlas has found is entered once, with recorded sources and the contact outcome Atlas has established.">
      <div className="atlas-ledger-layout">
        <section className="atlas-ledger-console" aria-labelledby="atlas-ledger-console-title">
          <div className="atlas-ledger-console-inner">
            <div className="atlas-ledger-section-heading">
              <h2 id="atlas-ledger-console-title">Register console</h2><span>Search and filter</span>
            </div>
            <label className="atlas-ledger-search">
              <Search aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the register…" aria-label="Search the register" />
            </label>
            <div className="atlas-ledger-filters" role="group" aria-label="Filter register by contact outcome">
              {([
                { value: "all", label: "All", count: counts.all },
                { value: "direct_contact_verified", label: "Direct verified", count: counts.direct_contact_verified },
                { value: "direct_contact_candidate", label: "Direct candidate", count: counts.direct_contact_candidate },
                { value: "organization_contact", label: "Organization", count: counts.organization_contact },
                { value: "social_only", label: "Social only", count: counts.social_only },
                { value: "evidence_only", label: "Evidence only", count: counts.evidence_only },
                { value: "unclassified", label: "Not classified", count: counts.unclassified },
              ] as const).map((item) => (
                <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
                  <span>{item.label}</span><strong>{item.count}</strong>
                </button>
              ))}
            </div>
            <p className="atlas-ledger-console-note">Counts reflect records returned by the Atlas API. Contact outcomes are evidence states, not a ranking.</p>
          </div>
        </section>

        <section className="atlas-ledger-summary" aria-label="Register summary">
          <div><strong>{counts.all.toLocaleString("en-US")}</strong><span>People</span></div>
          <div><strong>{counts.direct_contact_verified.toLocaleString("en-US")}</strong><span>Direct verified</span></div>
          <div><strong>{counts.direct_contact_candidate.toLocaleString("en-US")}</strong><span>Direct candidates</span></div>
        </section>

        <section className="atlas-ledger-register" aria-labelledby="atlas-ledger-register-title">
          <div className="atlas-ledger-register-heading">
            <div><h2 id="atlas-ledger-register-title">Register</h2><p>Atlas API order · contact reachability first. Wealth score remains a separate signal.</p></div>
            <div className="atlas-ledger-register-meta"><span>Backend ranked</span><strong>{displayed.length} of {visible.length}</strong></div>
          </div>
          {isLoading && !rawEntities ? (
            <div className="atlas-ledger-state" role="status">Loading the register…</div>
          ) : staleDataAvailable ? (
            <div className="atlas-ledger-stale" role="alert">
              <div><strong>Atlas can’t reach the research API.</strong><span>Showing the saved register. Contact outcomes may be out of date.</span></div>
              <button type="button" onClick={() => void refetch()}><RefreshCw aria-hidden="true" /> Retry</button>
            </div>
          ) : isError && entities.length === 0 ? (
            <div className="atlas-ledger-state" role="alert">
              <strong>The register could not be loaded.</strong><span>Saved research remains intact. Retry when the API is available.</span>
              <button type="button" onClick={() => void refetch()}><RefreshCw aria-hidden="true" /> Retry</button>
            </div>
          ) : visible.length === 0 ? (
            <div className="atlas-ledger-state">
              <strong>{search || filter !== "all" ? "No entries match this view." : "No one on the register yet."}</strong>
              <span>{search || filter !== "all" ? "Clear the search or choose another contact outcome." : "Run a free dig from Overview and the first evidence-backed person will appear here."}</span>
              {!search && filter === "all" && <Link href="/" className="atlas-ledger-empty-link">Open Overview <ArrowUpRight aria-hidden="true" /></Link>}
            </div>
          ) : (
            <>
              <div className="atlas-ledger-table-wrap">
                <table className="atlas-ledger-table">
                  <thead><tr><th>Person</th><th>Contact outcome</th><th>Score</th><th>Sources</th></tr></thead>
                  <tbody>{displayed.map((entity: any) => {
                    const outcome = entity.boardContactOutcome as ContactOutcome;
                    const role = entityWorkSummary(entity);
                    const sources = entitySources(entity);
                    return <tr key={entity.id}>
                      <td><Link href={"/profile/" + entity.id} className="atlas-ledger-person">
                        <span className="atlas-ledger-initials" aria-hidden="true">{initials(entity.name)}</span>
                        <span className="atlas-ledger-person-copy"><strong>{entity.name || "Unnamed record"}</strong><small>{role || entity.type || "Person"}</small></span>
                        <ArrowUpRight aria-hidden="true" />
                      </Link></td>
                      <td><span className="atlas-ledger-contact-outcome" data-outcome={outcome}>{contactOutcomeLabel(outcome)}</span></td>
                      <td className="atlas-ledger-score">{scoreLabel(entity.bayesianScore)}</td>
                      <td className="atlas-ledger-sources">{sources.join(" · ")}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <div className="atlas-ledger-mobile-list">
                {displayed.map((entity: any) => {
                  const outcome = entity.boardContactOutcome as ContactOutcome;
                  const role = entityWorkSummary(entity);
                  const sources = entitySources(entity);
                  return <article className="atlas-ledger-mobile-card" key={entity.id}>
                    <div className="atlas-ledger-mobile-card-top">
                      <Link href={"/profile/" + entity.id} className="atlas-ledger-person">
                        <span className="atlas-ledger-initials" aria-hidden="true">{initials(entity.name)}</span>
                        <span className="atlas-ledger-person-copy"><strong>{entity.name || "Unnamed record"}</strong><small>{role || entity.type || "Person"}</small></span>
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                      <span className="atlas-ledger-contact-outcome" data-outcome={outcome}>{contactOutcomeLabel(outcome)}</span>
                    </div>
                    <div className="atlas-ledger-mobile-card-meta">
                      <span>Score<strong>{scoreLabel(entity.bayesianScore)}</strong></span>
                      <span>Sources<strong>{sources.join(" · ")}</strong></span>
                    </div>
                  </article>;
                })}
              </div>
              {visible.length > displayed.length && <button type="button" className="atlas-ledger-view-all" onClick={() => setVisibleCount((value) => Math.min(visible.length, value + 25))}>Show 25 more</button>}
            </>
          )}
        </section>
      </div>
    </BoardPageFrame>
  );
}
