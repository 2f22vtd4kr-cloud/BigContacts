import { Layout } from "@/components/layout";
import { Route, Switch, Redirect, useParams, useSearch } from "wouter";
import { lazy, Suspense } from "react";
import Dashboard from "@/pages/dashboard";
import DashboardLegacy from "@/pages/dashboard-legacy";
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
const BoardLedger = lazy(() => import("@/pages/board-ledger"));
const BoardDiscover = lazy(() => import("@/pages/board-discover"));
const BoardConnections = lazy(() => import("@/pages/board-connections"));
const BoardReactor = lazy(() => import("@/pages/board-reactor"));
const BoardProfile = lazy(() => import("@/pages/board-profile"));
import NotFound from "@/pages/not-found";
const SystemStatusPage = lazy(() => import("@/pages/status"));
import { ProfileErrorBoundary } from "@/components/profile-error-boundary";

function ProfileRoute() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  return (
    <ProfileErrorBoundary key={id}>
      <ApexProfile />
    </ProfileErrorBoundary>
  );
}

function RouteLoading() {
  return <div className="flex min-h-[40vh] items-center justify-center text-xs font-mono text-muted-foreground" role="status">Loading workspace…</div>;
}

function LegacyRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={DashboardLegacy} />
        <Route path="/search" component={DeepSearch} />
        <Route path="/profiles" component={EntityLedger} />
        <Route path="/network/graph" component={GraphViewer} />
        <Route path="/network" component={BoardConnections} />
        <Route path="/jobs" component={BackgroundJobs} />
        <Route path="/reactor" component={IntelligenceReactorPage} />
        <Route path="/research" component={IntelTerminal} />
        <Route path="/manual" component={FieldManual} />
        <Route path="/profile/:id" component={ProfileRoute} />
        <Route path="/improvements" component={Improvements} />
        <Route path="/data-sources" component={DataSources} />
        <Route path="/duplicates" component={Duplicates} />
        <Route path="/osint-tools" component={OsintToolsDirectory} />
        <Route path="/status" component={SystemStatusPage} />
        <Route path="/entities">{() => { const s = useSearch(); return <Redirect to={`/profiles${s ? `?${s}` : ""}`} />; }}</Route>
        <Route path="/graph">{() => { const s = useSearch(); return <Redirect to={`/network${s ? `?${s}` : ""}`} />; }}</Route>
        <Route path="/deep-search">{() => <Redirect to="/search" />}</Route>
        <Route path="/discover">{() => <Redirect to="/search" />}</Route>
        <Route path="/ledger">{() => <Redirect to="/profiles" />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function BoardRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/search" component={BoardDiscover} />
        <Route path="/profiles" component={BoardLedger} />
        <Route path="/network" component={BoardConnections} />
        <Route path="/jobs" component={BackgroundJobs} />
        <Route path="/reactor" component={BoardReactor} />
        <Route path="/research" component={IntelTerminal} />
        <Route path="/manual" component={FieldManual} />
        <Route path="/profile/:id" component={BoardProfile} />
        <Route path="/improvements" component={Improvements} />
        <Route path="/data-sources" component={DataSources} />
        <Route path="/duplicates" component={Duplicates} />
        <Route path="/osint-tools" component={OsintToolsDirectory} />
        <Route path="/status" component={SystemStatusPage} />
        <Route path="/entities">{() => { const s = useSearch(); return <Redirect to={`/profiles${s ? `?${s}` : ""}`} />; }}</Route>
        <Route path="/graph">{() => { const s = useSearch(); return <Redirect to={`/network${s ? `?${s}` : ""}`} />; }}</Route>
        <Route path="/deep-search">{() => <Redirect to="/search" />}</Route>
        <Route path="/discover">{() => <Redirect to="/search" />}</Route>
        <Route path="/ledger">{() => <Redirect to="/profiles" />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function AppRouter() {
  return <Layout roundChildren={<BoardRoutes />} legacyChildren={<LegacyRoutes />} />;
}
