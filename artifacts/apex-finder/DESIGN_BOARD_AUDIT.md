# Apex Atlas — Ledger design implementation audit

## Scope and constraints
- Design source: supplied Apex Atlas design board and the user-provided Ledger handoff.
- Target files: `artifacts/apex-finder/src/pages/board-ledger.tsx` and `artifacts/apex-finder/src/flat-round.css`.
- Backend, database, API contracts, routes, research pipeline, worker and launch controls are unchanged.
- Existing five primary routes remain unchanged. No sample people or invented records are introduced.
- Isolated on `work/ledger-board-fidelity`; not merged or deployed.
- API order remains authoritative. Wealth score is displayed as a separate signal, never used for local sorting.
- Seven filters (All plus six API outcome buckets) and all summary counts derive from the live API response.

## Direction
- Product: a source-attributed register of people discovered by Apex Atlas.
- Character: exact, archival, quietly technical.
- World: paper register, ink, evidence marks and restrained heraldic red.
- Moments: patterned search console and source-attributed people register.
- Signature: paper-console frame and API-backed outcome marks, always paired with readable labels.

## Implementation chronology
1. Re-composed the page into a two-column desktop grid: title, console and summary on the left; register on the right.
2. Added a three-number summary from real API records: people, direct verified, direct candidates.
3. Preserved the seven live contact-outcome filters and exact outcome categories.
4. Added API-name-derived initials and source display on desktop and mobile.
5. Added mobile register cards instead of shrinking the dense desktop table.
6. Kept loading, empty, API-error, saved-data/API-down and retry states.
7. Kept API order explicit and wealth score separate; did not add client-side ranking.

## Exact code changes
### `artifacts/apex-finder/src/pages/board-ledger.tsx`
- Added `initials(name)` and `entitySources(entity)`.
- Initial visible record count changed from 5 to 8; “Show 25 more” remains incremental.
- Added `.atlas-ledger-summary` with API-derived People, Direct verified and Direct candidates values.
- Desktop table now includes actual-name initials, explicit contact outcome, wealth score and source attribution.
- Mobile cards display the same real record details and retain existing `/profile/:id` links.
- Existing API fetch, entity filtering, API order, outcome classification and refetch behavior retained.

### `artifacts/apex-finder/src/flat-round.css`
- Replaced the existing Ledger CSS block with the new page-specific layout.
- Desktop grid: `minmax(280px,.78fr) minmax(0,1.22fr)`, 48px column gap.
- Console and summary occupy the left column; register spans the right column.
- Console frame uses red check pattern on the left and blue dotted pattern on the right.
- Mobile breakpoint: 760px; title, console, summary and cards stack in DOM order. Table is hidden only at this breakpoint.
- Contact outcome styles are keyed by the actual `data-outcome` value; all states retain text.

## Verification status
- Branch commit `e2e97084260bc5cde355b42688bc367ff6251859` was built by Vercel successfully: deployment state READY; Vite reported `✓ built in 1.64s`.
- Build-time launch, source-boundary, API error-boundary, operator-auth and generated-reactor checks passed.
- The branch-triggered Frontend responsive contract workflow failed at `Check Apex frontend polish contract` before dependency installation/build. The new mobile Ledger styles had three 10px metadata declarations, violating the repository-wide 11px minimum. Corrected all three to 11px in the follow-up commit; the workflow rerun is pending.
- Browser rendering and desktop/390px screenshots have not yet been run. Do not claim visual verification until completed.
- No backend process was started; no Bureau/research execution was triggered.

## Follow-up verification
1. Run frontend build only; do not run `scripts/replit-boot.sh`, API, worker, database or Bureau.
2. Run `board-ledger-person-contract.test.ts` and relevant UI contract tests.
3. Render desktop and 390px mobile with populated, empty and API-down retained-data states.
4. Check overflow, focus visibility, button targets and long source labels.
5. Append exact code changes and actual results after every correction.

## Attribution
This pass follows Unslop by Damir Sokolovsky, licensed CC BY 4.0: https://github.com/heydamir/unslop


## Follow-up correction — minimum mobile type size
- CI failure identified: the existing Apex frontend polish contract enforces an 11px minimum for active-board metadata.
- Corrected the new Ledger CSS declarations from 10px to 11px:
```css
.atlas-round .atlas-ledger-register-meta { font-size:11px; }
.atlas-round .atlas-ledger-mobile-card-meta { font:400 11px/1.5 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-ledger-mobile-card-meta strong { font:400 11px/1.5 "Geist Mono",ui-monospace,monospace; overflow-wrap:anywhere; }
```
- No component logic, backend, route, or data behavior changed in this correction.


