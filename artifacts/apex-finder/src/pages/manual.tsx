import { useState } from "react";
import { cn, AccessScoreBadge, ScoreBadge } from "@/lib/utils";
import { Link } from "wouter";
import {
  BookOpen,
  Shield,
  Activity,
  ChevronDown,
  ChevronUp,
  Flame,
  Crosshair,
  Mail,
  Phone,
  Globe,
  Cpu,
  Database,
  AlertTriangle,
} from "lucide-react";

function CompletenessDemo() {
  const rows = [
    {
      name: "Griffin Tool — Malcolm Cowan",
      level: "FULL",
      color: "#10B981",
      detail: "Personal role email for owner/principal (Griffin-class)",
    },
    {
      name: "Advance Turning — Macchia family",
      level: "PARTIAL",
      color: "#F59E0B",
      detail: "Owners identified + succession path; only org inbox public",
    },
    {
      name: "Thin directory listing",
      level: "INCOMPLETE",
      color: "#64748B",
      detail: "No attributable owner/principal with a contact path",
    },
  ];
  return (
    <div className="space-y-2 my-4">
      {rows.map((r) => (
        <div key={r.level} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0"
            style={{ color: r.color, background: r.color + "22" }}
          >
            {r.level}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{r.name}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{r.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Callout({ children, title, tone = "primary" }: { children: React.ReactNode; title?: string; tone?: "primary" | "warn" }) {
  const border = tone === "warn" ? "border-amber-500" : "border-primary";
  const bg = tone === "warn" ? "bg-amber-500/5" : "bg-primary/5";
  const titleColor = tone === "warn" ? "text-amber-400" : "text-primary";
  return (
    <div className={cn("border-l-2 p-4 rounded-r-lg my-6", border, bg)}>
      {title && <div className={cn("font-mono text-xs font-bold mb-1 uppercase tracking-wider", titleColor)}>{title}</div>}
      <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
    </div>
  );
}

const SECTIONS = [
  {
    id: "overview",
    title: "1. What Apex Atlas is",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Apex Atlas is a <strong className="text-foreground">bureau-first OSINT desk</strong> for private mid-market operators and HNWIs.
          The product goal is not a CRM vanity list — it is to recover <strong className="text-foreground">reachable attributable people-contacts</strong>
          (owners, officers, founders, key managers) plus ownership/succession evidence so you can reach people who control capital.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Dual discovery front doors:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4 pl-2">
          <li><strong className="text-foreground">Company-first</strong> — mid-market public surface + full team directories (preferred lane for v1).</li>
          <li><strong className="text-foreground">Wallet-first</strong> — public wallet → attribute holder (fail-closed) → same contact maximizer.</li>
        </ul>
        <Callout title="Non-negotiable rules">
          Never invent contacts. Never mark org inboxes (info@, sales@, …) as Personal. Trash-phone gate stays on.
          Every claimed fact needs sourceUrls. Grok / Gemini Agent is the floor — Apex must retain at least as much non-trash surface.
        </Callout>
      </>
    ),
  },
  {
    id: "completeness",
    title: "2. Contact completeness (FULL / PARTIAL / INCOMPLETE)",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Every person or company card is scored for investor-outreach usefulness:
        </p>
        <CompletenessDemo />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">FULL</strong> = personal/role email (or direct cell) for an owner/principal — Griffin-class.
          <strong className="text-foreground"> PARTIAL</strong> = owner identified + HNWI path + only org surface.
          <strong className="text-foreground"> INCOMPLETE</strong> = no attributable owner path yet. Cards never promote info@/sales@ to Personal.
        </p>
      </>
    ),
  },
  {
    id: "scores",
    title: "3. Signal vs Access scores",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Wealth footprint and contactability are separate:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4 pl-2">
          <li><strong className="text-foreground">Signal Score</strong> — strength of registry / asset evidence (net-worth footprint).</li>
          <li><strong className="text-foreground">Access Score</strong> — how realistically the person can be reached from public contact evidence.</li>
        </ul>
        <div className="flex gap-2 my-4">
          <AccessScoreBadge score={0.87} />
          <ScoreBadge score={0.95} />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          High Signal does not imply personal access. Treat Access as evidence-backed assessment, not a communication recommendation.
        </p>
      </>
    ),
  },
  {
    id: "reactor",
    title: "4. Intelligence Reactor (live under-the-hood)",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The <Link href="/reactor" className="text-primary underline">Intelligence Reactor</Link> is the live operations board.
          While a run is active it shows:
        </p>
        <ul className="space-y-3 text-sm text-muted-foreground mb-4">
          <li className="flex gap-2"><Cpu className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span><strong className="text-foreground">Phase / stage / active lane</strong> — which rod is working the current target.</span></li>
          <li className="flex gap-2"><Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /><span><strong className="text-foreground">BROWSER</strong> tags — Scrapfly / ZenRows / page visits as they fire.</span></li>
          <li className="flex gap-2"><Activity className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span><strong className="text-foreground">PROMPT</strong> blocks — the exact Boss / investigator prompt in use.</span></li>
          <li className="flex gap-2"><Shield className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" /><span><strong className="text-foreground">FOOTPRINT</strong> — Sherlock / Maigret / Holehe username and email checks.</span></li>
          <li className="flex gap-2"><Database className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /><span><strong className="text-foreground">DOMAIN</strong> — RDAP-first + WhoisJSON domain surface hop (registration longevity as ownership-stability signal).</span></li>
        </ul>
        <Callout title="Live Action Log">
          Expand any event row to see target, input summary, full prompt text, tool IDs, sources/contacts/evidence counts, and result summary.
          Desktop and mobile share the same event stream (mobile uses a stacked flow layout).
        </Callout>
      </>
    ),
  },
  {
    id: "cards",
    title: "5. Company & HNWI cards",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Entity ledger and profile cards surface:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4 pl-2">
          <li>Contact outcome badges: verified direct · direct candidate · org · social · evidence</li>
          <li>Completeness (FULL / PARTIAL / INCOMPLETE) for outreach decisioning</li>
          <li>Personal vs organization scope — org inboxes stay purple “org”, never Personal</li>
          <li>Ownership / succession language when recovered from public pages</li>
          <li>Source registries and evidence links (fail-closed: no source → not shown as fact)</li>
        </ul>
        <Callout title="Org vs Personal" tone="warn">
          info@, sales@, contact@, office@ and similar prefixes are forced to organization scope.
          Only role-aligned named mailboxes (e.g. malcolm@, alan@, joe.cherluck@) can be Personal.
        </Callout>
      </>
    ),
  },
  {
    id: "keys",
    title: "6. Keys & providers (session / Replit secrets)",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Keys live in Replit Secrets / environment only — never commit them. The header key-health chip reflects pool status.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground mb-4">
          <div className="border border-border rounded p-2">SERP / search — SerpAPI, Serper, Tavily, Exa</div>
          <div className="border border-border rounded p-2">Browser — Scrapfly, ZenRows</div>
          <div className="border border-border rounded p-2">LLM — Gemini (Boss), Groq, NVIDIA NIM, Mistral</div>
          <div className="border border-border rounded p-2">Domain — WhoisJSON (RDAP is keyless); Whoxy skip if balance 0</div>
          <div className="border border-border rounded p-2">Registry — Companies House, EDGAR (public)</div>
          <div className="border border-border rounded p-2">Infra — Upstash Redis (session), Hugging Face</div>
        </div>
        <Callout title="Budget discipline">
          SerpAPI free tier (~250/mo) and Scrapfly (~1000/mo) are tight. Prefer RDAP before WhoisJSON.
          Watch Remaining-Requests on WhoisJSON. Do not burn keys on noise queries.
        </Callout>
      </>
    ),
  },
  {
    id: "workflow",
    title: "7. Recommended operator workflow",
    content: (
      <>
        <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground mb-4 pl-1">
          <li><strong className="text-foreground">Company-first discovery</strong> — seed mid-market private operators (family/owner manufacturers preferred).</li>
          <li><strong className="text-foreground">Watch the Reactor</strong> — confirm browser hops, prompts, and domain surface fire; refuse-done until related persons attach when org surface exists.</li>
          <li><strong className="text-foreground">Open the card</strong> — check FULL/PARTIAL, personal emails, ownership narrative, sourceUrls.</li>
          <li><strong className="text-foreground">Act only on FULL or intentional PARTIAL</strong> — never invent a channel; optional registry hop / enrichment only after identity lock.</li>
        </ol>
        <div className="bg-muted/30 border border-border p-4 rounded-lg my-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">Pipeline:</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Company lock</span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">Org surface</span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-1 rounded">Related people</span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
            <Mail className="h-3 w-3" /> Personal channel
          </span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
            <Flame className="h-3 w-3" /> FULL
          </span>
        </div>
      </>
    ),
  },
  {
    id: "floors",
    title: "8. Safety floors & honesty",
    content: (
      <>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-foreground block mb-1">Trash-phone gate</strong>
              US 555-exchange, all-same-digit, and trivial sequences are rejected. Floor script must PASS before material releases.
            </div>
          </li>
          <li className="flex gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <div>
              <strong className="text-foreground block mb-1">Zero synthetic data</strong>
              Missing data is blank or explicitly incomplete — never fabricated emails, phones, or roles.
            </div>
          </li>
          <li className="flex gap-3">
            <Crosshair className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-foreground block mb-1">Grok is the floor</strong>
              Holdouts (Griffin, Advance Turning, KB Tool, BTE, Northwest) document Apex recovering more reachable personal channels while staying fail-closed.
            </div>
          </li>
        </ul>
      </>
    ),
  },
];

export default function ManualPage() {
  const [openId, setOpenId] = useState<string | null>("overview");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Field manual</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        Operator guide for Apex Atlas on Replit — company-first contact maximizer, Intelligence Reactor, completeness scoring, and fail-closed rules.
        Desktop and mobile share the same content; navigation collapses on small screens.
      </p>

      <div className="space-y-2">
        {SECTIONS.map((section) => {
          const open = openId === section.id;
          return (
            <div key={section.id} className="border border-border rounded-lg bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : section.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                data-testid={`manual-section-${section.id}`}
              >
                <span className="text-sm font-semibold text-foreground">{section.title}</span>
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              {open && <div className="px-4 pb-5 border-t border-border pt-4">{section.content}</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-[11px] font-mono text-muted-foreground/70 leading-relaxed">
        Apex Atlas · fail-closed · Grok is the floor · session keys only · tip includes domain-surface + completeness score + wave-3 holdouts
      </div>
    </div>
  );
}
