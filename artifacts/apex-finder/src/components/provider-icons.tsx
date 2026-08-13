/**
 * Branded provider icons for Intelligence Reactor live feed.
 * Simple recognisable marks — not full trademark reproductions.
 */

import type { CSSProperties } from "react";

type IconProps = { size?: number; className?: string; style?: CSSProperties; title?: string };

function Svg({ size = 14, className, style, title, children, viewBox = "0 0 24 24" }: IconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Google "G" multicolor mark */
export function GoogleIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Google"}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

/** Perplexity-style mark */
export function PerplexityIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Perplexity"}>
      <rect width="24" height="24" rx="6" fill="#20808D" />
      <path fill="#fff" d="M7 6h2.2l2.3 6.2L14 6h2.2l-3.6 9.2h-2.1L7 6zm9.5 0h2v12h-2V6z" />
    </Svg>
  );
}

/** Tavily */
export function TavilyIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Tavily"}>
      <rect width="24" height="24" rx="6" fill="#4668F2" />
      <path fill="#fff" d="M6 7h12v2.2H13.2V18h-2.4V9.2H6V7z" />
    </Svg>
  );
}

/** Exa neural search */
export function ExaIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Exa"}>
      <rect width="24" height="24" rx="6" fill="#1a1a1a" />
      <path fill="#7CFF6B" d="M6 7h12v2H9.5v2.5H17v2H9.5V18H6V7z" />
    </Svg>
  );
}

/** Serper / SerpAPI — search engine style */
export function SerpIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "SERP"}>
      <circle cx="12" cy="12" r="11" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="4.5" fill="none" stroke="#38BDF8" strokeWidth="1.8" />
      <path d="M14.5 14.5L18 18" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** Gemini (Google AI) — four-point sparkle in Google blue */
export function GeminiIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Gemini"}>
      <defs>
        <linearGradient id="gem" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path fill="url(#gem)" d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </Svg>
  );
}

/** Groq */
export function GroqIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Groq"}>
      <rect width="24" height="24" rx="6" fill="#F55036" />
      <path fill="#fff" d="M7 7h10v2.2h-3.8V18h-2.4V9.2H7V7z" />
    </Svg>
  );
}

/** Scrapfly / browser */
export function BrowserIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Browser"}>
      <rect x="2" y="3" width="20" height="16" rx="2.5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
      <path d="M2 7.5h20" stroke="#F59E0B" strokeWidth="1.2" />
      <circle cx="5.5" cy="5.3" r="0.9" fill="#F59E0B" />
      <circle cx="8" cy="5.3" r="0.9" fill="#F59E0B" />
      <circle cx="10.5" cy="5.3" r="0.9" fill="#F59E0B" />
    </Svg>
  );
}

/** Sherlock / Maigret footprint */
export function SherlockIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Sherlock"}>
      <circle cx="10" cy="10" r="5.5" fill="none" stroke="#C4B5FD" strokeWidth="1.8" />
      <path d="M14.2 14.2L19 19" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 10h4M10 8v4" stroke="#C4B5FD" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

/** Domain / RDAP */
export function DomainIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Domain / RDAP"}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#67E8F9" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="#67E8F9" strokeWidth="1.2" />
      <path d="M3.5 12h17M12 3.5v17" stroke="#67E8F9" strokeWidth="1.2" />
    </Svg>
  );
}

/** Companies House / registry */
export function RegistryIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Registry"}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.3" />
      <path d="M7 7h10M7 11h10M7 15h7" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

/** Bureau / case desk */
export function BureauIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Bureau"}>
      <rect x="3" y="5" width="18" height="14" rx="2" fill="#0F172A" stroke="#22D3EE" strokeWidth="1.5" />
      <path d="M3 9h18" stroke="#22D3EE" strokeWidth="1.2" />
      <path d="M8 13h8M8 16h5" stroke="#22D3EE" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

/** Discovery */
export function DiscoveryIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Discovery"}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#FB923C" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="#FB923C" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#FB923C" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

/** Generic LLM / prompt */
export function PromptIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Prompt"}>
      <rect x="3" y="4" width="18" height="14" rx="2" fill="#14532D" stroke="#A3E635" strokeWidth="1.4" />
      <path d="M7 9h10M7 12h7" stroke="#A3E635" strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