## Follow-up correction — spacing and radius contract
- The first rerun passed the responsive, Reactor Live, Home UI, and frontend polish source contracts, plus the Vite build. The remaining responsive workflow failure was in the shared `board-spacing-grid-contract.test.ts` (not a Ledger runtime or backend failure).
- The new Ledger CSS introduced 10px gaps/table side padding and an 8px “Show more” radius, which violated the repository's 4px spacing grid and documented radius scale.
- Corrected those literal declarations:
```css
.atlas-round .atlas-ledger-person { gap:8px; }
.atlas-round .atlas-ledger-table th { padding:12px 8px; }
.atlas-round .atlas-ledger-table td { padding:12px 8px; }
.atlas-round .atlas-ledger-mobile-card-top { gap:8px; }
.atlas-round .atlas-ledger-view-all { border-radius:10px; }
```
- The mobile metadata remains 11px after the prior correction. No component, API, route or backend code changed.


## Follow-up correction — complete 4px spacing grid
- The shared spacing contract found two remaining declarations in the new Ledger block: `gap:6px` in register metadata and `padding:14px 8px` on mobile summary cells.
- Corrected to the documented 4px scale:
```css
.atlas-round .atlas-ledger-register-meta { gap:8px; }
.atlas-round .atlas-ledger-summary > div { padding:16px 8px; }
```
- Exact local regex recheck after this edit: zero spacing declarations outside 4px increments; zero unsupported border radii.
- The 11px minimum metadata correction remains in place.


## Follow-up correction — remove superseded duplicate rule
- Removed the obsolete trailing `.atlas-ledger-contact-outcome` declaration that followed the replacement Ledger CSS block. The full rule now exists once, next to the outcome-specific data selectors in the new Ledger block.
```css
.atlas-round .atlas-ledger-contact-outcome {
  display:inline-flex;
  max-width:190px;
  padding:4px 8px;
  border:1px solid var(--round-line);
  border-radius:6px;
  color:var(--round-ink-2);
  font:400 11px/1.4 "Geist Mono",ui-monospace,monospace;
  white-space:normal;
}
```
- This was a CSS-only deduplication; no visual behavior or data logic changed.
- Previous run `45329026111` passed: responsive, Reactor Live, Home UI and frontend polish contracts; frontend build; board spacing/radius contract; Reactor page job-poll tests (19 tests total).


## Follow-up correction — match the board's exact console patterns
- Replaced the provisional red check tint and blue dotted field with the exact repeating heraldic check and corroboration wave treatments already used by the approved Home console.
- Left console edge: gold ground with quartered red/gold 24×24 SVG tile.
- Right console edge: cobalt ground with the 32×24 repeating white wave SVG tile.
```css
.atlas-round .atlas-ledger-console::before {
  left:0; border-radius:20px 0 0 20px;
  background-color:#EDB92B;
  background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3E%3Crect%20width='12'%20height='12'%20fill='%23C8321E'/%3E%3Crect%20x='12'%20y='12'%20width='12'%20height='12'%20fill='%23C8321E'/%3E%3Crect%20x='12'%20width='12'%20height='12'%20fill='%23EDB92B'/%3E%3Crect%20y='12'%20width='12'%20height='12'%20fill='%23EDB92B'/%3E%3C/svg%3E");
  background-repeat:repeat; background-size:24px 24px;
}
.atlas-round .atlas-ledger-console::after {
  right:0; border-radius:0 20px 20px 0;
  background-color:#2757C6;
  background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='32'%20height='24'%20viewBox='0%200%2032%2024'%3E%3Cpath%20d='M-16%2012%20C-8%204%20-8%204%200%2012%20S8%2020%2016%2012%20S24%204%2032%2012%20S40%2020%2048%2012'%20fill='none'%20stroke='%23FAFAF8'%20stroke-width='1.35'%20stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:repeat; background-position:0 0; background-size:32px 24px;
}
```
- These patterns reuse the design-board treatment; no new palette or data state was introduced.


## Final verification — latest source branch
- Branch head: `1fab402026f50149779a49f49b0dfe3f36fd3823`.
- GitHub Actions Frontend responsive contract run `45329211423`: **success**.
- Passed: responsive source contract, Reactor Live integrity contract, Home UI contract, Apex frontend polish contract (**69 checks**), Vite frontend build, and 2 Vitest files / 19 tests.
- The browser screenshot step was skipped by the workflow's existing branch-name condition; this run did not produce desktop/mobile screenshots. The separate Ledger person-contract test file was not included in that workflow. Its core source assertions were checked directly against the updated file; do not describe that Vitest file as run.
- Exact 4px spacing scan: 0 violations. Documented radius scan: 0 unsupported radii.
- No backend, database, API, worker, Bureau or research job was started.

