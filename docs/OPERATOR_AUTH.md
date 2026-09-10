# Apex Atlas operator authentication

The browser desk does **not** receive `APEX_API_AUTH_TOKEN`. That bearer secret remains server-side for automation and external operator tooling.

For the browser desk, configure two Replit Secrets:

- `APEX_OPERATOR_PASSWORD` — operator password, at least 16 characters.
- `APEX_SESSION_SECRET` — random signing secret, at least 32 characters.

The API exposes `/api/auth/login`, `/api/auth/session`, and `/api/auth/logout`. A successful login creates an 8-hour `HttpOnly`, `SameSite=Strict` session cookie scoped to `/api`.

State-changing requests authenticated by the browser session must carry a same-origin `Origin` header. Bearer-token clients remain supported and are not required to send browser CSRF headers.

Do not create `VITE_APEX_API_AUTH_TOKEN` or otherwise inject `APEX_API_AUTH_TOKEN` into the frontend build.

This is intentionally a single-operator session boundary, not a multi-user identity system. If Apex later becomes multi-operator, replace the static password with an external identity provider or a proper account/session store rather than expanding this shared-secret mechanism.
