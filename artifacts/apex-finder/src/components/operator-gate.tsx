import { FormEvent, useEffect, useState } from "react";
import { Crosshair, LogIn, RefreshCw } from "lucide-react";
import { readApiJson } from "@/lib/api-json";

type SessionState = {
  authenticated: boolean;
  configured: boolean;
};

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

async function getSession(): Promise<SessionState> {
  const response = await fetch(`${API_BASE}/auth/session`, { credentials: "same-origin" });
  const data = await readApiJson(response);
  if (!response.ok) throw new Error(data?.error ?? `API ${response.status}`);
  return {
    authenticated: data?.authenticated === true,
    configured: data?.configured === true,
  };
}

export function OperatorGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    setError("");
    void getSession()
      .then(setSession)
      .catch((cause: unknown) => {
        setSession(null);
        setError(cause instanceof Error ? cause.message : "Authentication service unavailable");
      });
  };

  useEffect(() => {
    refresh();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data?.error ?? `API ${response.status}`);
      setPassword("");
      setSession(await getSession());
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  };

  if (session === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0f16] px-6 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#111827] p-7 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#9CFF1A] text-black">
              <Crosshair className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-[0.16em]">APEX ATLAS</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Authentication service</div>
            </div>
          </div>
          <p className="font-mono text-xs leading-6 text-muted-foreground">
            Checking the operator session…
          </p>
          {error && <p className="mt-3 text-xs font-mono text-rose-400">{error}</p>}
          <button onClick={refresh} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session.configured || session.authenticated) return <>{children}</>;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0f16] px-6 text-foreground">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#111827] p-7 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#9CFF1A] text-black">
            <Crosshair className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold tracking-[0.16em]">APEX ATLAS</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Private workspace</div>
          </div>
        </div>
        <label className="block text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground" htmlFor="operator-password">
          Operator password
        </label>
        <input
          id="operator-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-[#9CFF1A]/50"
        />
        {error && <p className="mt-3 text-xs font-mono text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#9CFF1A] px-4 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LogIn className="h-4 w-4" />
          {busy ? "Signing in…" : "Enter workspace"}
        </button>
      </form>
    </div>
  );
}