## Complete literal source snapshot for the next agent

The following is the exact current Ledger page source, followed by the exact Ledger-only CSS replacement block. These are snapshots from branch head `1fab402026f50149779a49f49b0dfe3f36fd3823`; if the source is changed later, update this appendix in the same change.

### `artifacts/apex-finder/src/pages/board-ledger.tsx`
```tsx
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

```

### Ledger block in `artifacts/apex-finder/src/flat-round.css`
```css
/* Ledger board: a paper console and a source-attributed, API-ordered register. */
.atlas-round .atlas-board-ledger { padding-top:32px; }
.atlas-round .atlas-board-ledger .atlas-board-page-grid { display:grid; grid-template-columns:minmax(280px,.78fr) minmax(0,1.22fr); column-gap:48px; row-gap:24px; align-items:start; }
.atlas-round .atlas-board-ledger .atlas-board-page-intro { grid-column:1; grid-row:1; max-width:430px; margin:0; }
.atlas-round .atlas-board-ledger .atlas-board-page-intro h1 { max-width:430px; }
.atlas-round .atlas-board-ledger .atlas-board-page-intro p { margin-top:16px; font-size:15px; line-height:1.6; }
.atlas-round .atlas-ledger-layout { display:contents; }
.atlas-round .atlas-ledger-console { grid-column:1; grid-row:2; min-width:0; position:relative; isolation:isolate; padding:8px; border:0; border-radius:20px; overflow:hidden; background:transparent; }
.atlas-round .atlas-ledger-console::before,.atlas-round .atlas-ledger-console::after { content:""; position:absolute; z-index:-1; top:0; bottom:0; width:50%; pointer-events:none; }
.atlas-round .atlas-ledger-console::before {
  left:0; border-radius:20px 0 0 20px;
  background-color:#EDB92B;
  background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3E%3Crect%20width='12'%20height='12'%20fill='%23C8321E'/%3E%3Crect%20x='12'%20y='12'%20width='12'%20height='12'%20fill='%23C8321E'/%3E%3Crect%20x='12'%20width='12'%20height='12'%20fill='%23EDB92B'/%3E%3Crect%20y='12'%20width='12'%20height='12'%20fill='%23EDB92B'/%3E%3C/svg%3E");
  background-repeat:repeat; background-size:24px 24px;
}
.atlas-round .atlas-ledger-console::after {
  right:0; border-radius:0 20px 20px 0;
  background-color:#2757C6;
  background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='32'%20height='24'%20viewBox='0%200%2032%2024'%3E%3Cpath%20d='M-16%2012%20C-8%204%20-8%204%200%2012%20S8%2020%2016%2012%20S24%204%2032%2012%20S40%2020%2048%2012'%20fill='none'%20stroke='%23FAFAF8'%20stroke-width='1.35'%20stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:repeat; background-position:0 0; background-size:32px 24px;
}
.atlas-round .atlas-ledger-console-inner { position:relative; z-index:1; min-width:0; padding:20px; border:1px solid var(--round-line); border-radius:12px; background:var(--round-card); }
.atlas-round .atlas-ledger-section-heading,.atlas-round .atlas-ledger-register-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:16px; }
.atlas-round .atlas-ledger-section-heading h2,.atlas-round .atlas-ledger-register-heading h2 { margin:0; color:var(--round-ink)!important; font:500 20px/1.2 "Geist",sans-serif!important; letter-spacing:0!important; }
.atlas-round .atlas-ledger-section-heading > span { color:var(--round-ink-3); font:400 11px "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-ledger-search { display:flex; min-height:46px; align-items:center; gap:12px; padding:0 12px; border:1px solid var(--round-line); border-radius:10px; background:#fff; }
.atlas-round .atlas-ledger-search svg { width:15px; height:15px; color:var(--round-ink-3); flex:none; }
.atlas-round .atlas-ledger-search input { width:100%; min-width:0; min-height:42px; border:0!important; outline:0; padding:0!important; background:transparent!important; color:var(--round-ink)!important; font:400 13px "Geist",sans-serif!important; box-shadow:none!important; }
.atlas-round .atlas-ledger-search input::placeholder { color:var(--round-ink-3)!important; opacity:1; }
.atlas-round .atlas-ledger-filters { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:16px; }
.atlas-round .atlas-ledger-filters button { display:flex; min-height:40px; align-items:center; justify-content:space-between; gap:8px; padding:0 12px; border:1px solid var(--round-line); border-radius:6px; background:#fff; color:var(--round-ink-2); font:400 11px "Geist",sans-serif; text-align:left; }
.atlas-round .atlas-ledger-filters button strong { color:var(--round-ink); font:500 12px "Geist Mono",ui-monospace,monospace; font-variant-numeric:tabular-nums; }
.atlas-round .atlas-ledger-filters button[aria-pressed="true"] { border-color:var(--round-ink); background:var(--round-raised); color:var(--round-ink); }
.atlas-round .atlas-ledger-console-note { margin:16px 0 0; color:var(--round-ink-3); font:400 11px/1.55 "Geist",sans-serif; }
.atlas-round .atlas-ledger-summary { grid-column:1; grid-row:3; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); margin-top:4px; border-top:1px solid var(--round-line); border-bottom:1px solid var(--round-line); }
.atlas-round .atlas-ledger-summary > div { display:flex; min-width:0; flex-direction:column; gap:8px; padding:16px 12px; }
.atlas-round .atlas-ledger-summary > div:first-child { padding-left:4px; }
.atlas-round .atlas-ledger-summary > div + div { border-left:1px solid var(--round-line); }
.atlas-round .atlas-ledger-summary strong { color:var(--round-ink); font:500 24px/1 "Geist",sans-serif; font-variant-numeric:tabular-nums; }
.atlas-round .atlas-ledger-summary span { color:var(--round-ink-3); font:400 11px/1.35 "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-ledger-register { grid-column:2; grid-row:1 / span 3; min-width:0; padding-top:4px; }
.atlas-round .atlas-ledger-register-heading { padding-bottom:16px; border-bottom:1px solid var(--round-line); }
.atlas-round .atlas-ledger-register-heading p { max-width:440px; margin:8px 0 0; color:var(--round-ink-3); font:400 11px/1.5 "Geist",sans-serif; }
.atlas-round .atlas-ledger-register-meta { display:flex; flex:none; flex-direction:column; align-items:flex-end; gap:8px; color:var(--round-ink-3); font:400 11px "Geist Mono",ui-monospace,monospace; white-space:nowrap; }
.atlas-round .atlas-ledger-register-meta strong { color:var(--round-ink); font-weight:500; font-variant-numeric:tabular-nums; }
.atlas-round .atlas-ledger-table-wrap { width:100%; overflow-x:auto; }
.atlas-round .atlas-ledger-table { width:100%; border-collapse:collapse; text-align:left; }
.atlas-round .atlas-ledger-table th { padding:12px 8px; border-bottom:1px solid var(--round-line); color:var(--round-ink-3); font:400 11px "Geist Mono",ui-monospace,monospace; letter-spacing:0; white-space:nowrap; }
.atlas-round .atlas-ledger-table td { padding:12px 8px; border-bottom:1px solid var(--round-line); color:var(--round-ink-2); vertical-align:middle; }
.atlas-round .atlas-ledger-person { display:flex; min-width:0; align-items:center; gap:8px; color:var(--round-ink); text-decoration:none; }
.atlas-round .atlas-ledger-initials { display:grid; width:34px; height:34px; flex:none; place-items:center; border:1px solid var(--round-line); border-radius:50%; background:var(--round-raised); color:var(--round-ink-2); font:500 11px "Geist Mono",ui-monospace,monospace; }
.atlas-round .atlas-ledger-person-copy { display:flex; min-width:0; flex:1; flex-direction:column; gap:4px; }
.atlas-round .atlas-ledger-person strong { color:var(--round-ink); font:500 12px "Geist",sans-serif; }
.atlas-round .atlas-ledger-person small { max-width:250px; overflow:hidden; color:var(--round-ink-3); font:400 11px/1.4 "Geist",sans-serif; text-overflow:ellipsis; white-space:nowrap; }
.atlas-round .atlas-ledger-person > svg { width:12px; height:12px; margin-left:auto; color:var(--round-ink-3); flex:none; }
.atlas-round .atlas-ledger-contact-outcome { display:inline-flex; max-width:190px; padding:4px 8px; border:1px solid var(--round-line); border-radius:6px; color:var(--round-ink-2); font:400 11px/1.4 "Geist Mono",ui-monospace,monospace; white-space:normal; }
.atlas-round .atlas-ledger-contact-outcome[data-outcome="direct_contact_verified"] { border-color:#1F8A4D55; background:#1F8A4D0D; color:#17683C; }
.atlas-round .atlas-ledger-contact-outcome[data-outcome="direct_contact_candidate"] { border-color:#2757C655; background:#2757C60D; color:#234BA8; }
.atlas-round .atlas-ledger-score { color:var(--round-ink)!important; font:500 12px "Geist Mono",ui-monospace,monospace!important; font-variant-numeric:tabular-nums; }
.atlas-round .atlas-ledger-sources { max-width:190px; color:var(--round-ink-3)!important; font:400 11px/1.45 "Geist Mono",ui-monospace,monospace!important; overflow-wrap:anywhere; }
.atlas-round .atlas-ledger-state { display:flex; min-height:180px; flex-direction:column; align-items:flex-start; justify-content:center; gap:8px; padding:20px 0; border-bottom:1px solid var(--round-line); color:var(--round-ink-2); font:400 13px/1.5 "Geist",sans-serif; }
.atlas-round .atlas-ledger-state strong { color:var(--round-ink); font-weight:500; }
.atlas-round .atlas-ledger-state button,.atlas-round .atlas-ledger-stale button { display:inline-flex; align-items:center; gap:8px; min-height:36px; padding:0 12px; border:1px solid var(--round-line); border-radius:6px; background:#fff; color:var(--round-ink); font-size:11px; }
.atlas-round .atlas-ledger-state button svg,.atlas-round .atlas-ledger-stale button svg { width:13px; height:13px; }
.atlas-round .atlas-ledger-stale { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 0; border-bottom:1px solid var(--round-line); }
.atlas-round .atlas-ledger-stale > div { display:flex; min-width:0; flex-direction:column; gap:4px; }
.atlas-round .atlas-ledger-stale strong { color:#A92718; font:500 12px "Geist",sans-serif; }
.atlas-round .atlas-ledger-stale span { color:var(--round-ink-2); font:400 11px/1.5 "Geist",sans-serif; }
.atlas-round .atlas-ledger-mobile-list { display:none; }
.atlas-round .atlas-ledger-view-all { display:block; width:100%; min-height:40px; margin-top:12px; border:1px solid var(--round-line); border-radius:10px; background:#fff; color:var(--round-ink); font:500 12px "Geist",sans-serif; }
@media (max-width:760px) {
  .atlas-round .atlas-board-ledger { padding-top:24px; }
  .atlas-round .atlas-board-ledger .atlas-board-page-grid { grid-template-columns:minmax(0,1fr); row-gap:20px; }
  .atlas-round .atlas-board-ledger .atlas-board-page-intro { grid-column:1; grid-row:auto; max-width:100%; }
  .atlas-round .atlas-board-ledger .atlas-board-page-intro h1 { font-size:40px!important; line-height:1.04!important; }
  .atlas-round .atlas-board-ledger .atlas-board-page-intro p { margin-top:12px; font-size:15px!important; }
  .atlas-round .atlas-ledger-console { grid-column:1; grid-row:auto; padding:8px; }
  .atlas-round .atlas-ledger-console-inner { padding:16px; }
  .atlas-round .atlas-ledger-filters { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .atlas-round .atlas-ledger-summary { grid-column:1; grid-row:auto; margin-top:0; }
  .atlas-round .atlas-ledger-summary strong { font-size:21px; }
  .atlas-round .atlas-ledger-summary > div { padding:16px 8px; }
  .atlas-round .atlas-ledger-register { grid-column:1; grid-row:auto; padding-top:0; }
  .atlas-round .atlas-ledger-register-heading { align-items:flex-start; }
  .atlas-round .atlas-ledger-register-heading h2 { font-size:18px!important; }
  .atlas-round .atlas-ledger-register-meta { font-size:11px; }
  .atlas-round .atlas-ledger-table-wrap { display:none; }
  .atlas-round .atlas-ledger-mobile-list { display:grid; }
  .atlas-round .atlas-ledger-mobile-card { display:grid; gap:12px; padding:16px 0; border-bottom:1px solid var(--round-line); }
  .atlas-round .atlas-ledger-mobile-card-top { display:grid; min-width:0; gap:8px; }
  .atlas-round .atlas-ledger-mobile-card-top .atlas-ledger-contact-outcome { justify-self:start; }
  .atlas-round .atlas-ledger-mobile-card-meta { display:grid; grid-template-columns:minmax(76px,.55fr) minmax(0,1.45fr); gap:12px; color:var(--round-ink-3); font:400 11px/1.5 "Geist Mono",ui-monospace,monospace; }
  .atlas-round .atlas-ledger-mobile-card-meta span { display:flex; min-width:0; flex-direction:column; gap:4px; }
  .atlas-round .atlas-ledger-mobile-card-meta strong { color:var(--round-ink-2); font:400 11px/1.5 "Geist Mono",ui-monospace,monospace; overflow-wrap:anywhere; }
  .atlas-round .atlas-ledger-view-all { margin-top:16px; }
}
```
