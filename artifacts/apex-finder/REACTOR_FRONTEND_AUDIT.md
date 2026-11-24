# Reactor frontend audit — design-board completion handoff

## Scope and safety

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Base: latest `ui/design-board-faithful-2026-11-23` branch tip at the time this branch was created (resolved by GitHub from the branch ref)
- Work branch: `agent/reactor-board-finish-2026-11-24-v2`
- Page: `/reactor` only; preserve `/reactor/topology` as its existing utility route.
- Reference: `https://design-board-812905.netlify.app/`
- Backend, API contracts, schemas, routes, database, workers, research logic, and evidence admission are out of scope and must remain unchanged.
- Never launch a research run, start the bureau, or fabricate events, people, sources, routes, metrics, or outcomes.
- The classic UI and all existing navigation destinations remain intact.
- This handoff is cumulative. Every patch below records the exact source change and its reason.

## Baseline — current GitHub branch

The current PR #943 branch already contains the board-mode Reactor Logbook and Run console projection, including chronological canonical telemetry, filters/search, run status, retry, metrics, and the full-topology utility link. The earlier Replit handoff describes a different imported snapshot and its layout patches are not present verbatim in the current GitHub branch. Do not transplant its unrelated navigation changes.

Confirmed current source locations:
- `artifacts/apex-finder/src/pages/reactor.tsx`
- `artifacts/apex-finder/src/flat-round.css`
- `artifacts/apex-finder/src/components/apex-error-notice.tsx`

Current board-mode console is rendered by `DesktopReactor` around lines 1683–1723. It is currently a plain rule-only aside with no board shield or patterned frame. The existing Reactor API-down state and Retry control are already inline.
The global error notice currently displays every classified API error, which can duplicate the inline Reactor API-down state.

## Patch log

### Baseline review — source changes are isolated on this refreshed branch

- Confirmed latest PR #943 head and created a separate work branch from the latest `ui/design-board-faithful-2026-11-23` branch tip.
- Reviewed the existing Reactor board-mode implementation and styles.
- The earlier Replit audit is treated as historical handoff only; current GitHub source is authoritative.
- No backend workflow, API, database, worker, bureau, or research run was started.
- Rendered visual comparison is not yet verified in this environment. Source-level changes must not be described as screenshot-verified.

### Patch 1 — add the board shield mark for the Reactor console

Added `artifacts/apex-finder/src/components/apex-atlas-mark.tsx`. It renders the four-quarter gules/or shield clipped to the board silhouette. `useId()` makes the clipPath identifier unique when the mark is rendered more than once. This component is intentionally scoped to the Reactor console; it does not change shared navigation or other tabs.

Exact new file:

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

No backend or API behavior changed. Visual screenshot verification remains pending.

### Patch 2 — place the shield in the Run console and add the frame state hook

Updated `artifacts/apex-finder/src/pages/reactor.tsx`:
- Imported `ApexAtlasMark`.
- Added the existing API availability state as the console's `is-api-down` modifier. This is presentation-only and uses the already-authoritative `apiAvailable` value.
- Wrapped existing console content in `.atlas-reactor-run-console-inner`.
- Added the shield beside the existing “Run console” heading.
- Preserved every existing metric, status, Retry control, launch/stop control, and topology link.

Exact changed console opening:

```tsx
<aside className={"atlas-reactor-run-console" + (apiAvailable === false ? " is-api-down" : "")} aria-labelledby="atlas-reactor-run-console-title">
  <div className="atlas-reactor-run-console-inner">
  <div className="atlas-reactor-board-heading">
    <div><h2 id="atlas-reactor-run-console-title" className="atlas-reactor-board-title"><ApexAtlasMark /><span>Run console</span></h2><p>Canonical run state</p></div>
```

Exact changed closing:

```tsx
<a className="atlas-reactor-topology-link" href="/reactor/topology">Open full Reactor topology</a>
</div>
</aside>
```

No run data or backend behavior was introduced. Screenshot verification remains pending.

### Patch 3 — add the patterned console frame and responsive inset

Appended Reactor-scoped rules to `artifacts/apex-finder/src/flat-round.css`:
- The left half uses the board's red/gold checky field; the right half uses the blue wave field.
- The inner white console retains all existing content and controls.
- When the existing API state is unavailable, the frame changes to neutral grey patterns, not fake live/active colors.
- The shield is sized beside the console title; the title is reduced to the board's compact console-heading scale.
- The inner inset tightens on phone widths.

Exact CSS added:

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

No execution-state or evidence-status semantics were added. Screenshot verification remains pending.

### Patch 4 — suppress duplicate Reactor-only connectivity alerts

Updated `artifacts/apex-finder/src/components/apex-error-notice.tsx`. The global floating notice now suppresses only the known API connectivity/proxy failures while the current route is `/reactor` or a Reactor subroute. The Reactor's inline API-down state and Retry control remain authoritative. All other errors and all other routes retain the existing global notice behavior.

Exact replacement handler:

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

This is notification presentation only; API requests, retry behavior, error classification, and backend behavior are unchanged.

### Patch 1 — add the board shield mark for the Reactor console

Added `artifacts/apex-finder/src/components/apex-atlas-mark.tsx`. It renders the four-quarter gules/or shield clipped to the board silhouette. `useId()` makes the clipPath identifier unique when the mark is rendered more than once. This component is intentionally scoped to the Reactor console; it does not change shared navigation or other tabs.

Exact new file:

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

No backend or API behavior changed. Visual screenshot verification remains pending.

### Patch 2 — place the shield in the Run console and add the frame state hook

Updated `artifacts/apex-finder/src/pages/reactor.tsx`:
- Imported `ApexAtlasMark`.
- Added the existing API availability state as the console's `is-api-down` modifier. This is presentation-only and uses the already-authoritative `apiAvailable` value.
- Wrapped existing console content in `.atlas-reactor-run-console-inner`.
- Added the shield beside the existing “Run console” heading.
- Preserved every existing metric, status, Retry control, launch/stop control, and topology link.

Exact changed console opening:

```tsx
<aside className={"atlas-reactor-run-console" + (apiAvailable === false ? " is-api-down" : "")} aria-labelledby="atlas-reactor-run-console-title">
  <div className="atlas-reactor-run-console-inner">
  <div className="atlas-reactor-board-heading">
    <div><h2 id="atlas-reactor-run-console-title" className="atlas-reactor-board-title"><ApexAtlasMark /><span>Run console</span></h2><p>Canonical run state</p></div>
```

Exact changed closing:

```tsx
<a className="atlas-reactor-topology-link" href="/reactor/topology">Open full Reactor topology</a>
</div>
</aside>
```

No run data or backend behavior was introduced. Screenshot verification remains pending.

### Patch 3 — add the patterned console frame and responsive inset

Appended Reactor-scoped rules to `artifacts/apex-finder/src/flat-round.css`:
- The left half uses the board's red/gold checky field; the right half uses the blue wave field.
- The inner white console retains all existing content and controls.
- When the existing API state is unavailable, the frame changes to neutral grey patterns, not fake live/active colors.
- The shield is sized beside the console title; the title is reduced to the board's compact console-heading scale.
- The inner inset tightens on phone widths.

Exact CSS added:

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

No execution-state or evidence-status semantics were added. Screenshot verification remains pending.
