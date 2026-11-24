# Apex Atlas Connections Design Audit

## Handoff purpose
This is the cumulative implementation record for the Connections page. It is intended to let a later coding agent reproduce or inspect every frontend change without access to this session's preview. Entries are appended as each change is completed; do not defer the audit until the end.

## Scope and safety contract
- Repository: `2f22vtd4kr-cloud/BigContacts`.
- Base: `main` at `9ab88886d2f0ef2ef90ba1a0bc91b699e62994d7`.
- Working branch: `ui/connections-design-board-2026-11-24`.
- Reference: https://design-board-812905.netlify.app/
- Scope: Connections at `/network`, its shared shell/brand visible on this page, the existing shortest-path finder, and this audit.
- Keep API endpoints, generated clients, database/schema, authentication, workers, bureau/research orchestration, job lifecycle, and all backend behavior unchanged.
- Do not start the API, database, worker, bureau, research, or any launch action. Only frontend source may be changed.
- Keep the five existing top-level destinations only: Overview, Ledger, Discover, Connections, Reactor. Do not add tabs or routes.
- Design-board sample contacts, counts, names, saved routes, route statuses and evidence are decorative examples, not production data. Never hardcode them.
- Live relationship records, counts, IDs, evidence and shortest-path results must remain API-authoritative. Render honest loading, empty and unavailable states.
- Preserve the classic interface and all existing utility routes as rollback paths.
- Changes in the shared shell affect other pages' presentation only; they must not change their route destinations or page behavior.

## Baseline
- Main is at the same imported source revision recorded by the Replit handoff: `9ab88886d2f0ef2ef90ba1a0bc91b699e62994d7`.
- The Connections page source is `artifacts/apex-finder/src/pages/board-connections.tsx`.
- Its records come from `useListRelationships`; the path finder uses `useListEntities` and `useGetConnectionPath`.
- The current page places the title above both columns, the path finder inside the left relationship console, and the relationship list on the right. The board places the title/relationship register on the left and path/relationship results on the right.
- The current shared shell uses an outlined shield, desktop sidebar and mobile drawer. The board uses a clean quartered shield and horizontal five-destination navigation.
- The backend exposes entity/asset relationship records and an on-demand pairwise shortest-path query; it does not expose a personal contacts collection or saved-route feed. Do not imitate the board's specimen contacts or route cards.
- No API or research workflow was started during this audit.

## Implementation log

### Step 0 — audit initialized
- Created this file before source changes so each subsequent step can be recorded immediately.
- No application source changed in this step.

### Change 1 — quartered shield mark and favicon
- Mismatch: The old mark had a dark outline and crossbars. The reference uses a clean, clipped four-field red/gold shield.
- Files changed: `artifacts/apex-finder/src/components/layout-round.tsx`, `artifacts/apex-finder/src/flat-round.css`, and `artifacts/apex-finder/public/favicon.svg`.
- Exact implementation: the React mark now uses a `useId()`-scoped clip path with a 20×22 viewBox and four solid quarter fields; the favicon uses the same shield geometry. The React component imports `useId`. The mark is sized to 22×24.2px on desktop and 20×22px in the mobile header.
- Safety: decorative SVG and CSS only; no routes, state, API requests, IDs or data contracts changed.
- Verification: source-level diff reviewed. Runtime rendering/build and desktop/390px captures are still pending.
- Exact React replacement:
```tsx
function ApexAtlasMark() {
  const clipId = useId().replace(/:/g, "");
  return (
    <svg className="atlas-round-brand-mark" viewBox="0 0 20 22" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="10" height="11" fill="#C8321E" />
        <rect x="10" width="10" height="11" fill="#EDB92B" />
        <rect y="11" width="10" height="11" fill="#EDB92B" />
        <rect x="10" y="11" width="10" height="11" fill="#C8321E" />
      </g>
    </svg>
  );
}
```
- Exact CSS replacement:
```css
.atlas-round-brand-mark { display:block; width:22px; height:24.2px; flex:none; }
.atlas-round-mobile-header .atlas-round-brand-mark { width:20px; height:22px; }
```
- Favicon replacement:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 22">
  <defs>
    <clipPath id="shield"><path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12z"/></clipPath>
  </defs>
  <g clip-path="url(#shield)">
    <rect width="10" height="11" fill="#C8321E"/>
    <rect x="10" width="10" height="11" fill="#EDB92B"/>
    <rect y="11" width="10" height="11" fill="#EDB92B"/>
    <rect x="10" y="11" width="10" height="11" fill="#C8321E"/>
  </g>
