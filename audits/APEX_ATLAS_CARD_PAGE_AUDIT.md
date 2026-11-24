# Apex Atlas Card page frontend audit

## Scope and safety
- Repository: https://github.com/2f22vtd4kr-cloud/BigContacts
- Base revision: `9ab88886d2f0ef2ef90ba1a0bc91b699e62994d7`
- Working branch: `ui/card-page-design-board-2026-11-24`
- Reference board: https://design-board-812905.netlify.app/#card
- Work only on the existing Card page and the components/styles it uses.
- Do not add application tabs or routes.
- Do not modify backend/API contracts, database/schema, workers, authentication, research pipeline, or evidence-admission rules.
- Never copy illustrative board names, scores, claims, counts, URLs, or statuses into production.
- Do not start API, database, workers, bureau, or research actions.
- Record each confirmed patch here as it is applied. Source remains authoritative.

## Change log

### 1. Move Card rendering out of optional OCCRP response rendering

**File:** `artifacts/apex-finder/src/pages/profile.tsx`

**Problem:** The `boardMode` Card renderer was nested inside the optional OCCRP data callback. When OCCRP returned no data, the Card route rendered the classic profile instead of the Card. The renderer also referenced `e` without defining it locally.

**Change:** Moved the complete `if (boardMode)` branch to component scope immediately before the existing classic profile render. Added `const e = entity as any;`. Reused the already-computed `displayType` rather than redeclaring it. Removed the nested duplicate from the OCCRP callback; the sanctions/watchlist result remains unchanged.

**Exact renderer now present at component scope:**

