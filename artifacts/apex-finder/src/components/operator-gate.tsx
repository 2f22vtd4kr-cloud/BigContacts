import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\\/$/, "");
type GateStatus = "checking" | "authenticated" | "signed-out" | "unconfigured" | "unreachable";
type SessionResponse = { configured?: boolean; authenticated?: boolean; code?: string; error?: string };

export function OperatorGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus>("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const checkSession = useCallback(async () => {
    setStatus("checking"); setMessage("");
    try {
      const response = await fetch(BASE + "/api/auth/session", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({} as SessionResponse)) as SessionResponse;
      if (response.status === 503 || data.code === "OPERATOR_AUTH_NOT_CONFIGURED") {
        setStatus("unconfigured"); setMessage(data.error ?? "Operator sign-in is not configured for this API instance.");
      } else if (response.ok && data.authenticated === true) {
        setStatus("authenticated");
      } else if (response.status === 401 || (response.ok && data.authenticated === false)) {
        setStatus("signed-out");
      } else {
        setStatus("unreachable"); setMessage(data.error ?? ("The sign-in check returned HTTP " + response.status + "."));
      }
    } catch {
      setStatus("unreachable"); setMessage("Apex could not reach the API sign-in endpoint. Check that the API is running and /api is proxied.");
    }
  }, []);

  useEffect(() => {
    void checkSession();
    const onAuthError = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (code === "OPERATOR_AUTH_REQUIRED") { setStatus("signed-out"); setMessage("Your operator session has expired. Sign in again to continue."); }
      else if (code === "OPERATOR_AUTH_NOT_CONFIGURED") { setStatus("unconfigured"); setMessage("Operator authentication is not configured for this API instance."); }
    };
    window.addEventListener("apex:error", onAuthError);
    return () => window.removeEventListener("apex:error", onAuthError);
  }, [checkSession]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(BASE + "/api/auth/login", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({} as SessionResponse)) as SessionResponse;
      setPassword("");
      if (response.ok && data.authenticated === true) { setStatus("authenticated"); setMessage(""); }
      else if (response.status === 503 || data.code === "OPERATOR_AUTH_NOT_CONFIGURED") {
        setStatus("unconfigured"); setMessage("Operator sign-in is not configured. The API administrator must configure the required authentication secrets.");
      } else if (response.status === 429) {
        setStatus("signed-out"); setMessage("Too many unsuccessful sign-in attempts. Wait one minute, then try again.");
      } else {
        setStatus("signed-out"); setMessage("The password was not accepted. Check it and try again.");
      }
    } catch {
      setPassword(""); setStatus("unreachable");
      setMessage("Apex could not reach the sign-in endpoint. Check that the API is running and /api is proxied.");
    } finally { setBusy(false); }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await fetch(BASE + "/api/auth/logout", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
    } finally { setBusy(false); setStatus("signed-out"); setMessage("You have signed out."); }
  };

  if (status === "authenticated") return (
    <div className="relative">
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-[80] sm:bottom-5 sm:right-5">
        <button type="button" onClick={() => void logout()} disabled={busy}
          className="rounded-full border border-stone-700/80 bg-[#101722]/95 px-3 py-2 text-[10px] font-semibold tracking-wide text-stone-300 shadow-lg backdrop-blur transition hover:border-lime-300/50 hover:text-lime-200 disabled:opacity-60">
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {children}
    </div>
  );

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0b1018] px-4 py-10 text-stone-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(156,255,26,0.08),transparent_55%)]" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-stone-800 bg-[#111923]/95 p-6 shadow-2xl sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/[0.07] text-lg font-black text-lime-300">A</div>
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-lime-300/80">Apex Atlas</p><h1 className="mt-1 text-xl font-bold tracking-tight text-stone-100">Operator sign-in</h1></div>
        </div>
        {status === "checking" ? <p className="text-sm text-stone-400" role="status">Checking the operator session…</p>
        : status === "unconfigured" ? <div role="alert" className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
            <p className="text-sm font-semibold text-amber-200">Sign-in is not configured</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">{message || "The API administrator must configure operator authentication before the desk can be used."}</p>
            <p className="mt-3 text-xs leading-5 text-stone-400">Required controls: APEX_OPERATOR_PASSWORD (16+ characters), APEX_API_AUTH_TOKEN (32+), and APEX_SESSION_SECRET (32+). Configure values in the deployment secret manager—not in chat—then restart the API.</p>
            <button type="button" onClick={() => void checkSession()} className="mt-4 min-h-11 rounded-xl border border-stone-700 px-4 text-xs font-semibold text-stone-200 hover:border-lime-300/50">Check again</button>
          </div>
        : status === "unreachable" ? <div role="alert" className="rounded-xl border border-orange-400/25 bg-orange-400/[0.06] p-4">
            <p className="text-sm font-semibold text-orange-200">The sign-in service could not be reached</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">{message || "Check the API process and its /api proxy."}</p>
            <button type="button" onClick={() => void checkSession()} className="mt-4 min-h-11 rounded-xl border border-stone-700 px-4 text-xs font-semibold text-stone-200 hover:border-lime-300/50">Try again</button>
          </div>
        : <form onSubmit={submit} className="space-y-4">
            <p className="text-sm leading-6 text-stone-400">Sign in to access research runs, evidence, contacts, and system controls.</p>
            <div><label htmlFor="apex-operator-password" className="mb-2 block text-xs font-semibold text-stone-300">Operator password</label>
              <input id="apex-operator-password" name="password" type="password" autoComplete="current-password" required maxLength={256}
                value={password} onChange={(event) => setPassword(event.currentTarget.value)} disabled={busy}
                className="min-h-12 w-full rounded-xl border border-stone-700 bg-[#0b1119] px-4 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-lime-300/70 focus:ring-2 focus:ring-lime-300/10 disabled:opacity-60"
                placeholder="Enter operator password" />
            </div>
            {message && <p role="alert" className="text-sm leading-5 text-orange-200">{message}</p>}
            <button type="submit" disabled={busy || password.length === 0} className="min-h-12 w-full rounded-xl bg-lime-300 px-5 text-sm font-bold text-[#10150b] transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
          </form>}
        <p className="mt-7 border-t border-stone-800 pt-4 text-[10px] leading-5 text-stone-500">Sessions are signed by the API, stored in an HttpOnly cookie, and expire after 12 hours. Provider credentials and passwords are never displayed here.</p>
      </section>
    </main>
  );
}
