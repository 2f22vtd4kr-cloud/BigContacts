import type { ReactNode } from "react";

type GlyphKind =
  | "wikipedia"
  | "browser"
  | "search"
  | "globe"
  | "github"
  | "dns"
  | "mail"
  | "phone"
  | "plane"
  | "registry"
  | "property"
  | "company"
  | "person"
  | "graph"
  | "path"
  | "document";

type GlyphSpec = { kind: GlyphKind; size?: "small" | "medium" | "large"; tilt?: number };
type Process = {
  name: string;
  kicker: string;
  percent: number;
  tone: string;
  glyphs: GlyphSpec[];
  phrases: string[];
};

const processes: Process[] = [
  {
    name: "Deep Web OSINT",
    kicker: "web corroboration",
    percent: 27,
    tone: "#B695FF",
    glyphs: [
      { kind: "browser", size: "large" },
      { kind: "wikipedia", size: "medium", tilt: -5 },
      { kind: "search", size: "small" },
      { kind: "globe", size: "medium", tilt: 5 },
      { kind: "document", size: "small" },
      { kind: "browser", size: "small", tilt: 4 },
    ],
    phrases: [
      "Wikipedia · reading biographies",
      "search index · checking name variants",
      "public site · looking for corroboration",
      "contact page · validating a signal",
    ],
  },
  {
    name: "In-House Enrichment",
    kicker: "public contact paths",
    percent: 8,
    tone: "#25D49A",
    glyphs: [
      { kind: "github", size: "medium" },
      { kind: "dns", size: "large", tilt: -4 },
      { kind: "mail", size: "small" },
      { kind: "phone", size: "medium", tilt: 4 },
      { kind: "globe", size: "small" },
      { kind: "github", size: "small", tilt: -5 },
    ],
    phrases: [
      "GitHub · checking public code profiles",
      "RDAP · resolving domain registrants",
      "DNS · testing the company domain",
      "public email · validating a contact vector",
    ],
  },
  {
    name: "Western HNWI Engine",
    kicker: "company & ownership records",
    percent: 42,
    tone: "#65B7FF",
    glyphs: [
      { kind: "registry", size: "large" },
      { kind: "company", size: "medium", tilt: -4 },
      { kind: "person", size: "small" },
      { kind: "document", size: "medium", tilt: 5 },
      { kind: "globe", size: "small" },
      { kind: "registry", size: "small", tilt: -4 },
    ],
    phrases: [
      "SEC filings · reading ownership disclosures",
      "Companies House · checking officer names",
      "BRREG · comparing company registrations",
      "issuer record · linking a person to a company",
    ],
  },
  {
    name: "FAA Registry",
    kicker: "aircraft ownership",
    percent: 63,
    tone: "#36C6E8",
    glyphs: [
      { kind: "plane", size: "large", tilt: -5 },
      { kind: "registry", size: "small" },
      { kind: "person", size: "medium", tilt: 4 },
      { kind: "property", size: "small" },
      { kind: "document", size: "medium", tilt: -4 },
      { kind: "plane", size: "small", tilt: 5 },
    ],
    phrases: [
      "FAA registry · reading aircraft records",
      "N-number · normalizing owner names",
      "aircraft record · attaching an asset",
      "owner address · preparing a research lead",
    ],
  },
  {
    name: "Hybrid Research",
    kicker: "relationship paths",
    percent: 71,
    tone: "#F3B94F",
    glyphs: [
      { kind: "graph", size: "large" },
      { kind: "path", size: "medium", tilt: -4 },
      { kind: "person", size: "small" },
      { kind: "company", size: "medium", tilt: 5 },
      { kind: "document", size: "small" },
      { kind: "graph", size: "small", tilt: -5 },
    ],
    phrases: [
      "relationship graph · tracing connected records",
      "path scoring · ranking the strongest route",
      "company edge · checking a shared signal",
      "research brief · shaping the next question",
    ],
  },
];