```tsx
if (boardMode) {
    const e = entity as any;
    // Claim-level evidence comes from the persisted research-evidence endpoint,
    // not from entity-level registry names or locally inferred source counts.
    const claimRows = researchEvidence.filter((entry: any) => Number(entry.entityId) === entityId).slice(0, 8);
    const isCompanyCard = String(entity.type ?? "").toLowerCase() === "company" || displayType === "Corporation" || displayType === "Trust" || entityMeta(entity.type).shortLabel === "Company" || entityMeta(entity.type).shortLabel === "Trust";
    const boardEntityType = String(entity.type ?? "").toLowerCase() === "company" ? "Corporation" : entity.type;
    const contactRoutes = Array.isArray((entity as any).contacts) ? (entity as any).contacts : [];
    const personalContacts = contactRoutes.filter((route: any) => String(route?.mark ?? "").toLowerCase() === "personal");
    const companyContacts = contactRoutes.filter((route: any) => String(route?.mark ?? "").toLowerCase() === "organization");
    const reviewContacts = contactRoutes.filter((route: any) => !["personal", "organization"].includes(String(route?.mark ?? "").toLowerCase()));
    const companyPhoneSource = String((entity as any).phoneSource ?? "");
    const companyPhone = /(?:-org$|^EDGAR-Phone$|^EDGAR-Issuer-Phone$|^CompaniesHouse-Phone$)/.test(companyPhoneSource)
      ? e.phone
      : null;
    const reviewPhone = e.phone && !companyPhone ? e.phone : null;
    const renderContactGroup = (label: string, contacts: any[], phone: string | null = null, phoneSource = "") => (
      <div className="atlas-card-contact-group">
        <span className="atlas-card-contact-label">{label}</span>
        {contacts.length > 0 || phone ? (
          <ContactSurface contacts={contacts} phone={phone} phoneSource={phoneSource} density="card" boardMode evidenceCount={contactEvidence.length} />
        ) : (
          <p className="atlas-card-contact-empty">None recorded.</p>
        )}
      </div>
    );
    const relatedPeople = (relationships as any[])
      .filter((rel) => String(rel.targetType ?? "").toLowerCase() === "entity" && rel.targetName)
      .slice(0, 4);
    const ownershipRows = (ledger as any[]).filter((entry) => /ownership|shareholder|beneficial owner|equity/i.test([entry.dataPoint, entry.category].filter(Boolean).join(" ")));
    const ownershipSummary = typeof entityMetadata?.ownershipSummary === "string"
      ? entityMetadata.ownershipSummary
      : ownershipRows.length > 0
        ? ownershipRows.map((entry) => entry.value).filter(Boolean).join(" · ")
        : "No shareholder record yet. Atlas does not infer ownership from a title.";
    const hasOwnershipEvidence = ownershipRows.length > 0 || (
      typeof entityMetadata?.ownershipSummary === "string" &&
      !/no shareholder record|not recorded|unknown/i.test(entityMetadata.ownershipSummary)
    );
    const evidenceLabel = entityEvidenceLabel(entity);
    const contactConfidence = typeof (entity as any).contactConfidence === "number"
      ? `${Math.round((entity as any).contactConfidence)}%`
      : "—";
    const personInitials = String(e.name ?? "Apex").trim().split(/\s+/).slice(0, 2).map((part: string) => part[0] ?? "").join("").toUpperCase();
    const wealthLabel = displayableEstimatedNetWorth ? String(displayableEstimatedNetWorth) : "Not recorded";
    return (
      <div className="atlas-card-board">
        <main className="atlas-card-main">
          <header className="atlas-card-subject">
            <div className="atlas-card-avatar" aria-hidden="true">{personInitials || "—"}</div>
            <div className="atlas-card-subject-copy">
              <div className="atlas-card-subject-type"><EntityTypeMark type={boardEntityType} /></div>
              <h2>{e.name}</h2>
              <p>{profileWorkSummary || e.role || e.title || (isCompanyCard ? claimRows[0]?.sourceName || "Company record" : "Role not recorded")}</p>
              {!isCompanyCard && e.nationality && <span>{e.nationality}</span>}
            </div>
            <div className="atlas-card-subject-score">
              <span>{evidenceLabel}</span>
              <strong>{contactConfidence}</strong>
              <small>Contact confidence</small>
            </div>
          </header>

          {!isCompanyCard && (
            <section className="atlas-card-section atlas-card-route-empty" aria-labelledby="atlas-card-route-title">
              <div className="atlas-card-section-heading">
                <div><h3 id="atlas-card-route-title">Route</h3><p>Shortest recorded path to this subject</p></div>
                <span>Not recorded</span>
              </div>
              <p className="atlas-card-empty">No route is stored on this card. Use Connections to calculate the shortest recorded path between two records.</p>
              <Link href="/network" className="atlas-card-route-link">Find a shortest path <ArrowUpRight className="w-3.5 h-3.5" /></Link>
            </section>
          )}

          <section className="atlas-card-section atlas-card-claims" aria-labelledby="atlas-card-claims-title">
            <div className="atlas-card-section-heading">
              <div><h3 id="atlas-card-claims-title">Claims on record</h3><p>Claim-level evidence from the latest research session.</p></div>
              <span>{claimRows.length} claims</span>
            </div>
            {researchEvidenceQuery.isLoading ? (
              <div className="atlas-card-empty" role="status">Loading claim-level evidence…</div>
            ) : researchEvidenceQuery.isError ? (
              <div className="atlas-card-empty" role="alert">Claim-level evidence could not be loaded from the research API.</div>
            ) : claimRows.length === 0 ? (
              <div className="atlas-card-empty">No claim-level evidence is recorded for the latest research session.</div>
            ) : (
              <ul>
                {claimRows.map((entry: any) => {
                  const rawStatus = String(entry.status ?? "unclassified").toLowerCase();
                  const patternStatus = ["supported", "corroborated", "review"].includes(rawStatus) ? rawStatus : null;
                  const disputed = rawStatus === "disputed" || rawStatus === "rejected";
                  const statusClass = disputed ? "is-disputed" : patternStatus ? "is-" + patternStatus : "is-unclassified";
                  const label = rawStatus === "review" ? "In review" : rawStatus.replace(/[_-]+/g, " ").replace(/^\w/, (letter: string) => letter.toUpperCase());
                  const sourceLabel = entry.sourceName || entry.sourceDomain || "Source not recorded";
                  return (
                    <li key={entry.id}>
                      {patternStatus
                        ? <span className={"atlas-evidence-pattern is-" + patternStatus} aria-hidden="true" />
                        : disputed
                          ? <AlertCircle className="atlas-evidence-disputed-mark" aria-hidden="true" />
                          : <span className="atlas-card-claim-status is-unclassified"> </span>}
                      <div className="atlas-card-claim-copy">
                        <strong>{entry.claimType?.replace(/[_-]+/g, " ") || "Recorded claim"}</strong>
                        <p>{entry.value || entry.claim || "Claim value not recorded"}</p>
                        <small>{sourceLabel}</small>
                        {entry.sourceUrl && /^https?:\/\//i.test(entry.sourceUrl) && (
                          <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Open source</a>
                        )}
                      </div>
                      <span className={"atlas-card-claim-status " + statusClass}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!isCompanyCard && (
            <div className="atlas-card-main-facts">
              <section className="atlas-card-section">
                <h3>Personal wealth</h3>
                <strong className="atlas-card-fact-value">{wealthLabel}</strong>
                <p>{displayableEstimatedNetWorth
                  ? "An attributable estimate is available in the recorded evidence."
                  : "No attributable record yet. Atlas does not infer wealth from a role or title."}</p>
              </section>
            </div>
          )}
        </main>

        <aside className="atlas-card-sidebar">
          <section className="atlas-card-section">
            <div className="atlas-card-section-heading">
              <div><h3>People on this card</h3><p>Recorded relationships only</p></div>
              <span>{relatedPeople.length}</span>
            </div>
            {relatedPeople.length === 0 ? (
              <div className="atlas-card-empty">No linked people have been recorded.</div>
            ) : (
              <ul className="atlas-card-people-list">
                {relatedPeople.map((rel: any) => (
                  <li key={rel.id}>
                    <Link href={"/profile/" + rel.targetId}>
                      <strong>{rel.targetName}</strong>
                      <span>{String(rel.role ?? rel.relationshipType ?? "Relationship")
                        .replace(/[_-]+/g, " ")
                        .trim()
                        .replace(/^co\s+/i, "co-")
                        .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())}</span>
                    </Link>
                    <small>{Number.isFinite(Number(rel.strength)) ? Math.round(Number(rel.strength) * 100) + "% strength" : "Strength not recorded"}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="atlas-card-section">
            <div className="atlas-card-section-heading">
              <div><h3>Ways to reach</h3><p>Attributable public contact routes</p></div>
            </div>
            <div className="atlas-card-contact-groups">
              {!isCompanyCard && renderContactGroup("Personal", personalContacts)}
              {renderContactGroup("Organisation", companyContacts, companyPhone, companyPhoneSource)}
              {(reviewContacts.length > 0 || reviewPhone) && (
                renderContactGroup("Needs review", reviewContacts, reviewPhone, companyPhoneSource)
              )}
            </div>
          </section>

          {isCompanyCard && (
            <section className="atlas-card-section atlas-card-ownership">
              <div className="atlas-card-section-heading">
                <div><h3>Ownership</h3><p>Recorded ownership evidence only</p></div>
                <span>{hasOwnershipEvidence ? "Recorded" : "Not recorded"}</span>
              </div>
              <p>{ownershipSummary}</p>
            </section>
          )}

          <section className="atlas-card-section atlas-card-behind">
            <h3>Behind this card</h3>
            <div className="atlas-card-behind-metrics">
              <div><strong>{sessions.length}</strong><span>Research sessions</span></div>
              <div><strong>{assets.length}</strong><span>Source records</span></div>
            </div>
            <p>Open the Reactor to inspect the recorded research steps behind this subject.</p>
            <Link href="/reactor">Open in Reactor <ArrowUpRight className="w-3.5 h-3.5" /></Link>
          </section>
        </aside>
      </div>
    );
  }
```

