import "../atlas-dashboard/_group.css";
import "./_hnwi.css";
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  FileCheck2,
  Filter,
  Globe2,
  KeyRound,
  Mail,
  MapPin,
  Menu,
  Minus,
  MoreHorizontal,
  Network,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type ContactVector = {
  kind: "email" | "phone" | "office" | "network";
  label: string;
  detail: string;
  confidence: "High" | "Moderate" | "Unclear";
};

type Person = {
  id: string;
  name: string;
  initials: string;
  title: string;
  company: string;
  location: string;
  focus: string;
  wealth: string;
  wealthNote: string;
  signal: number;
  signalLabel: string;
  signalNote: string;
  access: number;
  accessLabel: string;
  accessNote: string;
  sources: string[];
  vectors: ContactVector[];
  saved: boolean;
  lastChecked: string;
  accent: string;
};

const PEOPLE: Person[] = [
  {
    id: "celeste-arden",
    name: "Celeste Arden",
    initials: "CA",
    title: "Founder & principal",
    company: "Northline Capital",
    location: "New York · United States",
    focus: "Growth equity · climate infrastructure",
    wealth: "$280–360M",
    wealthNote: "Estimated private holdings",
    signal: 94,
    signalLabel: "Very strong",
    signalNote: "Ownership and executive filings align across 3 public sources.",
    access: 78,
    accessLabel: "Promising",
    accessNote: "One professional vector appears current; likely screened.",
    sources: ["SEC filings", "Company site", "Foundation record"],
    vectors: [
      { kind: "email", label: "Northline office", detail: "hello@northlinecapital.com", confidence: "High" },
      { kind: "office", label: "Firm office", detail: "New York · main line", confidence: "Moderate" },
      { kind: "network", label: "Board pathway", detail: "Mara V. · Northline board", confidence: "Moderate" },
    ],
    saved: true,
    lastChecked: "18 min ago",
    accent: "coral",
  },
  {
    id: "idris-morrow",
    name: "Idris Morrow",
    initials: "IM",
    title: "Chairman",
    company: "Morrow Maritime Group",
    location: "London · United Kingdom",
    focus: "Logistics · ports · family enterprise",
    wealth: "$1.1–1.6B",
    wealthNote: "Range from ownership disclosures",
    signal: 91,
    signalLabel: "Very strong",
    signalNote: "Controlling interest is corroborated by Companies House and annual reports.",
    access: 62,
    accessLabel: "Possible",
    accessNote: "A holding-company route is visible; personal route is not.",
    sources: ["Companies House", "Annual report", "Port authority"],
    vectors: [
      { kind: "office", label: "Group office", detail: "London · executive office", confidence: "Moderate" },
      { kind: "email", label: "Corporate inbox", detail: "enquiries@morrowmaritime.co.uk", confidence: "Moderate" },
    ],
    saved: false,
    lastChecked: "42 min ago",
    accent: "blue",
  },
  {
    id: "noor-almasi",
    name: "Noor Almasi",
    initials: "NA",
    title: "Investor & philanthropist",
    company: "Almasi Family Office",
    location: "Dubai · United Arab Emirates",
    focus: "Consumer brands · education",
    wealth: "$600–850M",
    wealthNote: "Public estimate; not a verified balance sheet",
    signal: 84,
    signalLabel: "Strong",
    signalNote: "Foundation leadership and portfolio ownership are consistently reported.",
    access: 86,
    accessLabel: "Open path",
    accessNote: "A foundation contact and an event office are both current.",
    sources: ["Foundation filings", "Portfolio sites", "Conference record"],
    vectors: [
      { kind: "email", label: "Foundation office", detail: "contact@almasifoundation.org", confidence: "High" },
      { kind: "office", label: "Program office", detail: "Dubai · grants desk", confidence: "High" },
      { kind: "network", label: "Event pathway", detail: "Global Learning Forum · 2024", confidence: "Moderate" },
    ],
    saved: false,
    lastChecked: "1 hr ago",
    accent: "amber",
  },
  {
    id: "henrik-voss",
    name: "Henrik Voss",
    initials: "HV",
    title: "Co-founder",
    company: "Tandem Systems",
    location: "Copenhagen · Denmark",
    focus: "Industrial software · robotics",
    wealth: "$95–140M",
    wealthNote: "Based on disclosed ownership",
    signal: 76,
    signalLabel: "Good",
    signalNote: "Founder role is clear; wealth band is directional and should be treated as such.",
    access: 47,
    accessLabel: "Unclear",
    accessNote: "Public profile is active, but no lawful direct vector surfaced.",
    sources: ["Company registry", "Trade press", "Patent record"],
    vectors: [],
    saved: false,
    lastChecked: "2 hrs ago",
    accent: "violet",
  },
  {
    id: "marisol-quinn",
    name: "Marisol Quinn",
    initials: "MQ",
    title: "Managing partner",
    company: "Quinn & Vale",
    location: "San Francisco · United States",
    focus: "Venture capital · health systems",
    wealth: "$70–110M",
    wealthNote: "Estimated from fund disclosures",
    signal: 88,
    signalLabel: "Strong",
    signalNote: "Partner role and fund affiliation are confirmed in recent public records.",
    access: 72,
    accessLabel: "Promising",
    accessNote: "Firm email is active; communication is likely handled by an assistant.",
    sources: ["Fund filings", "Firm site", "University board"],
    vectors: [
      { kind: "email", label: "Firm office", detail: "inquiries@quinnvale.com", confidence: "High" },
      { kind: "network", label: "Board pathway", detail: "Pacific Health Institute", confidence: "Moderate" },
    ],
    saved: false,
    lastChecked: "3 hrs ago",
    accent: "mint",
  },
];

