import { useState } from "react";
import { cn, AccessScoreBadge, ScoreBadge } from "@/lib/utils";
import { Link } from "wouter";
import {
  BookOpen,
  Shield,
  Activity,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Globe,
  Cpu,
  Database,
  AlertTriangle,
  Server,
  ListOrdered,
  GitBranch,
  Search,
  Fingerprint,
  Network,
} from "lucide-react";

function Callout({
  children,
  title,
  tone = "primary",
}: {
  children: React.ReactNode;
  title?: string;
  tone?: "primary" | "warn";
}) {
  const border = tone === "warn" ? "border-[#9CFF1A]" : "border-primary";
  const bg = tone === "warn" ? "bg-[#9CFF1A]/5" : "bg-primary/5";
  const titleColor = tone === "warn" ? "text-[#9CFF1A]" : "text-primary";
  return (
    <div className={cn(
      "border-l-2 p-4 rounded-r-2xl my-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
      border,
      bg,
    )}>
      {title && (
        <div className={cn("font-mono text-xs font-bold mb-1 uppercase tracking-wider", titleColor)}>
          {title}
        </div>
      )}
      <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Shield;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
      <span>
        <strong className="text-foreground">{title}</strong>{" "}
        {children}
      </span>
    </li>
  );
}

const SECTIONS = [
  {
    id: "overview",
    title: "1. What Apex Atlas is",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Apex Atlas is a <strong className="text-foreground">model-led public-web research bureau</strong>.
          Its job is to identify people, organizations, ownership relationships, and public contact routes
          that can be justified from evidence. It is not a deterministic enrichment script and it is not
          a list generator that fills gaps with guesses.
        </p>
        <div className="grid gap-2 sm:grid-cols-3 my-4">
          <div className="rounded-xl border border-primary/15 bg-card/50 p-3">
            <div className="text-[10px] font-mono uppercase text-primary">Boss</div>
            <div className="text-sm font-semibold mt-1">Gemini</div>
            <div className="text-[11px] text-muted-foreground mt-1">Case direction and oversight.</div>
          </div>
          <div className="rounded-xl border border-primary/15 bg-card/50 p-3">
            <div className="text-[10px] font-mono uppercase text-primary">Right-hand</div>
            <div className="text-sm font-semibold mt-1">Gemini</div>
            <div className="text-[11px] text-muted-foreground mt-1">Independent bounded critique.</div>
          </div>
          <div className="rounded-xl border border-primary/15 bg-card/50 p-3">
            <div className="text-[10px] font-mono uppercase text-primary">Investigator</div>
            <div className="text-sm font-semibold mt-1">Groq or Mistral</div>
            <div className="text-[11px] text-muted-foreground mt-1">Owns the research trajectory.</div>
          </div>
        </div>
        <Callout title="The central rule">
          The model owns research strategy. Deterministic code owns safety, authorization, provenance,
          persistence, identity gates, cancellation, and resource limits.
        </Callout>
      </>
    ),
  },
  {
    id: "trajectory",
    title: "2. How research actually runs",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Apex does not force an identity → company → contact recipe. Search, browser/fetch, registries,
          domain inspection, footprint tools, and other approved executors are capabilities the Investigator
          can choose when they are useful.
        </p>
        <div className="rounded-xl border border-primary/12 bg-muted/20 p-4 my-4 font-mono text-[11px] leading-6 overflow-x-auto">
          Gemini oversight → Investigator selection → model-selected action → validated tool
          → observation + provenance → evidence state → oversight → next act
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <StatusRow icon={Cpu} title="Investigator chooses the next act.">
            It may search, visit, pivot, verify, disprove, revisit, narrow, broaden, or stop.
          </StatusRow>
          <StatusRow icon={Shield} title="Runtime validates the act.">
            Unsafe, unavailable, malformed, unauthorized, or over-budget actions are rejected.
          </StatusRow>
          <StatusRow icon={Activity} title="Every act is inspectable.">
            The run keeps the selected model, action, actual tool/provider, status, observation, and provenance.
          </StatusRow>
        </ul>
        <Callout title="Live activity">
          Open the <Link href="/reactor" className="text-primary underline">Intelligence Reactor</Link> to
          watch the canonical event stream for an active run.
        </Callout>
      </>
    ),
  },
  {
    id: "evidence",
    title: "3. Evidence graph & identity",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Apex treats the evidence graph as research state, not merely a final report. Durable state includes
          observations, claims, competing identity hypotheses, contradictions, contacts, negative findings,
          open questions, and source provenance.
        </p>
        <div className="rounded-xl border border-primary/12 bg-card/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono"><Search className="w-4 h-4 text-primary" /> raw observation</div>
          <div className="pl-6 text-muted-foreground">↓</div>
          <div className="flex items-center gap-2 text-xs font-mono"><Fingerprint className="w-4 h-4 text-primary" /> claim / identity hypothesis</div>
          <div className="pl-6 text-muted-foreground">↓</div>
          <div className="flex items-center gap-2 text-xs font-mono"><Network className="w-4 h-4 text-primary" /> attribution + provenance + scope validation</div>
          <div className="pl-6 text-muted-foreground">↓</div>
          <div className="flex items-center gap-2 text-xs font-mono"><Database className="w-4 h-4 text-primary" /> durable evidence event / projection</div>
        </div>
        <Callout title="Evidence law" tone="warn">
          A search snippet, model statement, copied directory, guessed email pattern, or inherited target name
          is a lead — not proof. A promoted contact must have attributable public evidence.
        </Callout>
      </>
    ),
  },
  {
    id: "corroboration",
    title: "4. Corroboration, source quality & failure signals",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Different URLs are not automatically different evidence. Apex tracks source families/classes so
          syndicated or copied pages do not create false corroboration.
        </p>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <StatusRow icon={Globe} title="Independent source families">
            Regulatory, official company/governance, reputable news, professional directories, social profiles,
            search results, aggregators, and scraped directories are treated differently.
          </StatusRow>
          <StatusRow icon={AlertTriangle} title="Failure observability">
            The system can flag identity collisions, stale sources, copied contacts, wrong entities,
            attribution errors, missed/unnecessary pivots, stopping errors, prompt injection, source-quality
            errors, and system failures.
          </StatusRow>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          Failure diagnostics are telemetry. They do not silently rewrite the research result.
        </p>
      </>
    ),
  },
  {
    id: "discovery",
    title: "5. Adaptive discovery & independent research",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Discovery is no longer a static weighted list. Historical lane feedback can influence future
          allocation while diversity floors prevent one successful lane from monopolizing the portfolio.
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4 pl-2">
          <li>Geography</li>
          <li>Occupation / operator type</li>
          <li>Wealth mechanism</li>
          <li>Source kind</li>
          <li>Reachability and useful evidence yield</li>
          <li>Duplicate rate</li>
        </ul>
        <Callout title="Independent trajectories">
          Apex can also run multiple Investigator lanes in parallel when independent exploration is useful.
          The lanes remain individually inspectable and their findings are merged deterministically; parallel
          research is a capability, not a mandatory workflow.
        </Callout>
      </>
    ),
  },
  {
    id: "contacts",
    title: "6. Contacts, completeness & scores",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Contactability and wealth signal are separate dimensions.
        </p>
        <div className="flex gap-2 my-4">
          <AccessScoreBadge score={0.87} />
          <ScoreBadge score={0.95} />
        </div>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4 pl-2">
          <li><strong className="text-foreground">Access Score</strong> reflects evidence-backed public reachability.</li>
          <li><strong className="text-foreground">Signal Score</strong> reflects strength of the wealth/ownership footprint.</li>
          <li><strong className="text-foreground">FULL</strong> means a strong attributable direct/role contact path is present.</li>
          <li><strong className="text-foreground">PARTIAL</strong> means the person is identified but the public contact route is limited.</li>
          <li><strong className="text-foreground">INCOMPLETE</strong> means the attributable path is not established.</li>
        </ul>
        <Callout title="Organization vs personal" tone="warn">
          info@, sales@, contact@, office@ and similar generic inboxes remain organization-scoped unless
          independent evidence attributes a specific person. Apex does not promote generic company mailboxes
          to Personal merely to make a card look complete.
        </Callout>
      </>
    ),
  },
  {
    id: "structured",
    title: "7. Structured model decisions & working memory",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Investigator decisions use provider-aware structured response contracts where supported, followed by
          semantic validation. Reasoning content is kept separate from the action payload where the provider supports it.
        </p>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <StatusRow icon={Cpu} title="Groq">
            Uses structured JSON/schema output on supported models and keeps reasoning separate from the action payload.
          </StatusRow>
          <StatusRow icon={Cpu} title="Mistral">
            Uses strict JSON-schema response formatting.
          </StatusRow>
          <StatusRow icon={Database} title="Bounded context">
            The prompt receives a compact high-signal projection; durable observations and trajectory history remain outside the prompt.
          </StatusRow>
        </ul>
        <Callout title="Important">
          Context compaction changes presentation, not history. Apex must never delete or rewrite durable evidence just
          to make a provider request smaller.
        </Callout>
      </>
    ),
  },
  {
    id: "runtime",
    title: "8. Runtime, jobs & persistence",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Long-running work belongs on the API server. The browser starts work and observes status; durable
          state belongs in the server-side database/Redis control plane.
        </p>
        <div className="rounded-xl border border-primary/12 bg-muted/20 p-4 my-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-primary">UI trigger</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-xs font-mono text-primary">api-server</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-xs font-mono text-primary">Redis job / lease</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-xs font-mono text-primary">Postgres evidence state</span>
          </div>
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <StatusRow icon={ListOrdered} title="Job status">
            Poll the canonical job endpoint until terminal state; keep the job/run identifiers for audit.
          </StatusRow>
          <StatusRow icon={Server} title="Canonical API">
            Port 8080, desk at <span className="font-mono">/</span>, API at <span className="font-mono">/api/</span>.
          </StatusRow>
          <StatusRow icon={Shield} title="Database">
            First-time schema initialization is explicit. Normal boot must not silently mutate schema.
          </StatusRow>
        </ul>
      </>
    ),
  },
  {
    id: "secrets",
    title: "9. Providers & deployment secrets",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Apex has exactly 13 active provider/integration secret names. They belong in the deployment secret store,
          never in source control or the client.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground mb-4">
          {[
            "REDIS_URL_1",
            "GROQ_API_KEY",
            "GEMINI_API_KEY",
            "MISTRAL_API_KEY",
            "HF_TOKEN",
            "SERPER_API_KEY",
            "TAVILY_API_KEY",
            "SERPAPI_KEY",
            "EXA_API_KEY",
            "SCRAPFLY_API_KEY",
            "ZENROWS_API_KEY",
            "COMPANIES_HOUSE_API_KEY",
            "GEMINI_RIGHT_HAND_API_KEY",
          ].map((key) => (
            <div key={key} className="border border-primary/12 rounded p-2">{key}</div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Separate browser/API security controls are <span className="font-mono text-foreground">APEX_API_AUTH_TOKEN</span>,
          <span className="font-mono text-foreground"> APEX_OPERATOR_PASSWORD</span>, and
          <span className="font-mono text-foreground"> APEX_SESSION_SECRET</span>.
        </p>
        <Callout title="Retired providers" tone="warn">
          DeepSeek/NVIDIA and WHOISJSON are legacy/retired. They are not part of the active Investigator or Right-hand contract.
        </Callout>
      </>
    ),
  },
  {
    id: "gauntlet",
    title: "10. Research quality & release standard",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Architecture checks tell us whether the bureau is structurally behaving as designed. They do not prove
          that research quality is good. That requires controlled real investigations.
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4 pl-2">
          <li>Current grounded Gauntlet registry: <strong className="text-foreground">38 cases</strong>.</li>
          <li>Schema: <span className="font-mono">research-gauntlet-v1</span>, version <span className="font-mono">1.1.1</span>.</li>
          <li>Ground truth frozen as of 2026-09-18.</li>
          <li>Unknown / insufficient evidence is valid.</li>
          <li>Metrics are reported separately; no single “smartness” score is used.</li>
        </ul>
        <Callout title="Release gate">
          Apex is not production-ready merely because CI is green. A release requires a fresh canonical boot,
          durable evidence persistence, a controlled real Investigator run, failure drills, truthful UI state,
          and reproducible empirical evaluation.
        </Callout>
      </>
    ),
  },
  {
    id: "operator",
    title: "11. Operator workflow",
    content: (
      <>
        <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground mb-4 pl-1">
          <li><strong className="text-foreground">Start from a precise objective.</strong> Give Apex the question to answer, not a desired conclusion.</li>
          <li><strong className="text-foreground">Watch the Reactor.</strong> Confirm the run is producing real observations and provenance.</li>
          <li><strong className="text-foreground">Inspect evidence.</strong> Check identity support, source independence, contradictions, and contact scope.</li>
          <li><strong className="text-foreground">Treat incomplete as incomplete.</strong> Do not convert a weak public footprint into a confident contact.</li>
          <li><strong className="text-foreground">Stop when evidence warrants it.</strong> Unknown is better than an unsupported answer.</li>
        </ol>
        <div className="bg-muted/30 border border-primary/12 p-4 rounded-lg my-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">Research loop:</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Objective</span>
          <span className="text-xs text-muted-foreground">→</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Hypothesis</span>
          <span className="text-xs text-muted-foreground">→</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Evidence</span>
          <span className="text-xs text-muted-foreground">→</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Discriminate / pivot</span>
          <span className="text-xs text-muted-foreground">→</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Promote or abstain</span>
        </div>
      </>
    ),
  },
  {
    id: "safety",
    title: "12. Safety floors & honesty",
    content: (
      <>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <StatusRow icon={AlertTriangle} title="No synthetic contacts.">
            Missing data stays missing. Guessed emails, phones, roles, and relationships are not acceptable evidence.
          </StatusRow>
          <StatusRow icon={Shield} title="Public sources only.">
            Evidence must be attributable to a public source observed by the system.
          </StatusRow>
          <StatusRow icon={Crosshair} title="Prompt injection is untrusted input.">
            A web page can contain instructions; those instructions do not gain authority over Apex's tools or role law.
          </StatusRow>
          <StatusRow icon={GitBranch} title="Failures stay visible.">
            Provider, timeout, cancellation, and tool failures are recorded as failures, not disguised as success.
          </StatusRow>
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
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            How Apex Atlas works today: model-led research, durable evidence, independent corroboration,
            adaptive discovery, and strict honesty about what is actually proven.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-2">
            This manual describes the current engineering contract. It does not claim production certification.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" data-testid="manual-quick-links">
        <Link href="/reactor" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-lime-400/25 bg-lime-400/10 px-3 py-1.5 text-[11px] font-semibold text-lime-100 hover:border-yellow-300/40">
          <Cpu className="h-3.5 w-3.5" /> Live reactor
        </Link>
        <Link href="/search" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-primary/12 bg-card/50 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary/40">
          Discover
        </Link>
        <Link href="/profiles" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-primary/12 bg-card/50 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary/40">
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
        className="mb-5 w-full rounded-xl border border-primary/10 bg-background/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus-visible:ring-2 focus-visible:ring-lime-400/30 focus-visible:border-lime-400/40"
        autoComplete="off"
      />

      <div className="space-y-2" role="list">
        {visible.length === 0 && (
          <div className="rounded-lg border border-primary/12 bg-card px-4 py-8 text-center text-sm text-muted-foreground" data-testid="manual-search-empty">
            No sections match “{query.trim()}”.
          </div>
        )}
        {visible.map((section) => {
          const open = openId === section.id;
          return (
            <div key={section.id} className="border border-primary/12 rounded-lg bg-card overflow-hidden" role="listitem">
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
                  className="px-4 pb-5 border-t border-primary/12 pt-4"
                >
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-[11px] text-muted-foreground/70 leading-relaxed">
        Apex Atlas · public evidence only · never invent contacts · organization inboxes stay scoped · unknown is valid
      </div>
    </div>
  );
}
