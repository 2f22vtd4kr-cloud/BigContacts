# Reactor frontend audit — design-board completion handoff

## Scope and safety

- Repository: `2f22vtd4kr-cloud/BigContacts`
- Base: PR #943 branch `ui/design-board-faithful-2026-11-23`, head `73b4b9ff0092f90eea70a57ffd58fcd163c0e279`
- Work branch: `agent/reactor-board-finish-2026-11-24`
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

### Baseline review — no source changes yet

- Confirmed latest PR #943 head and created a separate work branch from that exact commit.
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
