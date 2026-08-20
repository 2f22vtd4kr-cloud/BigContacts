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
  Server,
  ListOrdered,
} from "lucide-react";

function CompletenessDemo() {
  const rows = [
    {
      name: "Owner with role email on company site",
      level: "FULL",
      color: "#10B981",
      detail: "Personal or role email for owner/principal, sourced and attributable",
    },
    {
      name: "Officers known · org inbox only",
      level: "PARTIAL",
      color: "#F59E0B",
      detail: "Named principals + succession path; only organization inboxes public",
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
        <div key={r.level} className="bg-card/50 border border-[#e85d1a]/10 rounded-2xl p-3.5 flex items-start gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
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
  const border = tone === "warn" ? "border-[#e85d1a]" : "border-primary";
  const bg = tone === "warn" ? "bg-[#e85d1a]/5" : "bg-primary/5";
  const titleColor = tone === "warn" ? "text-[#e85d1a]" : "text-primary";
  return (
    <div className={cn("border-l-2 p-4 rounded-r-2xl my-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]", border, bg)}>
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
          Every claimed fact needs a public source URL. Prefer direct personal or role emails over generic company inboxes.
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
          <strong className="text-foreground">FULL</strong> = personal/role email (or direct cell) for an owner/principal.
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
    title: "4. Intelligence Reactor (live activity)",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The <Link href="/reactor" className="text-primary underline">Intelligence Reactor</Link> is the live operations board.
          While a run is active it shows:
        </p>
        <ul className="space-y-3 text-sm text-muted-foreground mb-4">
          <li className="flex gap-2"><Cpu className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span><strong className="text-foreground">Phase and active tool</strong> — which step is working the current target.</span></li>
          <li className="flex gap-2"><Globe className="w-4 h-4 text-[#e85d1a] shrink-0 mt-0.5" /><span><strong className="text-foreground">Browser steps</strong> — opening public pages and reading what they say about the target.</span></li>
          <li className="flex gap-2"><Activity className="w-4 h-4 text-[#f97316] shrink-0 mt-0.5" /><span><strong className="text-foreground">Analyst steps</strong> — writing down only contacts that can be proven.</span></li>
          <li className="flex gap-2"><Shield className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" /><span><strong className="text-foreground">Footprint steps</strong> — checking whether the same name shows up on other public sites.</span></li>
          <li className="flex gap-2"><Database className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" /><span><strong className="text-foreground">Domain steps</strong> — checking who registered the website and when.</span></li>
        </ul>
        <Callout title="Live Action Log">
          The <strong className="text-foreground">LIVE DESK</strong> on the Reactor shows simulated tool chrome (Google search bar, browser windows, analyst prompts) driven by real Bureau/Atlas payloads — swipe on mobile, story rail on desktop. Expand any event row for full prompt text, tool IDs, and counts.
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

          On entity cards and profiles, contact chips use a fixed palette so you can scan fast:
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li><span className="text-[#fdba74]">Emerald</span> — personal or role contact (what outreach wants)</li>
            <li><span className="text-orange-300">Violet</span> — organization inbox (kept, never labeled Personal)</li>
            <li><span className="text-stone-300">Sky</span> — social handles</li>
            <li><span className="text-[#fdba74]">Amber</span> — related people from ownership resolution</li>
          </ul>
          All non-trash vectors are shown. Verification ranks; it does not hide.
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
          Keys live in Replit Secrets / environment only — never commit them.
          The header chip counts <strong className="text-foreground">AI pool slots that are live</strong> (Groq, Perplexity, Gemini, Tavily, Exa).
          Other tools are tracked on System status under <strong className="text-foreground">Open research / tools</strong>, not in that five-pool header number.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          On each AI pool card, <strong className="text-foreground">“2/11 live”</strong> means two secrets are active out of eleven possible rotation slots.
          Grey segments are empty slots (no key) — that is normal. It is not “battery remaining.”
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground mb-4">
          <div className="border border-[#e85d1a]/12 rounded p-2">AI pools (header) — Groq, Perplexity, Gemini, Tavily, Exa</div>
          <div className="border border-[#e85d1a]/12 rounded p-2">Open research — Hugging Face, Serper, Mistral, Scrapfly, Zenrows</div>
          <div className="border border-[#e85d1a]/12 rounded p-2">Bureau — Gemini Boss, NVIDIA NIM advisor</div>
          <div className="border border-[#e85d1a]/12 rounded p-2">Domain — WhoisJSON (RDAP is keyless)</div>
          <div className="border border-[#e85d1a]/12 rounded p-2">Registry — Companies House, EDGAR (public)</div>
          <div className="border border-[#e85d1a]/12 rounded p-2">Infra — Redis (Upstash + local), Postgres</div>
        </div>
        <Callout title="Budget discipline">
          Search and browser keys are the expensive ones. Prefer public registry pages and company sites before paid scrapes.
          Stop research jobs when you are done — do not leave Launch running unattended.
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
          <li><strong className="text-foreground">Watch the Reactor</strong> — confirm the run is opening real pages and attaching named people when a company surface exists.</li>
          <li><strong className="text-foreground">Open the card</strong> — check FULL/PARTIAL, personal emails, ownership narrative, sourceUrls.</li>
          <li><strong className="text-foreground">Act only on FULL or intentional PARTIAL</strong> — never invent a channel; optional registry hop / enrichment only after identity lock.</li>
        </ol>
        <div className="bg-muted/30 border border-[#e85d1a]/12 p-4 rounded-lg my-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">Pipeline:</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Company lock</span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">Org surface</span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">Related people</span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="inline-flex items-center gap-1 text-xs font-mono text-[#f97316] bg-[#e85d1a]/10 px-2 py-1 rounded">
            <Mail className="h-3 w-3" /> Personal channel
          </span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="inline-flex items-center gap-1 text-xs font-mono text-[#e85d1a] bg-[#e85d1a]/10 px-2 py-1 rounded">
            <Flame className="h-3 w-3" /> FULL
          </span>
        </div>
      </>
    ),
  },

  {
    id: "job-queue",
    title: "8. Job queue (server-side work)",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Long-running work does <strong className="text-foreground">not</strong> run in the browser.
          The UI only starts jobs and polls status. Processing happens on{" "}
          <span className="font-mono text-foreground">api-server</span> with state stored in Redis
          (Upstash permanent client) so progress survives container restarts.
        </p>

        <Callout title="Request → queue → database">
          <ol className="list-decimal list-inside space-y-2 mt-1">
            <li>Operator clicks an action (Run Loop, Apply safe fixes, ingest, enrichment).</li>
            <li>API returns <span className="font-mono">202</span> with a <span className="font-mono">jobId</span> immediately.</li>
            <li>Server creates Redis hash <span className="font-mono">apex:job:&lt;jobId&gt;</span> and optional active-job lock <span className="font-mono">apex:activejob:&lt;type&gt;</span>.</li>
            <li>Background work updates progress, message, inserted/skipped/errors.</li>
            <li>UI polls <span className="font-mono">GET /api/…/jobs/:jobId</span> until status is done, failed, or cancelled.</li>
            <li>Durable results land in Postgres (entities, improvement_logs, evidence) — not in the browser.</li>
          </ol>
        </Callout>

        <div className="bg-muted/30 border border-[#e85d1a]/12 p-4 rounded-lg my-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">Flow:</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">UI trigger</span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">api-server</span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="inline-flex items-center gap-1 text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
            <Activity className="h-3 w-3" /> Redis job
          </span>
          <span className="text-xs font-mono text-muted-foreground">→</span>
          <span className="inline-flex items-center gap-1 text-xs font-mono text-[#f97316] bg-[#e85d1a]/10 px-2 py-1 rounded">
            <Server className="h-3 w-3" /> Postgres
          </span>
        </div>

        <ul className="space-y-3 text-sm text-muted-foreground mb-4">
          <li className="flex gap-3">
            <ListOrdered className="w-5 h-5 text-primary shrink-0" />
            <div>
              <strong className="text-foreground block mb-1">Job types you will see</strong>
              Persona loop (<span className="font-mono">improve</span>), safe remediation (<span className="font-mono">improve-apply</span>),
              registry ingest, enrichment, and other Workspace Activity tasks. Only one active job per type is allowed when a lock is held (409 if already running).
            </div>
          </li>
          <li className="flex gap-3">
            <Shield className="w-5 h-5 text-[#f97316] shrink-0" />
            <div>
              <strong className="text-foreground block mb-1">What gets auto-written</strong>
              Safe apply only reconciles state already proven on the entity (clear synthetic email/phone, recompute contact confidence, hide placeholders).
              Findings that need new public evidence stay <span className="font-mono">pending</span> until research or an operator decision.
            </div>
          </li>
          <li className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[#e85d1a] shrink-0" />
            <div>
              <strong className="text-foreground block mb-1">Static UI alone is not enough</strong>
              If <span className="font-mono">/api</span> is not proxied to api-server, job buttons return HTML and the desk shows an offline error.
              Deploy frontend + api-server + Postgres + Redis together.
            </div>
          </li>
        </ul>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Job records TTL for about seven days; logs are capped (newest first). Workspace Activity and Persona review are the operator surfaces for watching that queue — they do not execute personas or ingest inside the tab.
        </p>
      </>
    ),
  },
  {
    id: "floors",
    title: "9. Safety floors & honesty",
    content: (
      <>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[#e85d1a] shrink-0" />
            <div>
              <strong className="text-foreground block mb-1">Trash-phone gate</strong>
              US 555-exchange, all-same-digit, and trivial sequences are rejected automatically — they never appear as real phones.
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
            <Crosshair className="w-5 h-5 text-[#f97316] shrink-0" />
            <div>
              <strong className="text-foreground block mb-1">Maximise real reach</strong>
              Prefer named people with attributable emails or phones from public pages. Stay fail-closed: if it is not on the source, it does not go on the card.
            </div>
          </li>
        </ul>
      </>
    ),
  },
];

export default function ManualPage() {
  const [openId, setOpenId] = useState<string | null>("overview");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? SECTIONS.filter((s) => s.title.toLowerCase().includes(q) || s.id.includes(q))
    : SECTIONS;

  return (
    <div className="atlas-page max-w-3xl py-8 sm:py-10">
      <div className="flex items-start gap-3 mb-4">
        <BookOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden />
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          How Apex Atlas works: find reachable people, run live research, read scores, and stay honest about what is proven.
        </p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2" data-testid="manual-quick-links">
        <Link href="/reactor" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-orange-400/25 bg-orange-400/10 px-3 py-1.5 text-[11px] font-semibold text-orange-100 hover:border-yellow-300/40">
          <Cpu className="h-3.5 w-3.5" /> Live reactor
        </Link>
        <Link href="/search" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#e85d1a]/12 bg-card/50 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary/40">
          Discover
        </Link>
        <Link href="/profiles" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#e85d1a]/12 bg-card/50 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary/40">
          Entity ledger
        </Link>
      </div>

      <label className="sr-only" htmlFor="manual-search">Search manual sections</label>
      <input
        id="manual-search"
        data-testid="input-manual-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sections…"
        className="mb-5 w-full rounded-xl border border-[#e85d1a]/10 bg-background/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus-visible:ring-2 focus-visible:ring-orange-400/30 focus-visible:border-orange-400/40"
        autoComplete="off"
      />

      <div className="space-y-2" role="list">
        {visible.length === 0 && (
          <div className="rounded-lg border border-[#e85d1a]/12 bg-card px-4 py-8 text-center text-sm text-muted-foreground" data-testid="manual-search-empty">
            No sections match “{query.trim()}”.
          </div>
        )}
        {visible.map((section) => {
          const open = openId === section.id;
          return (
            <div key={section.id} className="border border-[#e85d1a]/12 rounded-lg bg-card overflow-hidden" role="listitem">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : section.id)}
                aria-expanded={open}
                aria-controls={`manual-panel-${section.id}`}
                id={`manual-tab-${section.id}`}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                data-testid={`manual-section-${section.id}`}
              >
                <span className="text-sm font-semibold text-foreground">{section.title}</span>
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />}
              </button>
              {open && (
                <div
                  id={`manual-panel-${section.id}`}
                  role="region"
                  aria-labelledby={`manual-tab-${section.id}`}
                  className="px-4 pb-5 border-t border-[#e85d1a]/12 pt-4"
                >
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-[11px] text-muted-foreground/70 leading-relaxed">
        Apex Atlas · never invent contacts · org inboxes stay company · public sources only
      </div>
    </div>
  );
}
