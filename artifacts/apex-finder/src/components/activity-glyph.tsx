/**
 * Motion glyphs for live research steps — visual “what’s happening”
 * alongside plain-language Now:/Done: stories. Respects reduced motion.
 */
import React from "react";
import {
  Search,
  Globe2,
  Building2,
  Mail,
  Sparkles,
  Users,
  FileSearch,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { motionOrNone, prefersReducedMotion, REACTOR_SHIMMER_MS } from "../lib/reactor-motion";

export type ActivityKind =
  | "google"
  | "browser"
  | "prompt"
  | "domain"
  | "footprint"
  | "serp"
  | "bureau";

type Props = {
  kind: ActivityKind;
  live?: boolean;
  terminal?: "done" | "failed" | null;
  size?: number;
  className?: string;
};

function ringColor(live?: boolean, terminal?: "done" | "failed" | null) {
  if (terminal === "failed") return "rgba(251,113,133,0.55)";
  if (terminal === "done") return "rgba(52,211,153,0.55)";
  if (live) return "rgba(34,211,238,0.55)";
  return "rgba(148,163,184,0.35)";
}

function iconColor(live?: boolean, terminal?: "done" | "failed" | null) {
  if (terminal === "failed") return "#fda4af";
  if (terminal === "done") return "#6ee7b7";
  if (live) return "#67e8f9";
  return "#94a3b8";
}

function pickIcon(kind: ActivityKind, terminal?: "done" | "failed" | null) {
  if (terminal === "failed") return XCircle;
  if (terminal === "done") return CheckCircle2;
  switch (kind) {
    case "google":
    case "serp":
      return Search;
    case "browser":
      return Globe2;
    case "domain":
      return FileSearch;
    case "prompt":
      return Sparkles;
    case "footprint":
      return Users;
    case "bureau":
      return Building2;
    default:
      return Search;
  }
}

/**
 * Circular activity badge: icon + optional live orbit / pulse.
 */
export function ActivityGlyph({ kind, live, terminal, size = 28, className = "" }: Props) {
  const Icon = pickIcon(kind, terminal);
  const reduced = prefersReducedMotion();
  const color = iconColor(live, terminal);
  const ring = ringColor(live, terminal);
  const iconSize = Math.max(12, Math.round(size * 0.48));
  const isLiveMotion = !!live && !terminal && !reduced;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
      data-testid={`activity-glyph-${kind}`}
      data-live={live ? "true" : "false"}
      data-terminal={terminal || undefined}
    >
      {/* outer ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: `1.5px solid ${ring}`,
          boxShadow: live && !terminal ? `0 0 12px ${ring}` : undefined,
          animation: isLiveMotion
            ? motionOrNone(`activityPulse ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`)
            : "none",
        }}
      />
      {/* orbit pip while live */}
      {isLiveMotion && (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            animation: motionOrNone("activityOrbit 2.4s linear infinite"),
          }}
        >
          <span
            className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
        </span>
      )}
      <Icon
        style={{
          width: iconSize,
          height: iconSize,
          color,
          animation:
            isLiveMotion && (kind === "google" || kind === "serp")
              ? motionOrNone("activityNudge 1.2s ease-in-out infinite")
              : isLiveMotion && kind === "prompt"
                ? motionOrNone("activityNudge 1.6s ease-in-out infinite")
                : "none",
        }}
        strokeWidth={2.25}
      />
    </span>
  );
}

/** Compact inline status for chips — tiny glyph, no orbit */
export function ActivityGlyphMini({
  kind,
  live,
  terminal,
}: {
  kind: ActivityKind;
  live?: boolean;
  terminal?: "done" | "failed" | null;
}) {
  const Icon = pickIcon(kind, terminal);
  const color = iconColor(live, terminal);
  return (
    <Icon
      aria-hidden
      style={{ width: 12, height: 12, color, flexShrink: 0 }}
      strokeWidth={2.5}
    />
  );
}
