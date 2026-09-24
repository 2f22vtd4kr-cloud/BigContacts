import { FormEvent, ReactNode, useEffect, useState } from "react";
import { readApiJson } from "@/lib/api-json";

interface SessionState {
  loading: boolean;
  authenticated: boolean;
  unavailable: boolean;
}

export function OperatorAuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    loading: true,
    authenticated: false,
    unavailable: false,
  });
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin" });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
      setSession({ loading: false, authenticated: data?.authenticated === true, unavailable: false });
    } catch (err) {
      setSession({ loading: false, authenticated: false, unavailable: true });
      setError(err instanceof Error ? err.message : "Authentication service unavailable");
    }
  };

  useEffect(() => {
    void checkSession();
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
      setPassword("");
      setSession({ loading: false, authenticated: true, unavailable: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (session.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6" role="status">
        <div className="font-mono text-xs uppercase tracking-[.18em] text-stone-500">Checking operator session…</div>
      </div>
    );
  }

  if (session.authenticated) return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <form onSubmit={login} className="w-full max-w-sm rounded-2xl border border-stone-800 bg-stone-950/80 p-6 shadow-xl">
        <div className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[.22em] text-stone-500">Apex Atlas</p>
          <h1 className="mt-2 text-xl font-semibold text-stone-100">Operator sign-in</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-400">
            The desk uses the server-side operator session. No API token is exposed to the browser.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300" role="alert">
            {error}
          </div>
        )}

        <label className="block text-xs font-mono uppercase tracking-[.14em] text-stone-500" htmlFor="operator-password">
          Operator password
        </label>
        <input
          id="operator-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 outline-none focus:border-lime-500"
          disabled={submitting || session.unavailable}
        />

        <button
          type="submit"
          disabled={submitting || session.unavailable || password.length === 0}
          className="mt-4 min-h-11 w-full rounded-lg bg-lime-500 px-4 font-mono text-xs font-bold uppercase tracking-[.14em] text-stone-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
