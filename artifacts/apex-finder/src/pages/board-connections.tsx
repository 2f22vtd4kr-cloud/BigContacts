import { useGetDashboardStats } from "@workspace/api-client-react";
import { Route } from "lucide-react";

export default function BoardConnectionsPage() {
  const { data: stats, isLoading, isError, refetch } = useGetDashboardStats();
  const linkCount = Number(stats?.totalRelationships ?? 0);

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
            <span>0 contacts</span>
          </div>
          <div className="atlas-connections-search" aria-disabled="true">
            <span>Search your contacts</span>
          </div>
          <div className="atlas-connections-tabs" aria-label="Contact filters">
            <span className="is-active">All 0</span>
            <span>With routes 0</span>
            <span>No route 0</span>
          </div>
          <div className="atlas-connections-empty">
            <strong>No personal contacts are connected.</strong>
            <p>Contacts are yours. Atlas links them to people only through a recorded public source. It will not invent a contact or infer a route from a name match.</p>
          </div>
          <div className="atlas-connections-counts">
            <div><strong>0</strong><span>Contacts</span></div>
            <div><strong>{isLoading ? "—" : isError ? "—" : linkCount.toLocaleString()}</strong><span>Recorded links</span></div>
            <div><strong>0</strong><span>Routes</span></div>
          </div>
          {isError && <button type="button" className="atlas-connections-retry" onClick={() => void refetch()}>Retry link count</button>}
        </section>

        <section className="atlas-connections-routes" aria-labelledby="atlas-routes-title">
          <div className="atlas-connections-heading">
            <div>
              <h2 id="atlas-routes-title">Routes through your contacts</h2>
              <p>Complete, source-backed paths only</p>
            </div>
            <span>0 routes</span>
          </div>
          <div className="atlas-connections-route-empty">
            <div className="atlas-connections-route-mark"><Route aria-hidden="true" /></div>
            <strong>No complete route yet.</strong>
            <p>When a contact is linked to a person by a public record, the route and its evidence will appear here.</p>
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