function Glyph({ spec }: { spec: GlyphSpec }) {
  const size = spec.size === "large" ? 34 : spec.size === "medium" ? 26 : 19;
  const stroke = spec.size === "large" ? 1.55 : 1.35;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { transform: `rotate(${spec.tilt ?? 0}deg)` },
  };

  const paths: Record<GlyphKind, ReactNode> = {
    wikipedia: (
      <><path d="M5 9h4l4 13 3-9 3 9 4-13h4" /><path d="M8 9l-2 0M26 9l2 0" /></>
    ),
    browser: (
      <><rect x="4" y="5" width="24" height="21" rx="3" /><path d="M4 11h24M8 8.2h.1M11 8.2h.1M14 8.2h.1" /><path d="m10 17 3 3 6-6" /></>
    ),
    search: (
      <><circle cx="14" cy="14" r="7" /><path d="m19 19 7 7M11 14h6M14 11v6" /></>
    ),
    globe: (
      <><circle cx="16" cy="16" r="11" /><path d="M5 16h22M16 5c3 3 4 7 4 11s-1 8-4 11c-3-3-4-7-4-11s1-8 4-11Z" /></>
    ),
    github: (
      <><path d="M16 4a11 11 0 0 0-3.5 21.4c.6.1.8-.3.8-.6v-2.3c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1 1.6-.8 1.9-1.3.1-.7.4-1.1.7-1.4-2.5-.3-5.1-1.2-5.1-5.4 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.5.1-3.1 0 0 .9-.3 3.1 1.1a10.7 10.7 0 0 1 5.7 0c2.2-1.4 3.1-1.1 3.1-1.1.6 1.6.2 2.8.1 3.1.7.8 1.1 1.8 1.1 3 0 4.2-2.6 5.1-5.1 5.4.4.3.7 1 .7 2v3.1c0 .3.2.7.8.6A11 11 0 0 0 16 4Z" /></>
    ),
    dns: (
      <><rect x="5" y="5" width="9" height="7" rx="1.5" /><rect x="18" y="5" width="9" height="7" rx="1.5" /><rect x="11.5" y="20" width="9" height="7" rx="1.5" /><path d="M9.5 12v4h13v-4M16 16v4" /></>
    ),
    mail: (
      <><rect x="4" y="7" width="24" height="18" rx="2" /><path d="m5 9 11 9L27 9" /></>
    ),
    phone: (
      <><path d="M10 5.5 7.5 7c-1.3.8-1.5 2.6-.8 4.1 2.7 5.7 7.5 10.5 13.2 13.2 1.5.7 3.3.5 4.1-.8l1.5-2.5-5.1-3.1-2 2a18.5 18.5 0 0 1-7.5-7.5l2-2L10 5.5Z" /></>
    ),
    plane: (
      <><path d="m4 17 24-7-7 24-4-13-13-4Z" /><path d="m17 21 7-7" /></>
    ),
    registry: (
      <><path d="M6 26V9l10-4 10 4v17M4 26h24M11 13h2M19 13h2M11 18h2M19 18h2M11 23h2M19 23h2" /></>
    ),
    property: (
      <><path d="m4 15 12-10 12 10" /><path d="M7 13v13h18V13M12 26v-7h8v7" /></>
    ),
    company: (
      <><path d="M7 27V5h12v22M19 12h6v15M11 9h3M11 14h3M11 19h3M22 16h1M22 21h1M5 27h22" /></>
    ),
    person: (
      <><circle cx="16" cy="10" r="4" /><path d="M7 27c.8-5 3.7-8 9-8s8.2 3 9 8" /></>
    ),
    graph: (
      <><circle cx="7" cy="16" r="3" /><circle cx="24" cy="8" r="3" /><circle cx="24" cy="24" r="3" /><path d="m9.7 14.7 11.6-5.4M9.7 17.3l11.6 5.4" /></>
    ),
    path: (
      <><circle cx="7" cy="23" r="2.5" /><circle cx="16" cy="9" r="2.5" /><circle cx="25" cy="18" r="2.5" /><path d="m8.5 21 6-9M18.2 10.5l5 6" /></>
    ),
    document: (
      <><path d="M8 4h11l5 5v19H8zM19 4v6h5M12 15h8M12 20h8M12 25h5" /></>
    ),
  };

  return <svg {...common} aria-hidden="true">{paths[spec.kind]}</svg>;
}

function ProcessStreamRow({ process }: { process: Process }) {
  const glyphTrack = [...process.glyphs, ...process.glyphs];
  const phraseTrack = [...process.phrases, ...process.phrases];

  return (
    <section className="process-row" style={{ "--tone": process.tone } as React.CSSProperties}>
      <div className="process-label">
        <div className="process-name">{process.name}</div>
        <div className="process-kicker">{process.kicker}</div>
      </div>
      <div className="process-bar">
        <div className="process-progress" style={{ width: `${process.percent}%` }} />
        <div className="process-stream" aria-label={`${process.name}: ${process.phrases.join(". ")}`}>
          <div className="stream-layer stream-glyphs" aria-hidden="true">
            <div className="stream-track glyph-track">
              {glyphTrack.map((spec, index) => (
                <span className="glyph-slot" key={`glyph-${index}`}><Glyph spec={spec} /></span>
              ))}
            </div>
          </div>
          <div className="stream-layer stream-phrases" aria-hidden="true">
            <div className="stream-track phrase-track">
              {phraseTrack.map((phrase, index) => (
                <span className="phrase" key={`phrase-${index}`}>{phrase}</span>
              ))}
            </div>
          </div>
          <div className="stream-atmosphere" aria-hidden="true" />
        </div>
      </div>
      <div className="process-percent">{process.percent}%</div>
    </section>
  );
}

export function ProcessStream() {
  return (
    <main className="process-demo">
      <header className="demo-header">
        <div>
          <div className="demo-eyebrow">APEX ATLAS · OPERATIONS</div>
          <h1>Live intelligence pipeline</h1>
          <p>Every stream shows the public evidence being inspected right now.</p>
        </div>
        <div className="demo-live"><span /> LIVE</div>
      </header>
      <div className="process-list">
        {processes.map((process) => <ProcessStreamRow key={process.name} process={process} />)}
      </div>
      <footer className="demo-note">
        <span className="note-dot" /> Icons move quickly between sources · explanations drift slowly behind them
      </footer>
    </main>
  );
}