</svg>

```
### Change 2 — shared horizontal navigation shell
- Mismatch: Desktop used a persistent 240px sidebar; the design board uses a horizontal header with the existing five destinations. The phone keeps the same destinations in an accessible drawer.
- Files changed: `artifacts/apex-finder/src/components/layout-round.tsx` and `artifacts/apex-finder/src/flat-round.css`.
- Exact implementation: the header now contains the shield/wordmark, a text-only horizontal nav, and the existing live `WorkspaceStatus`; the five hrefs remain `/`, `/profiles`, `/search`, `/network`, and `/reactor`. The desktop sidebar is hidden. On phones, the horizontal nav is hidden and the existing Escape/backdrop/close behavior drives the same five-link drawer.
- Safety: only presentation and placement changed. No route was added/removed; the existing `useLocation`, active-route detection, mobile open state, focus return, and live status component remain.
- Verification: source-level JSX and CSS review completed. Runtime build and desktop/390px capture remain pending.
- Exact navigation data and header replacement are now present in `layout-round.tsx`; CSS override appended to `flat-round.css`:
```css
/* Connections design-board shell: horizontal desktop navigation, accessible mobile drawer. */
.atlas-round-shell { display:block; min-height:100dvh; min-width:0; background:var(--round-paper); }
.atlas-round-shell .atlas-round-header { min-height:68px; }
.atlas-round-shell .atlas-round-primary { margin-left:auto; margin-right:auto; padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; }
.atlas-round-shell .atlas-round-navlink { min-height:40px; padding:0 14px; border-radius:6px; font:400 13px/1 "Geist",sans-serif; }
.atlas-round-shell .atlas-round-navlink.is-active { background:transparent; box-shadow:inset 0 -2px 0 var(--round-red); font-weight:500; }
.atlas-round-shell .atlas-round-brand-mark { width:22px; height:24.2px; }
.atlas-round-shell .atlas-round-brand .atlas-round-wordmark { flex-direction:row; align-items:center; gap:10px; color:var(--round-ink); text-decoration:none; }
.atlas-round-shell .atlas-round-brand .atlas-round-wordmark strong { font:500 16px/1 "Geist",sans-serif; letter-spacing:0; }
.atlas-round-shell .atlas-round-sidebar { display:none; }
.atlas-round-shell .atlas-round-main-column { width:100%; min-width:0; }
.atlas-round-shell .atlas-round-main { min-height:calc(100dvh - 68px); }
.atlas-round-shell .atlas-round-desktop-status { position:static; display:flex; }
.atlas-round-shell .atlas-round-mobile-toggle { display:none; }
@media (max-width:1100px) {
  .atlas-round-shell .atlas-round-header { gap:12px; }
  .atlas-round-shell .atlas-round-navlink { padding-inline:9px; }
}
@media (max-width:760px) {
  .atlas-round-shell .atlas-round-header { min-height:60px; padding-inline:16px; gap:12px; }
  .atlas-round-shell .atlas-round-brand-mark { width:20px; height:22px; }
  .atlas-round-shell .atlas-round-brand .atlas-round-wordmark strong { font:500 18px/1 "Geist",sans-serif; }
  .atlas-round-shell .atlas-round-primary { display:none; }
  .atlas-round-shell .atlas-round-actions { margin-left:auto; gap:10px; }
  .atlas-round-shell .atlas-round-desktop-status { position:static; display:flex; }
  .atlas-round-shell .atlas-round-mobile-toggle { display:grid; place-items:center; width:40px; height:40px; border:1px solid var(--round-line); border-radius:8px; background:#fff; color:var(--round-ink); }
  .atlas-round-shell .atlas-round-sidebar { position:fixed; top:0; bottom:0; left:0; z-index:120; display:flex; width:min(288px,calc(100vw - 56px)); min-width:0; height:100dvh; flex-direction:column; padding:calc(20px + env(safe-area-inset-top)) 16px 20px; border-right:1px solid var(--round-line); background:var(--round-paper); transform:translateX(-102%); visibility:hidden; transition:transform .18s ease,visibility .18s ease; }
  .atlas-round-shell .atlas-round-sidebar.is-open { transform:translateX(0); visibility:visible; box-shadow:8px 0 28px #18181a18; }
  .atlas-round-shell .atlas-round-sidebar-brand { display:flex; margin-bottom:28px; }
  .atlas-round-shell .atlas-round-sidebar-nav { display:flex; flex-direction:column; gap:6px; }
  .atlas-round-shell .atlas-round-sidebar-nav .atlas-round-navlink { justify-content:flex-start; min-height:44px; padding:0 12px; }
  .atlas-round-shell .atlas-round-sidebar-backdrop { position:fixed; inset:0; z-index:110; display:block; width:100%; height:100%; border:0; background:#18181a55; }
  .atlas-round-shell .atlas-round-main { min-height:calc(100dvh - 60px); }
}
```
### Change 3 — Connections page hierarchy and API-backed content
- Mismatch: The title was rendered full-width above both columns and the shortest-path finder lived inside the left register. The board puts the page intro/register in the left column and route tools/records in the right column.
- File changed: `artifacts/apex-finder/src/pages/board-connections.tsx`.
- Exact implementation: replaced the page component with a two-column structure: left intro + register/search/filters + relationship totals; right existing path finder + recorded relationship list. Each relationship row now uses source/target chips joined by a neutral connector. The page uses the existing relationship response and path finder only. Counts show an em dash during loading or error.
- Safety: `useListRelationships`, search fields, filter semantics, relationship IDs, entity card hrefs, retry behavior, and `ConnectionPathFinder` are preserved. No board specimen contact, sample count, route feed, or verification label is added. Asset records remain non-clickable where the existing API does not provide a profile route.
- Verification: JSX/source review completed. Build/typecheck and desktop/390px screenshots remain pending.
- Exact full replacement:
```tsx
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

```
### Change 3a — Connections board styling
- Mismatch: The page needed the board's heraldic console frame, paper interior, restrained filter segments, large live totals, white route panel, and compact relationship rows. Desktop columns need to match the board's 500px left register and flexible right rail; below 980px they stack.
- File changed: `artifacts/apex-finder/src/flat-round.css`.
- Exact implementation: appended a Connections-scoped CSS block (all selectors are scoped under `.atlas-board-connections`) with a checky left frame, wave right frame, Geist/Geist Mono hierarchy, focus-visible search treatment, responsive grid, and horizontal entity/asset relationship chips. The route panel remains neutral and the record list is API-driven.
- Safety: presentation-only CSS; no global component behavior, endpoint, data, or route changes. No new tab or feature is introduced.
- Verification: selectors and responsive breakpoints reviewed at source level. Browser build/screenshots remain pending.
- Exact full CSS block appended:
```css
/* Connections board: register on the left, path finder and returned records on the right. */
.atlas-round .atlas-board-connections { max-width:1600px; padding-top:24px; }
.atlas-round .atlas-board-connections .atlas-connections-layout {
  display:grid;
  grid-template-columns:minmax(0,500px) minmax(0,1fr);
  gap:64px;
  align-items:start;
}
.atlas-round .atlas-board-connections .atlas-connections-left-column,
.atlas-round .atlas-board-connections .atlas-connections-right-column { display:grid; min-width:0; align-content:start; gap:28px; }
.atlas-round .atlas-board-connections .atlas-board-page-intro { max-width:500px; margin:0; }
.atlas-round .atlas-board-connections .atlas-board-page-intro h1 {
  margin:0;
  color:var(--round-ink)!important;
  font:500 56px/1.04 "Geist",sans-serif!important;
  letter-spacing:-.035em!important;
}
.atlas-round .atlas-board-connections .atlas-board-page-intro p {
  max-width:480px;
  margin:20px 0 0;
  color:var(--round-ink-2)!important;
  font:400 17px/1.55 "Geist",sans-serif!important;
}
.atlas-round .atlas-board-connections .atlas-connections-console {
  position:relative;
  isolation:isolate;
  min-width:0;
  padding:8px;
  overflow:hidden;
  border:0;
  border-radius:20px;
  background:transparent;
}
.atlas-round .atlas-board-connections .atlas-connections-console::before,
.atlas-round .atlas-board-connections .atlas-connections-console::after {
  content:"";
  position:absolute;
  z-index:-1;
  top:0;
  bottom:0;
  width:50%;
  pointer-events:none;
}
.atlas-round .atlas-board-connections .atlas-connections-console::before {
  left:0;
  border-radius:20px 0 0 20px;
  background-color:#EDB92B;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='12' height='12' fill='%23C8321E'/%3E%3Crect x='12' y='12' width='12' height='12' fill='%23C8321E'/%3E%3Crect x='12' width='12' height='12' fill='%23EDB92B'/%3E%3Crect y='12' width='12' height='12' fill='%23EDB92B'/%3E%3C/svg%3E");
  background-repeat:repeat;
  background-size:24px 24px;
}
.atlas-round .atlas-board-connections .atlas-connections-console::after {
  right:0;
  border-radius:0 20px 20px 0;
  background-color:#2757C6;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='24' viewBox='0 0 32 24'%3E%3Cpath d='M-16 12 C-8 4 -8 4 0 12 S8 20 16 12 S24 4 32 12 S40 20 48 12' fill='none' stroke='%23FAFAF8' stroke-width='1.35' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:repeat;
  background-size:32px 24px;
}
.atlas-round .atlas-board-connections .atlas-connections-console-inner {
  position:relative;
  z-index:1;
  display:flex;
  min-width:0;
  flex-direction:column;
  gap:16px;
  padding:20px;
  border:1px solid var(--round-line);
  border-radius:12px;
  background:var(--round-card);
}
.atlas-round .atlas-board-connections .atlas-connections-heading {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin:0;
}
.atlas-round .atlas-board-connections .atlas-connections-heading h2 {
  margin:0;
  color:var(--round-ink)!important;
  font:500 18px/1.25 "Geist",sans-serif!important;
}
.atlas-round .atlas-board-connections .atlas-connections-heading > span {
  flex:none;
  color:var(--round-ink-3);
  font:400 11px "Geist Mono",ui-monospace,monospace;
}
.atlas-round .atlas-board-connections .atlas-connections-search {
  display:flex;
  min-height:48px;
  align-items:center;
  gap:10px;
  padding:0 12px;
  border:1px solid #E4E4DF;
  border-radius:8px;
  background:var(--round-raised);
}
.atlas-round .atlas-board-connections .atlas-connections-search svg { width:16px; height:16px; flex:none; color:var(--round-ink-3); }
.atlas-round .atlas-board-connections .atlas-connections-search input {
  width:100%;
  min-width:0;
  height:44px;
  padding:0;
  border:0!important;
  outline:0;
  background:transparent!important;
  box-shadow:none!important;
  font:400 14px/1.4 "Geist",sans-serif!important;
}
.atlas-round .atlas-board-connections .atlas-connections-search input::placeholder { color:var(--round-ink-3); opacity:1; }
.atlas-round .atlas-board-connections .atlas-connections-search:focus-within { border-color:var(--round-blue); outline:2px solid #2757C626; outline-offset:1px; }
.atlas-round .atlas-board-connections .atlas-connections-tabs {
  display:flex;
  align-items:center;
  gap:2px;
  margin:0;
  padding:3px;
  border:1px solid var(--round-line);
  border-radius:8px;
  background:var(--round-raised);
}
.atlas-round .atlas-board-connections .atlas-connections-tabs button {
  flex:1;
  min-width:0;
  min-height:34px;
  padding:0 7px;
  border:1px solid transparent;
  border-radius:6px;
  background:transparent;
  color:var(--round-ink-2);
  font:400 12px "Geist",sans-serif;
  white-space:nowrap;
}
.atlas-round .atlas-board-connections .atlas-connections-tabs button.is-active {
  border-color:var(--round-line);
  background:var(--round-card);
  color:var(--round-ink);
  font-weight:500;
  box-shadow:0 1px 2px #18181A0D;
}
.atlas-round .atlas-board-connections .atlas-connections-console-note {
  margin:0;
  color:var(--round-ink-2);
  font:400 12px/1.5 "Geist",sans-serif;
}
.atlas-round .atlas-board-connections .atlas-connections-counts {
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  margin:0;
  border:0;
}
.atlas-round .atlas-board-connections .atlas-connections-counts > div { display:flex; min-width:0; flex-direction:column; gap:5px; padding:0 14px; }
.atlas-round .atlas-board-connections .atlas-connections-counts > div:first-child { padding-left:0; }
.atlas-round .atlas-board-connections .atlas-connections-counts > div + div { border-left:1px solid var(--round-line); }
.atlas-round .atlas-board-connections .atlas-connections-counts strong {
  color:var(--round-ink);
  font:500 34px/1.1 "Geist",sans-serif;
  letter-spacing:-.03em;
  font-variant-numeric:tabular-nums;
}
.atlas-round .atlas-board-connections .atlas-connections-counts span { color:var(--round-ink-3); font:400 11px/1.4 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-board-connections .atlas-connections-route-panel {
  min-width:0;
  padding:24px;
  border:1px solid var(--round-line);
  border-radius:16px;
  background:var(--round-card);
}
.atlas-round .atlas-board-connections .atlas-connections-path-finder { margin:0; padding:0; border:0; }
.atlas-round .atlas-board-connections .atlas-connections-path-finder-heading h3 {
  margin:0;
  color:var(--round-ink);
  font:500 20px/1.25 "Geist",sans-serif;
}
.atlas-round .atlas-board-connections .atlas-connections-path-finder-heading p {
  margin:8px 0 0;
  color:var(--round-ink-2);
  font:400 13px/1.5 "Geist",sans-serif;
}
.atlas-round .atlas-board-connections .atlas-home-route-finder { margin-top:16px; }
.atlas-round .atlas-board-connections .atlas-home-route-finder select { min-height:44px; font-size:14px; }
.atlas-round .atlas-board-connections .atlas-home-route-finder > button { min-height:44px; font:500 13px "Geist",sans-serif; }
.atlas-round .atlas-board-connections .atlas-connections-routes { min-width:0; padding-top:8px; }
.atlas-round .atlas-board-connections .atlas-connections-routes .atlas-connections-heading { margin-bottom:14px; }
.atlas-round .atlas-board-connections .atlas-connections-routes .atlas-connections-heading p {
  margin:6px 0 0;
  color:var(--round-ink-3);
  font:400 11px/1.4 "Geist Mono",ui-monospace,monospace;
}
.atlas-round .atlas-board-connections .atlas-connections-record-list { display:grid; gap:12px; border-top:0; }
.atlas-round .atlas-board-connections .atlas-connection-record {
  display:flex;
  min-width:0;
  align-items:flex-start;
  justify-content:space-between;
  gap:16px;
  padding:16px;
  border:1px solid var(--round-line);
  border-radius:12px;
  background:var(--round-card);
}
.atlas-round .atlas-board-connections .atlas-connection-record-names { display:flex; min-width:0; flex-wrap:wrap; align-items:center; gap:8px; }
.atlas-round .atlas-board-connections .atlas-connection-record-node {
  display:inline-flex;
  max-width:calc(50% - 18px);
  align-items:center;
  padding:5px 9px;
  border:1px solid #D6D6D0;
  border-radius:6px;
  background:var(--round-card);
  color:var(--round-ink);
  font:400 13px/1.35 "Geist",sans-serif;
  text-decoration:none;
  white-space:normal;
  overflow-wrap:anywhere;
}
.atlas-round .atlas-board-connections .atlas-connection-record-hop {
  position:relative;
  flex:1;
  min-width:20px;
  height:1px;
  background:#D6D6D0;
}
.atlas-round .atlas-board-connections .atlas-connection-record-hop::after {
  content:"";
  position:absolute;
  top:-2px;
  right:0;
  width:4px;
  height:4px;
  transform:rotate(45deg);
  border-top:1px solid var(--round-ink-3);
  border-right:1px solid var(--round-ink-3);
}
.atlas-round .atlas-board-connections .atlas-connection-record-meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:9px; color:var(--round-ink-3); font:400 11px "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-board-connections .atlas-connection-record time { flex:none; color:var(--round-ink-3); font:400 11px "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-board-connections .atlas-connection-record-note { margin:8px 0 0; color:var(--round-ink-2); font:400 12px/1.5 "Geist",sans-serif; }
.atlas-round .atlas-board-connections .atlas-connections-data-note { margin:12px 0 0; color:var(--round-ink-3); font:400 11px/1.5 "Geist",sans-serif; }
@media (max-width:980px) {
  .atlas-round .atlas-board-connections .atlas-connections-layout { grid-template-columns:minmax(0,1fr); gap:32px; }
  .atlas-round .atlas-board-connections .atlas-connections-left-column { gap:24px; }
  .atlas-round .atlas-board-connections .atlas-board-page-intro h1 { font-size:44px!important; }
  .atlas-round .atlas-board-connections .atlas-board-page-intro p { font-size:16px!important; }
  .atlas-round .atlas-board-connections .atlas-connections-counts strong { font-size:30px; }
}
@media (max-width:760px) {
  .atlas-round .atlas-board-connections { padding-top:20px; }
  .atlas-round .atlas-board-connections .atlas-connections-layout { gap:28px; }
  .atlas-round .atlas-board-connections .atlas-connections-left-column,
  .atlas-round .atlas-board-connections .atlas-connections-right-column { gap:20px; }
  .atlas-round .atlas-board-connections .atlas-board-page-intro h1 { font-size:36px!important; line-height:1.04!important; }
  .atlas-round .atlas-board-connections .atlas-board-page-intro p { margin-top:14px; font-size:15px!important; }
  .atlas-round .atlas-board-connections .atlas-connections-console-inner { gap:12px; padding:16px; }
  .atlas-round .atlas-board-connections .atlas-connections-tabs button { padding-inline:5px; font-size:11px; }
  .atlas-round .atlas-board-connections .atlas-connections-counts > div { padding-inline:8px; }
  .atlas-round .atlas-board-connections .atlas-connections-counts strong { font-size:24px; }
  .atlas-round .atlas-board-connections .atlas-connections-counts span { font-size:10px; }
  .atlas-round .atlas-board-connections .atlas-connections-route-panel { padding:16px; }
  .atlas-round .atlas-board-connections .atlas-connection-record { flex-direction:column; gap:10px; padding:12px; }
  .atlas-round .atlas-board-connections .atlas-connection-record-node { max-width:calc(50% - 18px); }
}
```
