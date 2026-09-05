# Volume 67 — Code Touch Map (Where to Implement)

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Root research logic:** `artifacts/api-server/src/src/`

| Concern | Primary locations (names may drift; search symbols) |
|---------|-----------------------------------------------------|
| Free dig loop | `lib/agentic-web-research.ts` |
| Bureau pass / jobId / live | `lib/bureau-agentic-pass.ts`, orchestrator routes |
| Promote / evidence | `lib/bureau-contact-persist.ts`, contact validation |
| Identity | `lib/identity-collision.ts` |
| Outcomes | `computeContactOutcome` / contact-validation |
| Orientation | `lib/apex-bureau-orientation.ts` |
| DigSpan | `lib/dig-span.ts` |
| Status / health | ingest routes `atlas-status`, `healthz` |
| Launch body | `lib/atlas-launch-defaults.ts` |
| EDGAR | edgar query / notice parsing modules |
| Reactor UI | `artifacts/apex-finder/src/pages/reactor.tsx`, Live Desk components |
| Scheme | reactor scheme nodes/spans mapping |

### Dual stack warning

`artifacts/apex-runtime/` must not silently diverge into force-hops or dead models. Quarantine or parity.

### Build

- API: package build for api-server  
- Desk: `pnpm --dir artifacts/apex-finder run build`