**Preservation:** All displayed entity, relationship, ownership, wealth, contact, session, asset, and claim values continue to come from existing frontend/API state. Empty and error states remain explicit. The classic profile render remains the fallback for non-board routes.

**Verification:** GitHub content update succeeded. Runtime/build verification has not yet been run.


### 2. Card-only shell header and board shield mark

**File:** `artifacts/apex-finder/src/components/layout-round.tsx`

- Replaced the outlined shield with the clipped 20×22 four-quadrant red/gold board mark; a unique React `useId()` clip path avoids duplicate SVG IDs.
- Added a Card-route-only header with the existing five primary destinations and truthful `WorkspaceStatus`.
- Card routes mark Ledger as active and use the Card title. The Card route no longer renders the legacy sidebar or phone hamburger; all non-Card routes retain their existing shell.
- No navigation destination or route was added.

**Verification:** GitHub content update succeeded. Runtime screenshot verification remains pending.

### 3. Ledger breadcrumb and neutral subject-tab mark

**Files:** `artifacts/apex-finder/src/components/board-page-frame.tsx`, `artifacts/apex-finder/src/pages/board-profile.tsx`

- Added optional breadcrumb support to the shared board page frame; other pages remain unchanged when the prop is omitted.
- Added the existing Ledger link and current Cards breadcrumb to the Card page.
- Added a neutral dashed tab mark. The frontend does not infer verification from a source count or score.
- Subject tabs remain the existing backend-derived entities; no new tabs or routes were introduced.

**Verification:** Both GitHub content updates succeeded. Responsive runtime verification remains pending.

### 4. Card page responsive shell, tabs, and dossier styling

**File:** `artifacts/apex-finder/src/flat-round.css`

- Added Card-only shell/header sizing, horizontal desktop navigation, and phone status treatment.
- Added Ledger breadcrumb and subject-tab styles, including neutral dashed classification marks.
- Added a responsive two-column desktop dossier and one-column mobile reading order, with route/claims/contact sections styled using the board's paper, ink, and raised-surface palette.
- Kept the existing subject tab data and all card values API-backed. The mobile subject tab strip remains horizontally scrollable; it does not truncate the list to a fixed number of tabs.

**Verification:** CSS update succeeded. Visual screenshot comparison and build verification are still pending; no browser or Replit session was started.

### 5. Stabilize the mock adapter and identify company dossier layout

**File:** `artifacts/apex-finder/src/pages/profile.tsx`

- Memoized the development-only mock entity adapter so effects depending on `entity` do not re-run on every render.
- Added the `is-company-card` root class using the existing canonical entity-type checks so company layout rules apply only to company/trust records.
- No fixture values are used outside the existing development mock mode. No mock record is written to the API.

**Verification:** GitHub content update succeeded. Typecheck/build and live-record visual verification remain pending.

## Literal source handoff

The following snippets are taken from the resulting branch head, not reconstructed examples. They are included so a later coding agent can reproduce the changes without opening the reference board.

### Card shell and shield mark

**File:** `artifacts/apex-finder/src/components/layout-round.tsx`

