import { Activity, ArrowRight, Brain, Database, GitCompare, Search, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const desks = [
  {
    title: "Research Reactor",
    description: "Launch and observe the canonical Gemini Boss → DeepSeek Right Hand → Groq/Mistral Investigator control plane.",
    href: "/reactor",
    icon: Brain,
  },
  {
    title: "Research cases",
    description: "Review durable cases, Investigator trajectories, decisions, evidence, and oversight state.",
    href: "/research",
    icon: Search,
  },
  {
    title: "Entity ledger",
    description: "Inspect admitted entities and contact evidence without triggering an independent research workflow.",
    href: "/profiles",
    icon: Database,
  },
  {
    title: "Duplicate review",
    description: "Resolve identity collisions and evidence conflicts as an explicit operator review task.",
    href: "/duplicates",
    icon: GitCompare,
  },
  {
    title: "System status",
    description: "Inspect provider health, infrastructure state, and deployment readiness.",
    href: "/status",
    icon: ShieldCheck,
  },
];

export default function BackgroundJobs() {
  return (
    <div className="min-h-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Workspace activity</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Research control center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Deterministic bulk-research launchers have been retired. Research begins only through the canonical model-owned control plane; this desk provides navigation and review surfaces rather than choosing research steps for the Investigator.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {desks.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-white/[0.06] bg-card/30 p-5 transition-colors hover:border-primary/25 hover:bg-card/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted/40 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <h2 className="mt-5 text-sm font-semibold">{title}</h2>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-primary/10 bg-primary/[0.035] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Architecture invariant</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            The UI never selects a search provider, query sequence, hop count, discovery category, or promotion outcome. Those decisions belong to the Investigator and its oversight chain; the application supplies safety, persistence, provenance, and review boundaries.
          </p>
        </div>
      </div>
    </div>
  );
}
