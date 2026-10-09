import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

type OperatorSession = {
  authenticated?: boolean;
  required?: boolean;
  configured?: boolean;
};

type Props = { children: ReactNode };
type GateState = "checking" | "authenticated" | "login" | "unconfigured" | "offline";

async function readSession(): Promise<OperatorSession> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const body = await response.json().catch(() => ({})) as OperatorSession;
  if (!response.ok) throw new Error("Could not establish the API authentication state.");
  return body;
}

/**
 * Browser-safe operator authentication. The API secret is entered by the
 * operator and never persisted to storage or bundled into the web client.
 * Successful login leaves only a short-lived HttpOnly session cookie.
 */
export function OperatorAuthGate({ children }: Props) {
  const [state, setState] = useState<GateState>("checking");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const checkSession = useCallback(async () => {
    setState("checking");
    setError("");
    try {
      const session = await readSession();
      if (session.authenticated || !session.required) {
        setState("authenticated");
      } else if (!session.configured) {
        setState("unconfigured");
      } else {
        setState("login");
      }
    } catch {
      setState("offline");
      setError("The API authentication service could not be reached. Your session has not been assumed valid.");
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setError(body.error || (response.status === 401 ? "The operator credential was not accepted." : "Operator sign-in failed."));
        return;
      }
      setToken("");
      setState("authenticated");
    } catch {
      setError("The API could not complete operator sign-in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", cache: "no-store" });
    } finally {
      setToken("");
      setState("login");
    }
  }

  if (state === "authenticated") {
    return (
      <>
        <button
          type="button"
          onClick={() => void signOut()}
          className="fixed right-3 top-3 z-[9999] rounded border border-stone-700 bg-slate-950/90 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-stone-300 shadow hover:border-lime-400/60 hover:text-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
          aria-label="Sign out of Apex Atlas"
        >
          Sign out
        </button>
        {children}
      </>
    );
  }

  const isUnavailable = state === "unconfigured" || state === "offline";
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c1220] px-5 py-10 text-stone-100">
      <section className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950/80 p-6 shadow-2xl sm:p-8" aria-labelledby="operator-auth-title">
        <div className="mb-6 border-b border-slate-800 pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-lime-300">Apex Atlas · Private Bureau</p>
          <h1 id="operator-auth-title" className="mt-3 text-2xl font-semibold tracking-tight text-stone-100">
            {state === "checking" ? "Verifying session" : isUnavailable ? "Operator access unavailable" : "Operator sign-in"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-400">
            {state === "checking"
              ? "Checking server-verified access. Protected research data will not be loaded until this check succeeds."
              : state === "unconfigured"
                ? "Production is fail-closed because APEX_API_AUTH_TOKEN is not configured on the server. Configure the secret and restart the API."
                : state === "offline"
                  ? "The server could not confirm an active session. Retry the check; access will not be granted on a network error."
                  : "Enter the operator credential configured on the API server. It is used only for sign-in and is not stored in browser storage."}
          </p>
        </div>

        {state === "login" ? (
          <form onSubmit={signIn} className="space-y-4">
            <label htmlFor="apex-operator-token" className="block text-xs font-mono uppercase tracking-[0.13em] text-stone-300">
              Operator credential
            </label>
            <input
              id="apex-operator-token"
              type="password"
              name="token"
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-3 font-mono text-sm text-stone-100 outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
              placeholder="Server-configured credential"
            />
            {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting || !token.trim()}
              className="w-full rounded bg-lime-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Verifying…" : "Enter bureau"}
            </button>
          </form>
        ) : null}

        {isUnavailable ? (
          <div>
            {error ? <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p> : null}
            <button type="button" onClick={() => void checkSession()} className="w-full rounded border border-slate-700 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-200 hover:border-lime-400/60 hover:text-lime-200">
              Retry authentication check
            </button>
          </div>
        ) : null}

        {state === "checking" ? (
          <p role="status" className="font-mono text-xs uppercase tracking-widest text-lime-300">Checking access…</p>
        ) : null}
      </section>
    </main>
  );
}

export default OperatorAuthGate;