```tsx
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Database, House, Menu, Network, Search, X } from "lucide-react";
import { ReactorMark } from "@/components/reactor-mark";
import { WorkspaceStatus } from "@/components/workspace-status";

function ApexAtlasMark() {
  const clipPathId = `atlas-mark-${useId().replace(/:/g, "")}`;
  return (
    <svg className="atlas-round-brand-mark" viewBox="0 0 20 22" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipPathId}>
          <path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        <rect width="10" height="11" fill="#C8321E" />
        <rect x="10" width="10" height="11" fill="#EDB92B" />
        <rect y="11" width="10" height="11" fill="#EDB92B" />
        <rect x="10" y="11" width="10" height="11" fill="#C8321E" />
      </g>
    </svg>
  );
}

const primaryNav = [
  { name: "Overview", href: "/", icon: House },
  { name: "Ledger", href: "/profiles", icon: Database },
  { name: "Discover", href: "/search", icon: Search },
  { name: "Connections", href: "/network", icon: Network },
  { name: "Reactor", href: "/reactor", icon: ReactorMark },
];

export function Layout({ children }: { children: React.ReactNode; onSwitchToLegacy?: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);
  const isCardPage = location.startsWith("/profile/");
  const active = (href: string) => href === "/"
    ? location === "/"
    : (href === "/profiles" && isCardPage) || location === href || location.startsWith(href + "/");
  const title = isCardPage ? "Card" : primaryNav.find((item) => active(item.href))?.name ?? "Apex Atlas";

  useEffect(() => { document.title = title === "Overview" ? "Apex Atlas" : title + " · Apex Atlas"; }, [title]);
  useEffect(() => { setMobileOpen(false); }, [location]);
  useEffect(() => {
    if (mobileOpen) {
      wasOpen.current = true;
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setMobileOpen(false);
      };
      window.addEventListener("keydown", closeOnEscape);
      return () => window.removeEventListener("keydown", closeOnEscape);
    }
    if (wasOpen.current) {
      mobileToggleRef.current?.focus();
      wasOpen.current = false;
    }
    return undefined;
  }, [mobileOpen]);

  const NavItems = () => (
    <>
      {primaryNav.map((item) => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}
          onClick={() => setMobileOpen(false)}
          className={`atlas-round-navlink ${active(item.href) ? "is-active" : ""}`}>
          <Icon aria-hidden="true" /> <span>{item.name}</span>
        </Link>;
      })}
    </>
  );

  const CardNav = () => (
    <nav className="atlas-card-shell-nav" aria-label="Primary navigation">
      {primaryNav.map((item) => (
        <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}
          className={`atlas-card-shell-navlink ${active(item.href) ? "is-active" : ""}`}>
          {item.name}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className={`atlas-round atlas-round-shell min-h-[100dvh] ${isCardPage ? "is-card-page" : ""}`}>
      <a href="#main-content" className="atlas-round-skip">Skip to main content</a>
      {isCardPage && (
        <header className="atlas-card-shell-header">
          <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark">
            <ApexAtlasMark /><strong>Apex Atlas</strong>
          </Link>
          <CardNav />
          <div className="atlas-card-shell-status"><WorkspaceStatus compact /></div>
        </header>
      )}
      {!isCardPage && (
        <header className="atlas-round-mobile-header">
          <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
          <button ref={mobileToggleRef} className="atlas-round-mobile-toggle" type="button"
            aria-controls="atlas-round-sidebar" aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen((value) => !value)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </header>
      )}
      {!isCardPage && mobileOpen && <button type="button" className="atlas-round-sidebar-backdrop"
        aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      {!isCardPage && (
        <aside id="atlas-round-sidebar" className={`atlas-round-sidebar ${mobileOpen ? "is-open" : ""}`}
          aria-label="Apex Atlas sidebar">
          <div className="atlas-round-sidebar-brand">
            <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
          </div>
          <nav className="atlas-round-sidebar-nav" aria-label="Primary navigation">
            <div className="atlas-round-sidebar-label">Workspace</div>
            <NavItems />
          </nav>
        </aside>
      )}
      <div className="atlas-round-main-column">
        <main id="main-content" tabIndex={-1} className="atlas-round-main">
          {!isCardPage && <div className="atlas-round-desktop-status"><WorkspaceStatus compact /></div>}
          <div className="atlas-round-content">{children}</div>
        </main>
      </div>
    </div>
  );
}

```

### Optional breadcrumb frame

**File:** `artifacts/apex-finder/src/components/board-page-frame.tsx`

```tsx
import type { ReactNode } from "react";

export function BoardPageFrame({
  breadcrumb,
  title,
  description,
  className,
  split = false,
  children,
}: {
  breadcrumb?: ReactNode;
  title: string;
  description: string;
  className: string;
  split?: boolean;
  children: ReactNode;
}) {
  const intro = (
    <>
      {breadcrumb && (
        <nav className="atlas-board-page-breadcrumb" aria-label="Breadcrumb">
          {breadcrumb}
        </nav>
      )}
      <header className="atlas-board-page-intro">
      <h1>{title}</h1>
      <p>{description}</p>
      </header>
    </>
  );

  return (
    <div className={`atlas-board-page ${className}`}>
      {split ? (
        <div className="atlas-board-page-grid">
          {intro}
          {children}
        </div>
      ) : (
        <>
          {intro}
          <div className="atlas-board-page-content">{children}</div>
        </>
      )}
    </div>
  );
}

```

### Card tabs and breadcrumb usage

**File:** `artifacts/apex-finder/src/pages/board-profile.tsx`

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useListEntities } from "@workspace/api-client-react";
import { BoardPageFrame } from "@/components/board-page-frame";
import ApexProfile from "@/pages/profile";
import { ProfileErrorBoundary } from "@/components/profile-error-boundary";
import { normalizeEntityType } from "@/lib/entity-taxonomy";

