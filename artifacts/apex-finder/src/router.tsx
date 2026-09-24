import { Layout } from "@/components/layout";
import { Route, Switch, Redirect, useParams, useSearch } from "wouter";
import { lazy, Suspense } from "react";
import Dashboard from "@/pages/dashboard";
const GraphViewer = lazy(() => import("@/pages/graph"));
const EntityLedger = lazy(() => import("@/pages/entities"));
const ApexProfile = lazy(() => import("@/pages/profile"));
const FieldManual = lazy(() => import("@/pages/manual"));
const DeepSearch = lazy(() => import("@/pages/deep-search"));
const Improvements = lazy(() => import("@/pages/improvements"));
const DataSources = lazy(() => import("@/pages/data-sources"));
const Duplicates = lazy(() => import("@/pages/duplicates"));
const OsintToolsDirectory = lazy(() => import("@/pages/osint-tools"));
const BackgroundJobs = lazy(() => import("@/pages/jobs"));
const IntelligenceReactorPage = lazy(() => import("@/pages/reactor"));
const IntelTerminal = lazy(() => import("@/pages/research"));
import NotFound from "@/pages/not-found";
const SystemStatusPage = lazy(() => import("@/pages/status"));
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

/**
 * The server remains the security boundary. When operator authentication is
 * configured, App.tsx gates this desk behind the canonical password/session
 * flow. When it is deliberately not configured for a local inspection run,
 * the desk can still render, while protected API routes remain fail-closed.
 */
export default function AppRouter() {
  return (
    <Layout>
      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-xs font-mono uppercase tracking-[.18em] text-stone-600" role="status">Loading workspace…</div>}>
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
      </Suspense>
    </Layout>
  );
}
