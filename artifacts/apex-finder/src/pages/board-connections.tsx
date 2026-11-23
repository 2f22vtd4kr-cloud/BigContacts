import { useGetDashboardStats } from "@workspace/api-client-react";
import { Route, Search, RefreshCw } from "lucide-react";
import { BoardPageFrame } from "@/components/board-page-frame";

export default function BoardConnectionsPage() {
  const { data: stats, isLoading, isError, refetch } = useGetDashboardStats();
  const linkCount = stats?.totalRelationships == null ? null : Number(stats.totalRelationships);

  return (
    <BoardPageFrame
      className="atlas-board-connections"
      breadcrumb="Connections"
      split
      title="The people between you"
      description="Your own contacts, and the routes Atlas has found through them. Every link names the record behind it."
    >
      <section className="atlas-connections-console" aria-labelledby="atlas-contacts-console-title">
        <div className="atlas-connections-heading">
          <h2 id="atlas-contacts-console-title">Contacts console</h2>
          <span className="atlas-connections-source-unavailable"><i aria-hidden="true" />Contact source unavailable</span>
        </div>
        <label className="atlas-connections-search" aria-describedby="atlas-contact-source-unavailable">
          <Search aria-hidden="true" />
          <input disabled placeholder="Search your contacts" aria-label="Search your contacts" />
        </label>
        <div className="atlas-connections-filters" role="group" aria-label="Contact filters">
          <button type="button" disabled aria-disabled="true">All</button>
          <button type="button" disabled aria-disabled="true">With routes</button>
          <button type="button" disabled aria-disabled="true">No route</button>
        </div>
        <p id="atlas-contact-source-unavailable" className="atlas-connections-console-note">
          Contacts are yours. Atlas links them to people only through a recorded source. Connect a user-owned contact source to enable this register.
        </p>
        <div className="atlas-connections-counts" aria-label="Contact and route counts">
          <div><strong>—</strong><span>Contacts</span></div>
          <div><strong>{isLoading || isError || linkCount == null ? "—" : linkCount.toLocaleString()}</strong><span>Links</span></div>
          <div><strong>—</strong><span>Routes</span></div>
        </div>
        {isError && <button type="button" className="atlas-connections-retry" onClick={() => void refetch()}><RefreshCw aria-hidden="true" /> Retry link count</button>}
      </section>

      <section className="atlas-connections-routes" aria-labelledby="atlas-routes-title">
        <div className="atlas-connections-heading">
          <div>
            <h2 id="atlas-routes-title">Routes through your contacts</h2>
            <p>Complete, source-backed paths only</p>
          </div>
          <span>Unavailable</span>
        </div>
        <div className="atlas-connections-route-empty" role="status" aria-live="polite">
          <div className="atlas-connections-route-mark"><Route aria-hidden="true" /></div>
          <strong>Routes are unavailable.</strong>
          <p>Connect a user-owned contact source. Atlas will show a route only when a public record supports each link; no contacts or paths are inferred from names alone.</p>
        </div>
        <div className="atlas-connections-legend" aria-label="Evidence status legend">
          <span><i className="atlas-evidence-pattern is-verified" aria-hidden="true" />Verified</span>
          <span><i className="atlas-evidence-pattern is-corroborated" aria-hidden="true" />Corroborated</span>
          <span><i className="atlas-evidence-pattern is-review" aria-hidden="true" />In review</span>
        </div>
      </section>
    </BoardPageFrame>
  );
}
