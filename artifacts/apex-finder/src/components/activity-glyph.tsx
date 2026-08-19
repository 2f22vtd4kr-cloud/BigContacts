/**
 * Activity glyphs — quiet, aligned status marks for live research steps.
 * Icon = class of work. Color = Now / Done / Failed.
 * No orbiting dots, no layout-shifting pulse.
 */
import React from "react";
import {
  Search,
  Globe2,
  Building2,
  Sparkles,
  Users,
  FileSearch,
  Crown,
  NotebookPen,
  Landmark,
  UserCog,
} from "lucide-react";
import { prefersReducedMotion, motionOrNone, REACTOR_SHIMMER_MS } from "../lib/reactor-motion";

export type ActivityKind =
  | "google"
  | "browser"
  | "prompt"
  | "domain"
  | "footprint"
  | "serp"
  | "bureau"
  | "boss"
  | "case"
  | "registry"
  | "persona";

type Props = {
  kind: ActivityKind;
  live?: boolean;
  terminal?: "done" | "failed" | null;
  size?: number;
  className?: string;
};

type Tone = "live" | "done" | "failed" | "idle";

function toneOf(live?: boolean, terminal?: "done" | "failed" | null): Tone {
  if (terminal === "failed") return "failed";
  if (terminal === "done") return "done";
  if (live) return "live";
  return "idle";
}

const TONE = {
  live: {
    fg: "#67e8f9",
    border: "rgba(234, 179, 8, 0.45)",
    bg: "rgba(234, 179, 8, 0.08)",
    glow: "0 0 0 1px rgba(234, 179, 8, 0.12)",
  },
  done: {
    fg: "#6ee7b7",
    border: "rgba(52, 211, 153, 0.4)",
    bg: "rgba(52, 211, 153, 0.08)",
    glow: "none",
  },
  failed: {
    fg: "#fda4af",
    border: "rgba(251, 113, 133, 0.4)",
    bg: "rgba(251, 113, 133, 0.08)",
    glow: "none",
  },
  idle: {
    fg: "#94a3b8",
    border: "rgba(148, 163, 184, 0.28)",
    bg: "rgba(148, 163, 184, 0.06)",
    glow: "none",
  },
} as const;

function pickIcon(kind: ActivityKind) {
  switch (kind) {
    case "google":
    case "serp":
      return Search;
    case "browser":
      return Globe2;
    case "domain":
      return FileSearch;
    case "boss":
      return Crown;
    case "case":
      return NotebookPen;
    case "registry":
      return Landmark;
    case "persona":
      return UserCog;
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
 * Fixed 1:1 circular mark. Icon stays centered; live uses a soft opacity
 * breathe on the *fill only* (no scale, no orbit, no translate).
 */
export function ActivityGlyph({ kind, live, terminal, size = 32, className = "" }: Props) {
  const Icon = pickIcon(kind);
  const tone = toneOf(live, terminal);
  const t = TONE[tone];
  const reduced = prefersReducedMotion();
  const iconSize = Math.round(size * 0.44);
  const breathe =
    tone === "live" && !reduced
      ? motionOrNone(`activityFillBreathe ${REACTOR_SHIMMER_MS * 1.2}ms ease-in-out infinite`)
      : "none";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "999px",
        border: `1px solid ${t.border}`,
        background: t.bg,
        boxShadow: t.glow,
        animation: breathe,
        // lock geometry so animation never shifts layout
        boxSizing: "border-box",
      }}
      aria-hidden
      data-testid={`activity-glyph-${kind}`}
      data-tone={tone}
    >
      <Icon
        width={iconSize}
        height={iconSize}
        color={t.fg}
        strokeWidth={2}
        absoluteStrokeWidth
        style={{ display: "block", flexShrink: 0 }}
      />
    </span>
  );
}

/** Chip-scale icon — same mapping, no frame */
export function ActivityGlyphMini({
  kind,
  live,
  terminal,
}: {
  kind: ActivityKind;
  live?: boolean;
  terminal?: "done" | "failed" | null;
}) {
  const Icon = pickIcon(kind);
  const tone = toneOf(live, terminal);
  const t = TONE[tone];
  return (
    <Icon
      aria-hidden
      width={12}
      height={12}
      color={t.fg}
      strokeWidth={2.25}
      absoluteStrokeWidth
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}
