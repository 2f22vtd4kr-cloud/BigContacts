import { Layout } from "@/components/layout";
import { Route, Switch } from "wouter";
import Dashboard from "@/pages/dashboard";
import GraphViewer from "@/pages/graph";
import PipelineCRM from "@/pages/crm";
import MCTSTerminal from "@/pages/research";
import EntityLedger from "@/pages/entities";
import NotFound from "@/pages/not-found";

export default function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/graph" component={GraphViewer} />
        <Route path="/crm" component={PipelineCRM} />
        <Route path="/research" component={MCTSTerminal} />
        <Route path="/entities" component={EntityLedger} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}
