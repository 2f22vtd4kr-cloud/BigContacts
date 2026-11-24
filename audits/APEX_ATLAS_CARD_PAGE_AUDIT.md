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
