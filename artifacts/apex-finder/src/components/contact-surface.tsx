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
};

function telHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : `tel:${value}`;
}

function mailHref(value: string): string {
  return `mailto:${value}`;
}

function iconFor(vectorType: string, mark?: string) {
  if (vectorType === "phone") return Phone;
  if (vectorType === "email") return Mail;
  if (mark === "organization") return Building2;
  if (vectorType === "social") return Link2;
  return User;
}

function markColor(mark?: string): string {
  if (mark === "personal") return "#34d399";
  if (mark === "organization") return "#a78bfa";
  return "#94a3b8";
}

export function ContactSurface({
  contacts,
  phone,
  email,
  linkedinUrl,
  phoneSource,
  evidenceCount,
  density = "row",
  className,
  onRehydrate,
}: {
  contacts?: ContactRouteView[] | null;
  phone?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  phoneSource?: string | null;
  evidenceCount?: number;
  density?: "row" | "card" | "mobile";
  className?: string;
  onRehydrate?: () => void;
}) {
  const routes: ContactRouteView[] = [];
  const seen = new Set<string>();
  const push = (r: ContactRouteView) => {
    const v = String(r.value ?? "").trim();
    if (!v) return;
    const key = `${String(r.vectorType ?? "other").toLowerCase()}|${v.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({ ...r, value: v });
  };

  for (const c of contacts ?? []) push(c);
  if (phone) push({ vectorType: "phone", value: phone, source: phoneSource ?? "entity", mark: "candidate", label: phoneSource || "Phone" });
  if (email) push({ vectorType: "email", value: email, source: "entity", mark: "candidate", label: "Email" });
  if (linkedinUrl) push({ vectorType: "social", value: linkedinUrl, source: "entity", mark: "candidate", label: "LinkedIn", sourceUrl: linkedinUrl });

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
          <button
            type="button"
            onClick={onRehydrate}
            className="text-left text-[#9CFF1A]/90 underline-offset-2 hover:underline"
          >
            Evidence on file — rehydrate card
          </button>
        ) : (
          <span>No public routes yet</span>
        )}
      </div>
    );
  }

  const primary = routes[0]!;
  const rest = routes.slice(1, density === "row" ? 4 : 8);
  const overflow = routes.length - 1 - rest.length;
  const PrimaryIcon = iconFor(String(primary.vectorType ?? ""), primary.mark);
  const primaryHref =
    primary.vectorType === "phone"
      ? telHref(primary.value!)
      : primary.vectorType === "email"
        ? mailHref(primary.value!)
        : primary.sourceUrl || (String(primary.value).startsWith("http") ? primary.value : undefined);

  return (
    <div
      className={cn("flex flex-col gap-1 min-w-0", className)}
      data-testid="contact-surface"
      data-route-count={routes.length}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <PrimaryIcon className="h-3.5 w-3.5 shrink-0 opacity-70" style={{ color: markColor(primary.mark) }} />
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
          className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono"
          style={{ color: markColor(primary.mark), background: markColor(primary.mark) + "22" }}
        >
          {primary.label || primary.mark || primary.vectorType}
        </span>
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
                : r.sourceUrl || undefined;
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
}