const RECENT_CARD_KEY = "apex-atlas-recent-cards-v1";

export default function BoardProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const activeId = Number(params?.id ?? 0);
  const { data: rawEntities } = useListEntities({ limit: 500 });
  const [recentIds, setRecentIds] = useState<number[]>([]);

  const allEntities = useMemo(() => {
    const raw = Array.isArray(rawEntities)
      ? rawEntities
      : Array.isArray((rawEntities as any)?.entities)
        ? (rawEntities as any).entities
        : [];
    const all = raw
      .filter((entity: any) => !entity.isHidden)
      .sort((a: any, b: any) => Number(b.bayesianScore ?? 0) - Number(a.bayesianScore ?? 0));
    return all;
  }, [rawEntities]);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(RECENT_CARD_KEY) || "[]");
      if (Array.isArray(stored)) {
        setRecentIds([...new Set(stored.filter((id): id is number => Number.isInteger(id) && id > 0))].slice(0, 20));
      }
    } catch {
      setRecentIds([]);
    }
  }, []);

  useEffect(() => {
    if (!activeId || !allEntities.some((entity: any) => Number(entity.id) === activeId)) return;
    setRecentIds((current) => {
      if (current[0] === activeId) return current;
      const next = [activeId, ...current.filter((id) => id !== activeId)].slice(0, 20);
      try { window.localStorage.setItem(RECENT_CARD_KEY, JSON.stringify(next)); } catch { /* Recent tabs remain session-local if storage is unavailable. */ }
      return next;
    });
  }, [activeId, allEntities]);

  const tabs = useMemo(() => {
    const recent = recentIds
      .map((id) => allEntities.find((entity: any) => Number(entity.id) === id))
      .filter(Boolean);
    const current = allEntities.find((entity: any) => Number(entity.id) === activeId);
    if (current && !recent.some((entity: any) => Number(entity.id) === activeId)) recent.unshift(current);
    const recentIdsSet = new Set(recent.map((entity: any) => Number(entity.id)));
    const remaining = allEntities.filter((entity: any) => !recentIdsSet.has(Number(entity.id)));
    const items = [...recent, ...remaining].slice(0, 5);
    return { items, more: Math.max(0, allEntities.length - items.length) };
  }, [allEntities, recentIds, activeId]);

  return (
    <BoardPageFrame
      className="atlas-board-profile"
      breadcrumb={<><Link href="/profiles">Ledger</Link><span aria-hidden="true">/</span><span aria-current="page">Cards</span></>}
      title="One card, one subject"
      description="Every person or company Atlas has enough evidence to follow gets its own card. Every card is its own tab."
    >
      <nav className="atlas-profile-tabs" aria-label="Subject cards">
        {tabs.items.map((entity: any) => {
          const active = Number(entity.id) === activeId;
          const rawType = String(entity.type ?? "").toLowerCase();
          const normalizedType = rawType === "company" ? "Corporation" : normalizeEntityType(entity.type);
          const kind = normalizedType === "Corporation" || normalizedType === "Trust" ? "Company" : normalizedType === "Other" ? "Record" : "Person";
          return (
            <Link
              key={entity.id}
              href={"/profile/" + entity.id}
              className={"atlas-profile-tab" + (active ? " is-active" : "")}
              aria-current={active ? "page" : undefined}
            >
              <span className="atlas-profile-tab-mark is-unclassified" aria-hidden="true" />
              <strong>{entity.name || "Unnamed record"}</strong>
              <span>{kind}</span>
            </Link>
          );
        })}
        {tabs.more > 0 && <Link href="/profiles" className="atlas-profile-tab-more">+ {tabs.more} more</Link>}
      </nav>
      <ProfileErrorBoundary>
        <ApexProfile boardMode />
      </ProfileErrorBoundary>
    </BoardPageFrame>
  );
}

```

### Card CSS addition

**File:** `artifacts/apex-finder/src/flat-round.css`

```css
/* Card page — design-board shell and responsive dossier */
.atlas-round-brand-mark { width:22px; height:24.2px; flex:none; }
.atlas-round-shell.is-card-page { display:block; }
.atlas-round-shell.is-card-page .atlas-round-main { min-height:calc(100dvh - 68px); }
.atlas-round-shell.is-card-page .atlas-round-content { max-width:1600px; padding:20px clamp(16px,3vw,40px) 40px; }
.atlas-card-shell-header {
  position:sticky; top:0; z-index:100; display:flex; min-height:68px; align-items:center;
  gap:24px; padding:0 clamp(24px,3vw,44px); border-bottom:1px solid var(--round-line);
  background:rgba(250,250,248,.96); backdrop-filter:blur(12px);
}
.atlas-card-shell-header .atlas-round-wordmark { flex:none; flex-direction:row; align-items:center; gap:10px; color:var(--round-ink); text-decoration:none; }
.atlas-card-shell-header .atlas-round-wordmark strong { color:var(--round-ink); font:500 16px/1 "Geist",sans-serif; letter-spacing:-.01em; }
.atlas-card-shell-nav { display:flex; min-width:0; align-items:center; justify-content:center; gap:4px; margin-inline:auto; }
.atlas-card-shell-navlink {
  display:inline-flex; min-height:40px; align-items:center; justify-content:center; padding:0 12px;
  border-radius:10px; color:var(--round-ink-2); font:400 13px/1.2 "Geist",sans-serif;
  text-decoration:none; white-space:nowrap;
}
.atlas-card-shell-navlink:hover,.atlas-card-shell-navlink.is-active { background:var(--round-raised); color:var(--round-ink); }
.atlas-card-shell-navlink.is-active { font-weight:500; }
.atlas-card-shell-status { flex:none; max-width:260px; }
.atlas-card-shell-status .atlas-round-status { display:flex; max-width:none; align-items:center; gap:8px; overflow:visible; white-space:nowrap; }
.atlas-card-shell-status .atlas-round-status-full { display:inline; }
.atlas-card-shell-status .atlas-round-status-short { display:none; }

