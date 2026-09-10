# Audit — API authorization / frontend contract

The API now requires `Authorization: Bearer <APEX_API_AUTH_TOKEN>` for non-health API requests. The shared React API client exposes `setAuthTokenGetter()`, but repository-wide search found no application registration of that getter.

The frontend must not embed the server bearer secret in a Vite/browser bundle. Before runtime verification, trace the actual application authentication/session mechanism and either:

1. use a browser-safe session mechanism that the server can validate, or
2. provide an explicit operator-auth flow that does not ship the server secret to clients.

Do not weaken the API boundary merely to make the current UI work.
