/**
 * ContactSurface — maximum public surface for entity rows / cards.
 * Renders entity.contacts[] (API presented routes) plus column fallbacks.
 * Never hides organization routes.
 */
import { cn } from "@/lib/utils";
import { Phone, Mail, Link2, Building2, User, AlertTriangle } from "lucide-react";

export type ContactRouteView = {
  vectorType?: string;
  value?: string;
  source?: string;
  sourceUrl?: string | null;
  validationStatus?: string;
  mark?: "personal" | "organization" | "candidate" | string;
  label?: string;
  identityCollisionRisk?: boolean;
  contextType?: string | null;
  sourceReliability?: number | null;
  directnessScore?: number | null;
  independentCorroboration?: number | null;
  metadata?: string | null;
};

function telHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : `tel:${value}`;
}

function mailHref(value: string): string {
  return `mailto:${value}`;
}

function safeExternalHref(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function iconFor(vectorType: string, mark?: string) {
  if (vectorType === "phone") return Phone;
  if (vectorType === "email") return Mail;
  if (mark === "organization") return Building2;
  if (vectorType === "social") return Link2;
  return User;
}

function routeTier(route: ContactRouteView, boardMode = false): { label: string; title: string; color: string } {
  let context = String(route.contextType ?? "").toLowerCase().replace(/\s+/g, "_");
  if (!context && route.metadata) {
    try { const parsed = JSON.parse(route.metadata) as Record<string, unknown>; context = String(parsed.contextType ?? parsed.contactContext ?? "").toLowerCase().replace(/\s+/g, "_"); } catch {}
  }
  if (["restricted_context", "sensitive_context", "nonprofessional_context"].includes(context)) {
    return { label: boardMode ? "Not a route" : "NOT A ROUTE", title: "This context is not used for outreach ranking", color: boardMode ? "#74747A" : "#94a3b8" };
  }
  if (!boardMode) {
    if (route.mark === "organization") return { label: "PUBLIC COMPANY", title: "Generic corporate route; useful but low-exclusivity", color: "#a78bfa" };
    const verified = /verified|corroborated|accepted/i.test(String(route.validationStatus ?? ""));
    const professional = ["professional", "business", "public_professional", "public_business"].includes(context);
    if (route.mark === "personal" && verified && professional && (route.sourceReliability ?? 0) >= 0.7 && (route.directnessScore ?? 0) >= 0.7 && (route.independentCorroboration ?? 0) >= 1) return { label: "DIRECT PROFESSIONAL", title: "Verified public professional route", color: "#34d399" };
    return { label: "REVIEW", title: "Source context or attribution needs review", color: "#94a3b8" };
  }
  const validation = String(route.validationStatus ?? "").toLowerCase();
  if (/disputed|rejected/.test(validation)) return { label: "Disputed", title: "This public route carries a dispute or rejection note", color: "#C8321E" };
  if (/corroborated/.test(validation)) return { label: "Corroborated", title: "Independent sources support this public route", color: "#1D4FAE" };
  if (/verified|accepted/.test(validation)) return { label: "Verified", title: "This public route has recorded verification", color: "#17713E" };
  return { label: "In review", title: "Source context or attribution still needs review", color: "#7A5600" };
}

function markColor(mark?: string, boardMode = false): string {
  if (!boardMode) {
    if (mark === "personal") return "#34d399";
    if (mark === "organization") return "#a78bfa";
    return "#94a3b8";
  }
  if (mark === "personal") return "#1F8A4D";
  if (mark === "organization") return "#2757C6";
  return "#74747A";
}

export function ContactSurface({
  contacts,
  phone,
  email,
  linkedinUrl,
  phoneSource,
  evidenceCount,
  density = "row",
  boardMode = false,
  className,
}: {
  contacts?: ContactRouteView[] | null;
  phone?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  phoneSource?: string | null;
  evidenceCount?: number;
  density?: "row" | "card" | "mobile";
  boardMode?: boolean;
  className?: string;
}) {
  const routes: ContactRouteView[] = [];
  const seen = new Set<string>();
  const push = (r: ContactRouteView) => {
    const v = String(r.value ?? "").trim();
    if (!v || routeTier(r, boardMode).label === (boardMode ? "Not a route" : "NOT A ROUTE")) return;
    const key = `${String(r.vectorType ?? "other").toLowerCase()}|${v.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({ ...r, value: v });
  };

  // The presented contacts array is the authoritative UI surface. Raw entity
  // columns may be historical/candidate data and therefore must not silently
  // become a direct-looking route merely because this component received them.
  for (const c of contacts ?? []) push(c);

  // A phone column is safe to surface only when the API also supplies an
  // explicit provenance source. It remains a candidate/organization route.
  const phoneMark = (() => {
    const s = String(phoneSource ?? "");
    if (s === "EDGAR-Notice-Phone" || s === "EDGAR-Notice") return "candidate" as const;
    if (
      s === "agentic-web-org" ||
      s.endsWith("-org") ||
      s === "EDGAR-Phone" ||
      s === "EDGAR-Issuer-Phone" ||
      s === "CompaniesHouse-Phone"
    ) {
      return "organization" as const;
    }
    return "candidate" as const;
  })();
  const phoneLabel = (() => {
    const s = String(phoneSource ?? "");
    if (s === "EDGAR-Notice-Phone" || s === "EDGAR-Notice") return "Notice · lead";
    if (phoneMark === "organization") return `${s || "Org"} · company route`;
    return `${s || "Phone"} · lead`;
  })();
  if (phone && phoneSource) {
    push({ vectorType: "phone", value: phone, source: phoneSource, mark: phoneMark, label: phoneLabel });
  }

  // Do not render raw entity.email/linkedinUrl fallbacks here. Those columns
  // are not sufficient provenance for a current presented contact. If they are
  // useful, the server must expose them through contacts[] with an honest mark,
  // source and validation status.

  if (routes.length === 0) {
    const hasEvidence = (evidenceCount ?? 0) > 0;
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-white/10 px-2 py-1.5 text-[11px] text-slate-500",
          className,
        )}
        data-testid="contact-surface-empty"
      >
        {hasEvidence ? (
          <span>Evidence on file — review the profile evidence before using a route</span>
        ) : (
          <span>No public routes yet</span>
        )}
      </div>
    );
  }

  const primary = routes[0]!;
  const primaryTier = routeTier(primary, boardMode);
  const primaryTierPattern = primaryTier.label === "Verified" ? "supported" : primaryTier.label === "Corroborated" ? "corroborated" : primaryTier.label === "In review" ? "review" : null;
  const rest = routes.slice(1, density === "row" ? 4 : 8);
  const overflow = routes.length - 1 - rest.length;
  const PrimaryIcon = iconFor(String(primary.vectorType ?? ""), primary.mark);
  const primaryHref =
    primary.vectorType === "phone"
      ? telHref(primary.value!)
      : primary.vectorType === "email"
        ? mailHref(primary.value!)
        : safeExternalHref(primary.sourceUrl) || safeExternalHref(String(primary.value).startsWith("http") ? primary.value : undefined);

  const content = (
    <div
      className={cn("atlas-contact-surface-inner flex flex-col gap-1 min-w-0", className)}
      data-testid="contact-surface"
      data-route-count={routes.length}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <PrimaryIcon className="h-3.5 w-3.5 shrink-0 opacity-70" style={{ color: markColor(primary.mark, boardMode) }} />
        {primaryHref ? (
          <a
            href={primaryHref}
            className={cn(
              "truncate font-mono text-foreground hover:text-[#9CFF1A]",
              density === "card" ? "text-sm" : "text-xs",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {primary.value}
          </a>
        ) : (
          <span className={cn("truncate font-mono text-foreground", density === "card" ? "text-sm" : "text-xs")}>
            {primary.value}
          </span>
        )}
        {primary.identityCollisionRisk ? (
          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" aria-label="Identity collision risk" />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={boardMode ? "atlas-contact-route-mark" : "inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono"}
          style={boardMode ? { color: markColor(primary.mark, boardMode) } : { color: markColor(primary.mark, boardMode), background: markColor(primary.mark, boardMode) + "22" }}
        >
          {primary.label || primary.mark || primary.vectorType}
        </span>
        {boardMode && primaryTierPattern && <span className={"atlas-evidence-pattern is-" + primaryTierPattern} aria-hidden="true" />}
        {boardMode && primaryTier.label === "Disputed" && <AlertTriangle className="atlas-evidence-disputed-mark" aria-hidden="true" />}
        <span
          className={boardMode ? "atlas-contact-route-status" : "inline-flex items-center rounded border border-white/10 px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground"}
          style={boardMode ? { color: primaryTier.color } : undefined}
          title={primaryTier.title}
        >{primaryTier.label}</span>
        {primary.source && primary.source !== "entity" ? (
          <span className="truncate text-[10px] text-muted-foreground max-w-[120px]" title={primary.source}>
            {primary.source}
          </span>
        ) : null}
        {rest.map((r, i) => {
          const href =
            r.vectorType === "phone"
              ? telHref(r.value!)
              : r.vectorType === "email"
                ? mailHref(r.value!)
                : safeExternalHref(r.sourceUrl);
          const tier = routeTier(r, boardMode);
          const pattern = tier.label === "Verified" ? "supported" : tier.label === "Corroborated" ? "corroborated" : tier.label === "In review" ? "review" : null;
          if (boardMode) {
            return (
              <span key={`${r.vectorType}-${r.value}-${i}`} className="atlas-contact-route-secondary" title={`${tier.title} · ${r.source || ""}`}>
                {href ? <a href={href} onClick={(e) => e.stopPropagation()}>{r.value}</a> : <span>{r.value}</span>}
                {pattern && <span className={"atlas-evidence-pattern is-" + pattern} aria-hidden="true" />}
                {tier.label === "Disputed" && <AlertTriangle className="atlas-evidence-disputed-mark" aria-hidden="true" />}
                <small style={{ color: tier.color }}>{tier.label}</small>
              </span>
            );
          }
          return (
            <span
              key={`${r.vectorType}-${r.value}-${i}`}
              className="inline-flex max-w-[140px] items-center gap-0.5 truncate rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-mono text-slate-300"
              title={`${r.label || r.mark} · ${r.source || ""}`}
            >
              {href ? (
                <a href={href} className="truncate hover:text-[#9CFF1A]" onClick={(e) => e.stopPropagation()}>
                  {r.value}
                </a>
              ) : (
                <span className="truncate">{r.value}</span>
              )}
            </span>
          );
        })}
        {overflow > 0 ? (
          <span className="text-[10px] text-muted-foreground">+{overflow}</span>
        ) : null}
      </div>
    </div>
  );
  return content;
}