.atlas-round .atlas-board-profile { padding-top:0; }
.atlas-round .atlas-board-page-breadcrumb {
  display:flex; align-items:center; gap:8px; margin:0 0 16px; color:var(--round-ink-3);
  font:400 13px/1.4 "Geist Mono",ui-monospace,monospace;
}
.atlas-round .atlas-board-page-breadcrumb a { color:var(--round-ink-2); text-decoration:none; }
.atlas-round .atlas-board-page-breadcrumb a:hover { color:var(--round-ink); text-decoration:underline; text-underline-offset:3px; }
.atlas-round .atlas-board-profile .atlas-board-page-intro { max-width:760px; margin:0 0 36px; }
.atlas-round .atlas-board-profile .atlas-board-page-intro h1 {
  color:var(--round-ink)!important; font:500 56px/1 "Geist",sans-serif!important; letter-spacing:-.035em!important;
}
.atlas-round .atlas-board-profile .atlas-board-page-intro p {
  max-width:520px; margin:24px 0 0; color:var(--round-ink-2)!important; font:400 18px/1.5 "Geist",sans-serif!important;
}
.atlas-round .atlas-board-profile .atlas-profile-tabs {
  display:flex; min-width:0; align-items:flex-end; gap:2px; margin:0; padding:0 4px;
  overflow-x:auto; border-bottom:1px solid var(--round-line); scrollbar-width:none;
}
.atlas-round .atlas-board-profile .atlas-profile-tabs::-webkit-scrollbar { display:none; }
.atlas-round .atlas-board-profile .atlas-profile-tab {
  display:inline-flex; min-width:0; max-width:240px; min-height:44px; flex:none; flex-direction:row;
  align-items:center; gap:8px; padding:10px 14px; border:1px solid transparent; border-bottom:0;
  border-radius:12px 12px 0 0; color:var(--round-ink-2); text-decoration:none; white-space:nowrap;
}
.atlas-round .atlas-board-profile .atlas-profile-tab:hover { color:var(--round-ink); background:var(--round-raised); }
.atlas-round .atlas-board-profile .atlas-profile-tab strong {
  min-width:0; overflow:hidden; color:inherit; font:500 13px/1.3 "Geist",sans-serif; text-overflow:ellipsis;
}
.atlas-round .atlas-board-profile .atlas-profile-tab span:not(.atlas-profile-tab-mark) {
  flex:none; color:var(--round-ink-3); font:400 11px/1.3 "Geist Mono",ui-monospace,monospace;
}
.atlas-round .atlas-board-profile .atlas-profile-tab-mark {
  width:12px; height:12px; flex:none; border:1px dashed #BDBDB8; border-radius:3px;
}
.atlas-round .atlas-board-profile .atlas-profile-tab[aria-current="page"] {
  position:relative; z-index:1; margin-bottom:-1px; border-color:var(--round-line);
  border-bottom:0; background:#fff; color:var(--round-ink);
}
.atlas-round .atlas-board-profile .atlas-profile-tab-more {
  display:inline-flex; min-height:44px; align-items:center; margin-left:auto; padding:0 12px;
  color:var(--round-ink-3); font:400 12px/1.3 "Geist Mono",ui-monospace,monospace; text-decoration:none; white-space:nowrap;
}