/** Default atlas node */
export function AtlasIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? "Atlas"}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#22D3EE" strokeWidth="1.6" />
      <path d="M12 6v12M8 9l4 3 4-3" stroke="#22D3EE" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export type ProviderKind =
  | "google"
  | "gemini"
  | "perplexity"
  | "tavily"
  | "exa"
  | "serp"
  | "serper"
  | "serpapi"
  | "groq"
  | "browser"
  | "scrapfly"
  | "zenrows"
  | "sherlock"
  | "maigret"
  | "holehe"
  | "domain"
  | "rdap"
  | "whois"
  | "registry"
  | "edgar"
  | "companies-house"
  | "bureau"
  | "discovery"
  | "prompt"
  | "atlas";

/** Map tool id / stage / free text → provider kind */
export function detectProviderKind(raw: string): ProviderKind {
  const s = String(raw || "").toLowerCase();
  if (/gemini|google\s*search|grounded/.test(s) && /gemini|google/.test(s)) {
    if (/gemini/.test(s)) return "gemini";
  }
  if (/\bgoogle\b|site:google|google\.com\/search/.test(s)) return "google";
  if (/gemini/.test(s)) return "gemini";
  if (/perplexity|perp0|perpfu/.test(s)) return "perplexity";
  if (/tavily/.test(s)) return "tavily";
  if (/\bexa\b/.test(s)) return "exa";
  if (/serpapi/.test(s)) return "serpapi";
  if (/serper/.test(s)) return "serper";
  if (/\bserp\b|web_search|web search/.test(s)) return "serp";
  if (/groq/.test(s)) return "groq";
  if (/scrapfly|zenrows|browser-fetch|browser fetch|visit\b/.test(s)) return "browser";
  if (/sherlock/.test(s)) return "sherlock";
  if (/maigret|holehe/.test(s)) return "maigret";
  if (/rdap|whoisjson|whois|domain-surface|domain surface/.test(s)) return "domain";
  if (/companies.?house|edgar|registry|sec\.gov/.test(s)) return "registry";
  if (/bureau|case-bureau|investigator|boss/.test(s)) return "bureau";
  if (/discover|webdisc|broad-discovery|force.related/.test(s)) return "discovery";
  if (/prompt|llm|extract/.test(s)) return "prompt";
  return "atlas";
}

export function ProviderIcon({ kind, size = 14, ...rest }: IconProps & { kind: ProviderKind }) {
  switch (kind) {
    case "google":
      return <GoogleIcon size={size} {...rest} />;
    case "gemini":
      return <GeminiIcon size={size} {...rest} />;
    case "perplexity":
      return <PerplexityIcon size={size} {...rest} />;
    case "tavily":
      return <TavilyIcon size={size} {...rest} />;
    case "exa":
      return <ExaIcon size={size} {...rest} />;
    case "serp":
    case "serper":
    case "serpapi":
      return <SerpIcon size={size} {...rest} />;
    case "groq":
      return <GroqIcon size={size} {...rest} />;
    case "browser":
    case "scrapfly":
    case "zenrows":
      return <BrowserIcon size={size} {...rest} />;
    case "sherlock":
    case "maigret":
    case "holehe":
      return <SherlockIcon size={size} {...rest} />;
    case "domain":
    case "rdap":
    case "whois":
      return <DomainIcon size={size} {...rest} />;
    case "registry":
    case "edgar":
    case "companies-house":
      return <RegistryIcon size={size} {...rest} />;
    case "bureau":
      return <BureauIcon size={size} {...rest} />;
    case "discovery":
      return <DiscoveryIcon size={size} {...rest} />;
    case "prompt":
      return <PromptIcon size={size} {...rest} />;
    default:
      return <AtlasIcon size={size} {...rest} />;
  }
}

/** Human label next to icon */
export function providerLabel(kind: ProviderKind): string {
  const map: Record<ProviderKind, string> = {
    google: "Google",
    gemini: "Gemini",
    perplexity: "Perplexity",
    tavily: "Tavily",
    exa: "Exa",
    serp: "Web search",
    serper: "Serper",
    serpapi: "SerpAPI",
    groq: "Groq",
    browser: "Browser",
    scrapfly: "Scrapfly",
    zenrows: "ZenRows",
    sherlock: "Sherlock",
    maigret: "Maigret",
    holehe: "Holehe",
    domain: "Domain",
    rdap: "RDAP",
    whois: "WHOIS",
    registry: "Registry",
    edgar: "EDGAR",
    "companies-house": "Companies House",
    bureau: "Bureau",
    discovery: "Discovery",
    prompt: "Prompt",
    atlas: "Atlas",
  };
  return map[kind] ?? kind;
}
