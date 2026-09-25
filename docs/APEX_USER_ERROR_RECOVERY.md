# Apex User-Facing Error Recovery Plan

## Goal
Every expected runtime failure must become a truthful, understandable operator message without changing Bureau research strategy or fabricating a successful result. Backend responses expose a stable user-facing error contract; the Apex desk renders it consistently on desktop and narrow/mobile web views.

## Severity language
- **Info / blue-cyan:** safe outcome; examples include insufficient evidence and user cancellation.
- **Warning / amber:** recoverable delay or limitation; examples include provider timeout, rate limit, network failure, or active-run conflict.
- **Degraded / lime:** Apex remains structurally healthy but a key external capability is temporarily impaired; example: Gemini Boss HTTP 503/high demand.
- **Error / orange:** the requested operation did not complete and needs attention.
- **Critical / red:** Apex cannot safely continue; examples include authentication, missing required credential, Redis, PostgreSQL/schema, or internal failures.

## Failure families
1. Authentication/session expiry and forbidden operations.
2. Concurrent Atlas launch / distributed lock conflict.
3. Gemini Boss temporary unavailability, 503/high demand, bounded same-role fallback exhaustion.
4. Other provider 429/rate-limit/quota exhaustion.
5. Provider timeouts/deadlines.
6. Network/DNS/connection/fetch failures.
7. Missing provider credentials/secrets.
8. Redis unavailable/fail-closed job-state failures.
9. PostgreSQL/database/schema failures.
10. Insufficient evidence / inability to verify.
11. User cancellation/stop.
12. Internal pipeline/application failures and HTTP 500-class responses.
13. Unknown/non-JSON/static-host/API proxy failures.
14. Generic HTTP 5xx service failures.

## UX contract
Each error contains: stable code, severity, short title, plain-language message, why it happened, up to three next steps, retryability, and optional provider identity.

Critical failures use the existing Apex danger/coral treatment. Degraded provider conditions use the existing lime/teal product language. Warnings use amber; informational safe outcomes use cool blue/teal. The notice is global, safe-area-aware, and responsive: compact bottom notification on narrow screens and a constrained floating panel on desktop.

## Backend
- Central classifier: `artifacts/api-server/src/lib/apex-user-errors.ts`.
- Atlas status includes structured `userError` for failed jobs.
- 409 active-run responses include structured recovery guidance.
- Final Express error middleware provides the same contract for uncaught API failures without exposing raw server details as the only UX.
- Research roles are preserved: Gemini Boss failure never instructs operators to substitute Groq/Mistral into the Boss control-plane role.

## Frontend
- Central classifier/event bridge: `artifacts/apex-finder/src/lib/apex-errors.ts`.
- `readApiJson` emits structured notices for non-2xx and malformed/static-host responses.
- Atlas polling emits a notice once when a real Atlas job reaches a failed terminal state.
- Global `ApexErrorNotice` is mounted alongside the canonical router.
- Critical, degraded, warning, error, and informational states use distinct semantic styling while retaining Apex's dark navy/lime/teal/coral system.
- Touch targets remain at least 40–44px and layouts use responsive width constraints for desktop/mobile web views.

## Integrity constraints
- No fake result, evidence, source, contact, or card is created to make an error disappear.
- No automatic cross-role provider substitution is introduced.
- Error messages never expose API keys, request bodies, authentication secrets, or provider response bodies.
- A failed run remains failed and durable evidence rules remain authoritative.
- User messaging explains the failure without claiming external recovery when it has not occurred.

## Acceptance criteria
1. Gemini Boss 503/high-demand produces a lime degraded notification with explanation and retry guidance.
2. 429 produces an amber recoverable warning.
3. Auth/Redis/DB/internal failures produce red critical guidance.
4. Insufficient evidence/cancellation are informational and do not imply data corruption.
5. 409 active-run conflict is a warning, not a server error.
6. Non-JSON/static proxy failures are surfaced as API connectivity errors.
7. The notice works from dashboard, Reactor, research, profile, and other API-backed routes.
8. Desktop and narrow/mobile layouts remain usable with accessible alert semantics.
9. Focused error-taxonomy tests pass.
10. The full repository sequential audit remains green after the change.