.atlas-round .atlas-card-board {
  position:relative; display:grid; grid-template-columns:minmax(0,1fr) 320px;
  grid-template-areas:"subject subject" "main route" "main sidebar";
  gap:16px 48px; min-width:0; padding:32px 32px 32px 44px; overflow:hidden;
  border:1px solid var(--round-line); border-radius:0 16px 16px 16px; background:#fff; color:var(--round-ink);
}
.atlas-round .atlas-card-board::before {
  position:absolute; top:8px; bottom:8px; left:8px; width:8px; border:1px dashed #D6D6D0;
  border-radius:3px; content:""; pointer-events:none;
}
.atlas-round .atlas-card-main { display:contents; }
.atlas-round .atlas-card-subject {
  display:grid; grid-area:subject; grid-template-columns:52px minmax(0,1fr) auto; align-items:center;
  gap:16px; min-width:0; padding-bottom:24px; border-bottom:1px solid var(--round-line);
}
.atlas-round .atlas-card-avatar {
  display:flex; width:52px; height:52px; flex:none; align-items:center; justify-content:center;
  border:1px solid var(--round-line); border-radius:12px; background:var(--round-raised);
  color:var(--round-ink-2); font:400 15px/1 "Geist Mono",ui-monospace,monospace;
}
.atlas-round .atlas-card-subject-copy { display:flex; min-width:0; flex-direction:column; align-items:flex-start; gap:4px; }
.atlas-round .atlas-card-subject-copy h2 { margin:0; color:var(--round-ink); font:500 28px/1.15 "Geist",sans-serif; letter-spacing:-.02em; overflow-wrap:anywhere; }
.atlas-round .atlas-card-subject-copy p { margin:0; color:var(--round-ink-2); font:400 14px/1.45 "Geist",sans-serif; }
.atlas-round .atlas-card-subject-copy>span { color:var(--round-ink-3); font:400 12px/1.4 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-card-subject-type { color:var(--round-ink-2); font:400 12px/1.3 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-card-subject-score { display:flex; flex-direction:column; align-items:flex-end; gap:3px; text-align:right; }
.atlas-round .atlas-card-subject-score span,.atlas-round .atlas-card-subject-score small { color:var(--round-ink-3); font:400 11px/1.3 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-card-subject-score strong { color:var(--round-ink); font:500 16px/1.2 "Geist Mono",ui-monospace,monospace; font-variant-numeric:tabular-nums; }
.atlas-round .atlas-card-route-empty { grid-area:route; min-width:0; }
.atlas-round .atlas-card-sidebar { display:flex; grid-area:sidebar; min-width:0; flex-direction:column; gap:12px; }
.atlas-round .atlas-card-board.is-company-card { grid-template-areas:"subject subject" "main sidebar"; }
.atlas-round .atlas-card-section { min-width:0; padding:16px; border:1px solid var(--round-line); border-radius:12px; background:var(--round-raised); }
.atlas-round .atlas-card-section h3 { margin:0; color:var(--round-ink); font:500 15px/1.35 "Geist",sans-serif; }
.atlas-round .atlas-card-section-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px; }
.atlas-round .atlas-card-section-heading p { margin:4px 0 0; color:var(--round-ink-3); font:400 11px/1.45 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-card-section-heading>span { flex:none; color:var(--round-ink-3); font:400 11px/1.4 "Geist Mono",ui-monospace,monospace; text-align:right; }
.atlas-round .atlas-card-claims { grid-area:main; min-width:0; }
.atlas-round .atlas-card-claims>ul { margin:0; padding:0; list-style:none; }
.atlas-round .atlas-card-claims>ul>li { display:grid; grid-template-columns:8px minmax(0,1fr) auto; align-items:start; gap:16px; padding:20px 0; border-top:1px solid var(--round-line); }
.atlas-round .atlas-card-claim-copy { display:flex; min-width:0; flex-direction:column; gap:4px; }
.atlas-round .atlas-card-claim-copy strong { color:var(--round-ink); font:500 16px/1.35 "Geist",sans-serif; overflow-wrap:anywhere; }
.atlas-round .atlas-card-claim-copy p { margin:0; color:var(--round-ink); font:400 14px/1.45 "Geist",sans-serif; overflow-wrap:anywhere; }
.atlas-round .atlas-card-claim-copy small,.atlas-round .atlas-card-claim-copy a { color:var(--round-ink-3); font:400 11px/1.5 "Geist Mono",ui-monospace,monospace; overflow-wrap:anywhere; }
.atlas-round .atlas-card-claim-status { color:var(--round-ink-3); font:500 12px/1.4 "Geist Mono",ui-monospace,monospace; white-space:nowrap; }
.atlas-round .atlas-card-claim-status.is-supported { color:var(--round-green); }
.atlas-round .atlas-card-claim-status.is-corroborated { color:var(--round-blue); }
.atlas-round .atlas-card-claim-status.is-review { color:#7A5600; }
.atlas-round .atlas-card-claim-status.is-disputed { color:var(--round-red); }
.atlas-round .atlas-card-empty { padding:8px 0; color:var(--round-ink-2); font:400 13px/1.5 "Geist",sans-serif; }
.atlas-round .atlas-card-main-facts { grid-column:1; min-width:0; }
.atlas-round .atlas-card-main-facts .atlas-card-section { padding:16px 0; border:0; border-top:1px solid var(--round-line); border-radius:0; background:transparent; }
.atlas-round .atlas-card-sidebar .atlas-card-section { background:var(--round-raised); }
.atlas-round .atlas-card-contact-groups { display:flex; flex-direction:column; gap:12px; }
.atlas-round .atlas-card-contact-label { display:block; margin:0 0 6px; color:var(--round-ink-3); font:400 11px/1.4 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-card-contact-empty { margin:0; color:var(--round-ink-2); font:400 13px/1.45 "Geist",sans-serif; }
.atlas-round .atlas-card-people-list { display:flex; flex-direction:column; gap:12px; margin:0; padding:0; list-style:none; }
.atlas-round .atlas-card-people-list li { display:flex; flex-direction:column; gap:4px; padding-top:10px; border-top:1px solid var(--round-line); }
.atlas-round .atlas-card-people-list li:first-child { padding-top:0; border-top:0; }
.atlas-round .atlas-card-people-list a { display:flex; min-width:0; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:4px 12px; color:var(--round-ink); text-decoration:none; }
.atlas-round .atlas-card-people-list strong { font:500 13px/1.4 "Geist",sans-serif; overflow-wrap:anywhere; }
.atlas-round .atlas-card-people-list a span,.atlas-round .atlas-card-people-list small { color:var(--round-ink-3); font:400 11px/1.4 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-card-behind-metrics { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:12px 0; }
.atlas-round .atlas-card-behind-metrics>div { display:flex; min-width:0; flex-direction:column; gap:3px; }
.atlas-round .atlas-card-behind-metrics strong { color:var(--round-ink); font:500 24px/1.1 "Geist",sans-serif; font-variant-numeric:tabular-nums; }
.atlas-round .atlas-card-behind-metrics span { color:var(--round-ink-3); font:400 10px/1.4 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-card-behind>p { margin:0; color:var(--round-ink-2); font:400 13px/1.5 "Geist",sans-serif; }

@media (max-width:900px) and (min-width:761px) {
  .atlas-card-shell-header { gap:12px; }
  .atlas-card-shell-navlink { padding-inline:8px; }
  .atlas-round .atlas-card-board { grid-template-columns:minmax(0,1fr) 280px; gap:16px 24px; padding-right:24px; }
}
@media (max-width:760px) {
  .atlas-round-shell.is-card-page .atlas-round-main { min-height:calc(100dvh - 60px); }
  .atlas-round-shell.is-card-page .atlas-round-content { padding:16px 16px 24px; }
  .atlas-card-shell-header { min-height:60px; gap:12px; padding:0 16px; padding-top:env(safe-area-inset-top); }
  .atlas-card-shell-nav { display:none; }
  .atlas-card-shell-status { max-width:130px; margin-left:auto; }
  .atlas-card-shell-status .atlas-round-status { gap:6px; font-size:12px; }
  .atlas-card-shell-status .atlas-round-status-full { display:none; }
  .atlas-card-shell-status .atlas-round-status-short { display:inline; }
  .atlas-round .atlas-board-profile .atlas-board-page-breadcrumb { display:none; }
  .atlas-round .atlas-board-profile .atlas-board-page-intro { margin-bottom:20px; }
  .atlas-round .atlas-board-profile .atlas-board-page-intro h1 { font-size:36px!important; line-height:1.05!important; }
  .atlas-round .atlas-board-profile .atlas-board-page-intro p { display:none; }
  .atlas-round .atlas-board-profile .atlas-profile-tab { max-width:190px; min-height:44px; gap:7px; padding:10px 11px; }
  .atlas-round .atlas-board-profile .atlas-profile-tab:nth-of-type(n + 4) { display:inline-flex; }
  .atlas-round .atlas-board-profile .atlas-profile-tab-more { display:none; }
  .atlas-round .atlas-card-board { grid-template-columns:minmax(0,1fr); grid-template-areas:"subject" "route" "main" "sidebar"; gap:0; padding:16px 16px 20px 28px; border-radius:0 16px 16px 16px; }
  .atlas-round .atlas-card-board.is-company-card { grid-template-areas:"subject" "main" "sidebar"; }
  .atlas-round .atlas-card-board::before { top:8px; bottom:8px; left:8px; }
  .atlas-round .atlas-card-subject { grid-template-columns:52px minmax(0,1fr); gap:10px 12px; padding-bottom:16px; }
  .atlas-round .atlas-card-subject-copy h2 { font-size:22px; line-height:1.15; }
  .atlas-round .atlas-card-subject-copy p { font-size:13px; }
  .atlas-round .atlas-card-subject-score { grid-column:1/-1; flex-direction:row; align-items:center; gap:8px; text-align:left; }
  .atlas-round .atlas-card-subject-score small { margin-left:auto; }
  .atlas-round .atlas-card-route-empty { grid-area:route; margin-top:16px; }
  .atlas-round .atlas-card-claims { grid-area:main; margin-top:16px; }
  .atlas-round .atlas-card-sidebar { grid-area:sidebar; margin-top:12px; }
  .atlas-round .atlas-card-claims>ul>li { grid-template-columns:8px minmax(0,1fr); gap:12px; padding:16px 0; }
  .atlas-round .atlas-card-claims>ul>li>.atlas-card-claim-status:last-child { grid-column:2; justify-self:start; }
  .atlas-round .atlas-card-claim-copy strong { font-size:15px; }
}

```

### Mock adapter and Card root class

**File:** `artifacts/apex-finder/src/pages/profile.tsx`

The complete moved `if (boardMode)` renderer is in Change 1 above. These two supporting replacements are:

```tsx
import { useState, useEffect, useMemo } from "react";

const entity = useMemo(() => mockEntity
  ? ({
      ...mockEntity,
      metadata: null,
      isHot: (mockEntity.accessScore ?? 0) >= 0.55,
      contactEmail: mockEntity.email,
      contactPhone: mockEntity.phone,
    } as any)
  : entityFromApi, [mockEntity, entityFromApi]);

<div className={`atlas-card-board${isCompanyCard ? " is-company-card" : ""}`}>
```

