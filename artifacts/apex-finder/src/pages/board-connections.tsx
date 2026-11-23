import { useGetDashboardStats } from "@workspace/api-client-react";
import { Route } from "lucide-react";

export default function BoardConnectionsPage() {
  const { data: stats, isLoading, isError, refetch } = useGetDashboardStats();
  const linkCount = stats?.totalRelationships == null ? null : Number(stats.totalRelationships);

  return (
    <div className="atlas-board-page atlas-board-connections">
      <header className="atlas-board-page-intro">
        <h1>The people between you</h1>
        <p>Your own contacts, and the routes Atlas has found through them. Every link names the record behind it.</p>
      </header>

      <div className="atlas-connections-layout">
        <section className="atlas-connections-console" aria-labelledby="atlas-contacts-console-title">
          <div className="atlas-connections-heading">
            <h2 id="atlas-contacts-console-title">Contacts console</h2>
            <span>Contact source unavailable</span>
          </div>
          <div className="atlas-connections-empty" role="status" aria-live="polite">
            <strong>No personal contact source is connected.</strong>
            <p>This workspace has no user-owned contacts source. Atlas cannot calculate contact counts or routes until one is connected, and will not invent a contact or infer a path from a name match.</p>
          </div>
          <div className="atlas-connections-counts">
            <div><strong>—</strong><span>Contact source</span></div>
            <div><strong>{isLoading || isError || linkCount == null ? "—" : linkCount.toLocaleString()}</strong><span>Recorded links</span></div>
            <div><strong>—</strong><span>Verified routes</span></div>
          </div>
          {isError && <button type="button" className="atlas-connections-retry" onClick={() => void refetch()}>Retry link count</button>}
        </section>

        <section className="atlas-connections-routes" aria-labelledby="atlas-routes-title">
          <div className="atlas-connections-heading">
            <div>
              <h2 id="atlas-routes-title">Routes through your contacts</h2>
              <p>Complete, source-backed paths only</p>
            </div>
            <span>Unavailable</span>
          </div>
          <div className="atlas-connections-route-empty">
            <div className="atlas-connections-route-mark"><Route aria-hidden="true" /></div>
            <strong>Routes cannot be calculated yet.</strong>
            <p>Connect a user-owned contact source first. Complete paths will appear here only when public records support every link.</p>
          </div>
          <div className="atlas-connections-legend" aria-label="Evidence status legend">
            <span><i className="is-verified" />Verified</span>
            <span><i className="is-corroborated" />Corroborated</span>
            <span><i className="is-review" />In review</span>
          </div>
        </section>
      </div>
    </div>
  );
}
