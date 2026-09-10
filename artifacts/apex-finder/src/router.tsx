import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Layout } from "@/components/layout";
import { Route, Switch, Redirect, useParams, useSearch } from "wouter";
import Dashboard from "@/pages/dashboard";
import GraphViewer from "@/pages/graph";
import EntityLedger from "@/pages/entities";
import ApexProfile from "@/pages/profile";
import FieldManual from "@/pages/manual";
import DeepSearch from "@/pages/deep-search";
import Improvements from "@/pages/improvements";
import DataSources from "@/pages/data-sources";
import Duplicates from "@/pages/duplicates";
import OsintToolsDirectory from "@/pages/osint-tools";
import BackgroundJobs from "@/pages/jobs";
import IntelligenceReactorPage from "@/pages/reactor";
import IntelTerminal from "@/pages/research";
import NotFound from "@/pages/not-found";
import SystemStatusPage from "@/pages/status";
import { ProfileErrorBoundary } from "@/components/profile-error-boundary";

/**
 * Keep profile failure state scoped to the concrete entity route. Without the
 * key, a caught render error can leave the boundary latched while navigation
 * moves to another HNWI, which looks like a permanent blank profile desk.
 */
function ProfileRoute() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  return (
    <ProfileErrorBoundary key={id}>
      <ApexProfile />
    </ProfileErrorBoundary>
  );
}

function OperatorLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? `Authentication failed (${response.status})`);
      setPassword("");
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[#9CFF1A]/15 bg-card/40 p-6 shadow-2xl">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#9CFF1A]">Apex Atlas · Operator</div>
        <h1 className="mt-2 text-xl font-semibold">Sign in to the bureau</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">The research desk uses an HttpOnly browser session. The server bearer secret is never placed in the browser bundle.</p>
        <label className="mt-5 block text-[11px] font-mono uppercase tracking-wider text-muted-foreground" htmlFor="operator-password">Operator password</label>
        <input
          id="operator-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          disabled={busy}
        />
        {error && <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-4 w-full rounded-xl border border-lime-400/35 bg-lime-400/10 px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-lime-100 disabled:opacity-50"
        >
          {busy ? "Authenticating…" : "Enter bureau"}
        </button>
      </form>
    </main>
  );
}

function OperatorGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setState(data?.authenticated === true ? "authenticated" : "unauthenticated");
      })
      .catch(() => setState("unauthenticated"));
  }, []);

  if (state === "checking") {
    return <main className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-xs font-mono">AUTHENTICATING OPERATOR…</main>;
  }
  if (state === "unauthenticated") return <OperatorLogin onAuthenticated={() => setState("authenticated")} />;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <OperatorGate>
      <Layout>
        <Switch>
          {/* ── Primary routes ── */}
          <Route path="/" component={Dashboard} />
          <Route path="/search" component={DeepSearch} />
          <Route path="/profiles" component={EntityLedger} />
          <Route path="/network" component={GraphViewer} />
          <Route path="/jobs" component={BackgroundJobs} />
          <Route path="/reactor" component={IntelligenceReactorPage} />
          <Route path="/research" component={IntelTerminal} />
          <Route path="/manual" component={FieldManual} />
          <Route path="/profile/:id" component={ProfileRoute} />

          {/* ── Tools & Admin pages ── */}
          <Route path="/improvements" component={Improvements} />
          <Route path="/data-sources" component={DataSources} />
          <Route path="/duplicates" component={Duplicates} />
          <Route path="/osint-tools" component={OsintToolsDirectory} />
          <Route path="/status" component={SystemStatusPage} />

          {/* ── Legacy route aliases ── */}
          <Route path="/entities">{() => { const s = useSearch(); return <Redirect to={`/profiles${s ? `?${s}` : ""}`} />; }}</Route>
          <Route path="/graph">{() => { const s = useSearch(); return <Redirect to={`/network${s ? `?${s}` : ""}`} />; }}</Route>
          <Route path="/deep-search">{() => <Redirect to="/search" />}</Route>
          <Route path="/discover">{() => <Redirect to="/search" />}</Route>
          <Route path="/ledger">{() => <Redirect to="/profiles" />}</Route>

          <Route component={NotFound} />
        </Switch>
      </Layout>
    </OperatorGate>
  );
}
