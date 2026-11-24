# Reactor frontend audit — design-board completion handoff

## Scope and safety

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Base branch: `ui/design-board-faithful-2026-11-23` (latest tip when this work branch was created)
- Work branch: `agent/reactor-board-finish-2026-11-24-v2`
- Page: `/reactor`; preserve `/reactor/topology` as its existing utility route.
- Design reference: `https://design-board-812905.netlify.app/`
- Frontend-only. Do not change API contracts, schemas, routes, database, workers, research logic, evidence admission, or persistence.
- Never launch a research run, start the bureau, or fabricate events, people, sources, routes, metrics, or outcomes.
- Keep existing controls and backend-derived state authoritative. Keep the classic UI and all navigation destinations intact.
- This is a stacked frontend completion branch, not a merge to `main`.

## Baseline review

The current design-board branch already contains the Reactor board-mode Logbook and Run console projection:
- Canonical live telemetry, chronological event ordering, last-step time, filters/search, run status, Retry, metrics, and the existing full-topology link are present.
- The console itself was still a plain rule-only aside without the board shield or patterned console field.
- The global floating error notice displayed connectivity/proxy errors even though Reactor already has an inline API-down state and Retry action.
- The older Replit audit refers to a different imported snapshot. Its shared-shell/navigation patches are not copied into this Reactor-only branch.

The existing Reactor API-down text and Retry control are retained. The neutral console frame uses only the existing `apiAvailable` state. No evidence patterns are assigned to execution events.

## Patch log

### Patch 1 — add the board shield mark

New file: `artifacts/apex-finder/src/components/apex-atlas-mark.tsx`

```tsx
import { useId } from "react";

/** Board heraldic mark: four tinctures clipped to the Atlas shield silhouette. */
export function ApexAtlasMark({ className = "atlas-reactor-board-mark" }: { className?: string }) {
  const clipId = `atlas-shield-${useId().replace(/:/g, "")}`;
  return (
    <svg className={className} viewBox="0 0 20 22" aria-hidden="true" focusable="false">
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

Reason: the board uses a quartered red/gold shield, not the generic Reactor glyph. The unique clipPath ID supports multiple rendered instances safely.

### Patch 2 — update the Run console markup

File: `artifacts/apex-finder/src/pages/reactor.tsx`

Add the import:

```tsx
import { ApexAtlasMark } from "../components/apex-atlas-mark";
```

Replace the opening of the existing Run console:

```tsx
<aside className={"atlas-reactor-run-console" + (apiAvailable === false ? " is-api-down" : "")} aria-labelledby="atlas-reactor-run-console-title">
  <div className="atlas-reactor-run-console-inner">
  <div className="atlas-reactor-board-heading">
    <div><h2 id="atlas-reactor-run-console-title" className="atlas-reactor-board-title"><ApexAtlasMark /><span>Run console</span></h2><p>Canonical run state</p></div>