const FILTERS = [
  { id: "all", label: "All people" },
  { id: "strong", label: "Strong signal" },
  { id: "reachable", label: "Open path" },
  { id: "saved", label: "Saved" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function initialsTone(accent: Person["accent"]) {
  return {
    coral: "atlas-tone-coral",
    blue: "atlas-tone-blue",
    amber: "atlas-tone-amber",
    violet: "atlas-tone-violet",
    mint: "atlas-tone-mint",
  }[accent];
}

function VectorIcon({ kind }: { kind: ContactVector["kind"] }) {
  if (kind === "email") return <Mail aria-hidden="true" />;
  if (kind === "phone") return <Phone aria-hidden="true" />;
  if (kind === "office") return <BriefcaseBusiness aria-hidden="true" />;
  return <Network aria-hidden="true" />;
}

function ScorePill({
  kind,
  score,
  label,
}: {
  kind: "signal" | "access";
  score: number;
  label: string;
}) {
  return (
    <div className={cn("atlas-score", kind === "signal" ? "atlas-score-signal" : "atlas-score-access")}>
      <div className="atlas-score-topline">
        <span>{kind === "signal" ? "Signal" : "Access"}</span>
        <CircleHelp aria-hidden="true" />
      </div>
      <div className="atlas-score-value">
        <strong>{score}</strong>
        <span>/100</span>
      </div>
      <span className="atlas-score-label">{label}</span>
    </div>
  );
}

function ContactVectorRow({ vector }: { vector: ContactVector }) {
  return (
    <div className="atlas-vector-row">
      <span className="atlas-vector-icon"><VectorIcon kind={vector.kind} /></span>
      <span className="atlas-vector-copy">
        <span className="atlas-vector-label">{vector.label}</span>
        <span className="atlas-vector-detail">{vector.detail}</span>
      </span>
      <span className={cn("atlas-confidence", vector.confidence === "High" && "is-high")}>
        {vector.confidence}
      </span>
    </div>
  );
}

function PersonCard({
  person,
  expanded,
  onExpand,
  onSave,
  onOpen,
}: {
  person: Person;
  expanded: boolean;
  onExpand: () => void;
  onSave: () => void;
  onOpen: () => void;
}) {
  return (
    <article className={cn("atlas-person-card", expanded && "is-expanded")}>
      <div className="atlas-person-main">
        <div className={cn("atlas-avatar", initialsTone(person.accent))}>{person.initials}</div>
        <div className="atlas-person-identity">
          <div className="atlas-person-name-line">
            <h3>{person.name}</h3>
            <button className={cn("atlas-save-button", person.saved && "is-saved")} onClick={onSave} aria-label={person.saved ? `Remove ${person.name} from saved` : `Save ${person.name}`}>
              <Bookmark aria-hidden="true" />
            </button>
          </div>
          <p>{person.title} <span>at</span> <strong>{person.company}</strong></p>
          <div className="atlas-person-meta">
            <span><MapPin aria-hidden="true" /> {person.location}</span>
            <span><BriefcaseBusiness aria-hidden="true" /> {person.focus}</span>
          </div>
        </div>
        <button className="atlas-more-button" aria-label={`More options for ${person.name}`} onClick={onOpen}><MoreHorizontal aria-hidden="true" /></button>
      </div>

      <div className="atlas-card-grid">
        <div className="atlas-wealth-block">
          <span className="atlas-eyebrow">Estimated wealth</span>
          <strong>{person.wealth}</strong>
          <span>{person.wealthNote}</span>
        </div>
        <ScorePill kind="signal" score={person.signal} label={person.signalLabel} />
        <ScorePill kind="access" score={person.access} label={person.accessLabel} />
      </div>

      <div className="atlas-card-foot">
        <div className="atlas-evidence-summary">
          <div className="atlas-evidence-heading">
            <span className="atlas-eyebrow">Evidence behind this profile</span>
            <span className="atlas-check-time"><Clock3 aria-hidden="true" /> Checked {person.lastChecked}</span>
          </div>
          <p>{person.signalNote}</p>
          <div className="atlas-source-list">
            {person.sources.map((source) => <span key={source}><FileCheck2 aria-hidden="true" /> {source}</span>)}
          </div>
        </div>
        <div className="atlas-card-action">
          <span className="atlas-eyebrow">Contact paths</span>
          {person.vectors.length > 0 ? (
            <button className={cn("atlas-reveal-button", expanded && "is-open")} onClick={onExpand}>
              {expanded ? "Hide evidence" : `${person.vectors.length} vector${person.vectors.length === 1 ? "" : "s"} found`}
              <ChevronDown aria-hidden="true" />
            </button>
          ) : (
            <span className="atlas-no-vector"><Minus aria-hidden="true" /> No direct vector surfaced</span>
          )}
        </div>
      </div>

      {expanded && person.vectors.length > 0 && (
        <div className="atlas-vector-drawer">
          <div className="atlas-vector-drawer-head">
            <span>Public contact evidence</span>
            <span>Lawful, source-linked paths only</span>
          </div>
          {person.vectors.map((vector) => <ContactVectorRow key={`${vector.kind}-${vector.detail}`} vector={vector} />)}
        </div>
      )}

      <button className="atlas-open-profile" onClick={onOpen}>
        Open profile <ArrowUpRight aria-hidden="true" />
      </button>
    </article>
  );
}

function DetailSheet({ person, onClose }: { person: Person; onClose: () => void }) {
  return (
    <div className="atlas-sheet-backdrop" onClick={onClose}>
      <aside className="atlas-profile-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="atlas-sheet-header">
          <span className="atlas-eyebrow">Profile brief · {person.id.slice(0, 8)}</span>
          <button className="atlas-close-button" onClick={onClose} aria-label="Close profile"><X aria-hidden="true" /></button>
        </div>
        <div className="atlas-sheet-person">
          <div className={cn("atlas-avatar atlas-avatar-large", initialsTone(person.accent))}>{person.initials}</div>
          <div>
            <h2>{person.name}</h2>
            <p>{person.title} at {person.company}</p>
            <span><MapPin aria-hidden="true" /> {person.location}</span>
          </div>
        </div>
        <div className="atlas-sheet-scores">
          <ScorePill kind="signal" score={person.signal} label={person.signalLabel} />
          <ScorePill kind="access" score={person.access} label={person.accessLabel} />
        </div>
        <section className="atlas-sheet-section">
          <span className="atlas-eyebrow">What is known</span>
          <p>{person.signalNote}</p>
          <div className="atlas-source-list atlas-source-list-sheet">
            {person.sources.map((source) => <span key={source}><FileCheck2 aria-hidden="true" /> {source}</span>)}
          </div>
        </section>
        <section className="atlas-sheet-section">
          <div className="atlas-section-title">
            <span className="atlas-eyebrow">Available contact paths</span>
            <span>{person.vectors.length} found</span>
          </div>
          {person.vectors.length ? person.vectors.map((vector) => <ContactVectorRow key={`${vector.kind}-${vector.detail}`} vector={vector} />) : <div className="atlas-sheet-empty"><CircleHelp aria-hidden="true" /> No current public contact path was found. This profile remains useful as a signal, not an access promise.</div>}
        </section>
        <div className="atlas-sheet-note"><ShieldCheck aria-hidden="true" /> Use source-linked public channels and make your own contact decision outside Atlas.</div>
        <button className="atlas-sheet-copy" onClick={() => navigator.clipboard?.writeText(`${person.name} · ${person.company}`)}><Copy aria-hidden="true" /> Copy profile reference</button>
      </aside>
    </div>
  );
}

function CapacityPopover({ onClose }: { onClose: () => void }) {
  const [keyAction, setKeyAction] = useState("Atlas research key");

  return (
    <div className="atlas-capacity-popover">
      <div className="atlas-capacity-head">
        <div><span className="atlas-eyebrow">Provider capacity</span><strong>Quietly healthy</strong></div>
        <button onClick={onClose} aria-label="Close provider capacity"><X aria-hidden="true" /></button>
      </div>
      <div className="atlas-capacity-meter"><span /></div>
      <div className="atlas-capacity-row"><span>Public source lookups</span><strong>742 <small>remaining</small></strong></div>
      <div className="atlas-capacity-row"><span>Last checked</span><strong>Just now</strong></div>
      <div className="atlas-key-row"><KeyRound aria-hidden="true" /><span>Atlas research key</span><i>Active</i></div>
      <div className="atlas-capacity-actions">
        <button onClick={() => setKeyAction("New key ready to add")}><Plus aria-hidden="true" /> Add key</button>
        <button onClick={() => setKeyAction("Replacement staged")}>Replace</button>
        <button onClick={() => setKeyAction("Removal requires confirmation")}>Remove</button>
      </div>
      {keyAction !== "Atlas research key" && <div className="atlas-capacity-feedback">{keyAction}</div>}
    </div>
  );
}

export function HNWICommandCenter() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [savedIds, setSavedIds] = useState(() => new Set(PEOPLE.filter((person) => person.saved).map((person) => person.id)));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visiblePeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return PEOPLE.filter((person) => {
      const matchesQuery = !normalizedQuery || [person.name, person.company, person.focus, person.location].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "strong" && person.signal >= 85) ||
        (activeFilter === "reachable" && person.access >= 70) ||
        (activeFilter === "saved" && savedIds.has(person.id));
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, query, savedIds]);

  const toggleSaved = (id: string) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="atlas-command-shell">
      <header className="atlas-topbar">
        <div className="atlas-brand">
          <div className="atlas-mark"><Sparkles aria-hidden="true" /></div>
          <div><strong>Apex Atlas</strong><span>Private intelligence workspace</span></div>
        </div>
        <nav className={cn("atlas-topnav", mobileMenuOpen && "is-open")}>
          <button className="is-active" onClick={() => { setActiveFilter("all"); setMobileMenuOpen(false); }}><UsersRound aria-hidden="true" /> People</button>
          <button onClick={() => setActiveFilter("saved")}><Bookmark aria-hidden="true" /> Saved <b>{savedIds.size}</b></button>
          <button onClick={() => setMobileMenuOpen(false)}><Globe2 aria-hidden="true" /> Sources</button>
        </nav>
        <div className="atlas-top-actions">
          <div className="atlas-capacity-wrap">
            <button className={cn("atlas-capacity-trigger", capacityOpen && "is-open")} onClick={() => setCapacityOpen((open) => !open)}>
              <span className="atlas-capacity-dot" /> Capacity <ChevronDown aria-hidden="true" />
            </button>
            {capacityOpen && <CapacityPopover onClose={() => setCapacityOpen(false)} />}
          </div>
          <button className="atlas-avatar-user" aria-label="Open account menu" onClick={() => undefined}>AR</button>
          <button className="atlas-mobile-menu" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Toggle navigation"><Menu aria-hidden="true" /></button>
        </div>
      </header>

      <main className="atlas-command-content">
        <div className="atlas-page-heading">
          <div>
            <span className="atlas-kicker"><span /> Your private desk · 06 February 2025</span>
            <h1>People worth a closer look.</h1>
            <p>Profiles where financial signal and a realistic public path meet. The person stays at the center; the evidence stays close.</p>
          </div>
          <div className="atlas-heading-aside">
            <span className="atlas-eyebrow">Desk view</span>
            <strong>{visiblePeople.length.toString().padStart(2, "0")} <small>of 128 profiles</small></strong>
            <span className="atlas-heading-updated"><Check aria-hidden="true" /> Updated 6 minutes ago</span>
          </div>
        </div>

        <div className="atlas-toolbar">
          <label className="atlas-search">
            <Search aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, firms, or focus areas" aria-label="Search people" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X aria-hidden="true" /></button>}
          </label>
          <div className="atlas-filter-group">
            <Filter aria-hidden="true" />
            {FILTERS.map((filter) => (
              <button key={filter.id} className={activeFilter === filter.id ? "is-active" : ""} onClick={() => setActiveFilter(filter.id)}>
                {filter.label}
                {filter.id === "saved" && <b>{savedIds.size}</b>}
              </button>
            ))}
          </div>
          <button className="atlas-sort-button" onClick={() => setActiveFilter("all")}><Star aria-hidden="true" /> Curated order <ChevronDown aria-hidden="true" /></button>
        </div>

        <div className="atlas-reading-note">
          <span><ShieldCheck aria-hidden="true" /> Evidence-led</span>
          <span>Signal tells you why someone qualifies.</span>
          <span>Access tells you whether a lawful public path looks realistic.</span>
        </div>

        <section className="atlas-people-list">
          {visiblePeople.length > 0 ? visiblePeople.map((person) => (
            <PersonCard
              key={person.id}
              person={{ ...person, saved: savedIds.has(person.id) }}
              expanded={expandedId === person.id}
              onExpand={() => setExpandedId((current) => current === person.id ? null : person.id)}
              onSave={() => toggleSaved(person.id)}
              onOpen={() => setSelectedPerson(person)}
            />
          )) : (
            <div className="atlas-empty-state">
              <div className="atlas-empty-mark"><Search aria-hidden="true" /></div>
              <h2>No one in this part of the desk.</h2>
              <p>Try a different name, firm, or filter. Profiles stay here until their public evidence changes.</p>
              <button onClick={() => { setQuery(""); setActiveFilter("all"); }}>Clear the view <ChevronRight aria-hidden="true" /></button>
            </div>
          )}
        </section>
        <footer className="atlas-footer">
          <span><ShieldCheck aria-hidden="true" /> Apex Atlas surfaces public evidence only. Access is an informed possibility, never a guarantee.</span>
          <button onClick={() => setCapacityOpen(true)}>Data health <ArrowUpRight aria-hidden="true" /></button>
        </footer>
      </main>
      {selectedPerson && <DetailSheet person={{ ...selectedPerson, saved: savedIds.has(selectedPerson.id) }} onClose={() => setSelectedPerson(null)} />}
    </div>
  );
}
