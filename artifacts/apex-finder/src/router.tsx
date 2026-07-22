import { Layout } from "@/components/layout";
import { Route, Switch, Redirect } from "wouter";
import Dashboard from "@/pages/dashboard";
import GraphViewer from "@/pages/graph";
import PipelineCRM from "@/pages/crm";
import IntelTerminal from "@/pages/research";
import EntityLedger from "@/pages/entities";
import ApexProfile from "@/pages/profile";
import FieldManual from "@/pages/manual";
import DeepSearch from "@/pages/deep-search";
import Improvements from "@/pages/improvements";
import DataSources from "@/pages/data-sources";
import Duplicates from "@/pages/duplicates";
import OsintToolsDirectory from "@/pages/osint-tools";
import BackgroundJobs from "@/pages/jobs";
import OutreachAssistant from "@/pages/outreach";
import NotFound from "@/pages/not-found";

export default function AppRouter() {
  return (
    <Layout>
      <Switch>
        {/* ── Primary routes (new Atlas navigation) ── */}
        <Route path="/" component={Dashboard} />
        <Route path="/search" component={DeepSearch} />
        <Route path="/profiles" component={EntityLedger} />
        <Route path="/network" component={GraphViewer} />
        <Route path="/research" component={IntelTerminal} />
        <Route path="/outreach" component={OutreachAssistant} />
        <Route path="/pipeline" component={PipelineCRM} />
        <Route path="/jobs" component={BackgroundJobs} />
        <Route path="/manual" component={FieldManual} />
        <Route path="/profile/:id" component={ApexProfile} />

        {/* ── Legacy route aliases (keep old URLs working) ── */}
        <Route path="/entities">{() => <Redirect to="/profiles" />}</Route>
        <Route path="/graph">{() => <Redirect to="/network" />}</Route>
        <Route path="/crm">{() => <Redirect to="/pipeline" />}</Route>
        <Route path="/deep-search">{() => <Redirect to="/search" />}</Route>
        <Route path="/data-sources">{() => <Redirect to="/jobs" />}</Route>
        <Route path="/improvements">{() => <Redirect to="/jobs" />}</Route>
        <Route path="/duplicates">{() => <Redirect to="/jobs" />}</Route>
        <Route path="/osint-tools">{() => <Redirect to="/jobs" />}</Route>

        {/* ── Internal pages (still accessible directly) ── */}
        <Route path="/_improvements" component={Improvements} />
        <Route path="/_data-sources" component={DataSources} />
        <Route path="/_duplicates" component={Duplicates} />
        <Route path="/_osint-tools" component={OsintToolsDirectory} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}