```

Close the new inner wrapper immediately before the existing aside close:

```tsx
<a className="atlas-reactor-topology-link" href="/reactor/topology">Open full Reactor topology</a>
</div>
</aside>
```

Reason: add the board shield and an inner white surface while retaining the existing console state, metrics, Retry, Launch/Stop, and topology controls. The API-down modifier derives from the already-existing `apiAvailable` state only.

### Patch 3 — add the heraldic frame

Append to `artifacts/apex-finder/src/flat-round.css`:

```css
/* Reactor board console frame: heraldic checky and corroboration waves. */
.atlas-round .atlas-reactor-run-console {
  position:relative;
  isolation:isolate;
  min-width:0;
  padding:8px;
  border:0;
  border-radius:20px;
  overflow:hidden;
  background-color:#2757C6;
  background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='32'%20height='24'%20viewBox='0%200%2032%2024'%3E%3Cpath%20d='M-16%2012%20C-8%204%20-8%204%200%2012%20S8%2020%2016%2012%20S24%204%2032%2012%20S40%2020%2048%2012'%20fill='none'%20stroke='%23FAFAF8'%20stroke-width='1.35'%20stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:repeat;
  background-size:32px 24px;
}
.atlas-round .atlas-reactor-run-console::before {
  content:"";
  position:absolute;
  z-index:-1;
  inset:0 50% 0 0;
  border-radius:20px 0 0 20px;
  background-color:#EDB92B;
  background-image:conic-gradient(#C8321E 25%,#EDB92B 0 50%,#C8321E 0 75%,#EDB92B 0);
  background-size:16px 16px;
  pointer-events:none;
}
.atlas-round .atlas-reactor-run-console.is-api-down {
  background-color:#BDBDB8;
  background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='16'%20height='8'%3E%3Cpath%20d='M0%204q4-4.5%208%200t8%200'%20fill='none'%20stroke='%23E6E6E2'%20stroke-width='1.3'/%3E%3C/svg%3E");
  background-size:16px 8px;
}
.atlas-round .atlas-reactor-run-console.is-api-down::before {
  background-color:#BDBDB8;
  background-image:conic-gradient(#BDBDB8 25%,#E2E2DD 0 50%,#BDBDB8 0 75%,#E2E2DD 0);
  background-size:16px 16px;
}
.atlas-round .atlas-reactor-run-console-inner {
  position:relative;
  z-index:0;
  min-width:0;
  padding:20px;
  border-radius:12px;
  background:var(--round-card);
}
.atlas-round .atlas-reactor-board-title { display:flex; align-items:center; gap:8px; }
.atlas-round .atlas-reactor-board-mark { display:block; width:16px; height:17.6px; flex:none; }
.atlas-round .atlas-reactor-run-console .atlas-reactor-board-heading h2 { font-size:15px!important; }
@media (max-width:760px) {
  .atlas-round .atlas-reactor-run-console-inner { padding:16px; }
}
```

Reason: match the board's red/gold checky left edge and blue wave right edge, with a neutral grey equivalent while the API is unavailable. The inner card stays white. Phone inset is reduced without changing the responsive column order or controls.

### Patch 4 — suppress duplicate connectivity alerts on Reactor only

File: `artifacts/apex-finder/src/components/apex-error-notice.tsx`

Replace the event-handler setup inside `useEffect` with:

```tsx
const showError=(next:ApexUserError)=>{
  const onReactor=window.location.pathname==="/reactor"||window.location.pathname.startsWith("/reactor/");
  const isInlineReactorApiError=next.title==="The Apex research service is unavailable"
    ||/Research API is not reachable \(got an HTML page instead of JSON\)/i.test(next.message)
    ||/^API returned non-JSON \(\d{3}\)/i.test(next.message);
  if(onReactor&&isInlineReactorApiError) return;
  setError(next);
};
const on=(e:Event)=>showError((e as CustomEvent<ApexUserError>).detail);
window.addEventListener("apex:error",on);
const onWindow=(e:ErrorEvent)=>showError(classifyApexError(e.error?.message ?? e.message));
const onRejection=(e:PromiseRejectionEvent)=>showError(classifyApexError(e.reason?.message ?? e.reason));
```

Reason: Reactor already has an inline API-unavailable status and Retry control. Suppress only known API connectivity/proxy messages on `/reactor` and its subroutes. Keep genuine action, auth, provider, database, and other errors eligible for the global alert; all non-Reactor pages are unchanged.

### Patch 5 — regex escaping correction

A source-level review caught and corrected a double-escaping issue before verification. The two regex literals in Patch 4 must contain a single backslash before each literal parenthesis, exactly as shown in the final code block above. The committed source now uses that exact form.

## Verification and remaining gates

- GitHub branch comparison confirms this work branch is based on the current design-board branch tip and contains only the Reactor audit, shield component, Reactor markup, Reactor CSS, and Reactor connectivity-notice changes.
- Source-level review confirms the inline API-down state, Retry action, metrics, launch/stop controls, chronological Logbook, filters, and topology link are retained.
- No backend/API/schema/database/worker files were edited. No bureau or research run was started.
- Rendered desktop and 390px mobile screenshot comparison is **not verified** in this environment. Do not describe the work as visually signed off until the deployed preview is inspected against the board.
- Run the repository frontend build/typecheck, Reactor no-fabrication contract, responsive contract, and relevant CI on the exact final branch head before merge.
- Keep this branch separate from `main`; do not mark the parent design-board PR ready or merge based only on these source changes.

### Patch 6 — correct the HTTP status-code matcher escaping

A second literal-escaping review found that the status-code expression must use the single-backslash digit class `\d{3}`, not a literal backslash followed by “d”. The committed source now uses exactly:

```tsx
/^API returned non-JSON \(\d{3}\)/i
```

This ensures only a three-digit HTTP status response is matched.
