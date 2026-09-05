/**
 * Single operator-facing progress model for Atlas.
 * Avoid dual language: "[3/9] cooking" vs "Phase 8/10 J4-J9".
 *
 * Canonical:
 *   discovery: D{step}/{total} · {label}
 *   dig:       Dig · {target} · {stage}
 *   batch:     Registry · {label} · batch {n}
 */

export type AtlasProgressKind = "discovery" | "registry" | "dig" | "phase" | "idle";

export function formatAtlasProgress(input: {
  kind?: AtlasProgressKind;
  /** Preferred 1-based step index for discovery/registry maps */
  step?: number | null;
  stepTotal?: number | null;
  /** Pipeline phase 1..N when kind=phase */
  phase?: number | null;
  phaseTotal?: number | null;
  label?: string | null;
  targetName?: string | null;
  stage?: string | null;
}): string {
  const label = (input.label || input.stage || "").replace(/\s+/g, " ").trim();
  const target = (input.targetName || "").trim();
  const kind = input.kind || "phase";

  if (kind === "idle") return "Idle";

  if (kind === "dig" || target) {
    const stage = label || input.stage || "research";
    return target ? `Dig · ${target} · ${stage}` : `Dig · ${stage}`;
  }

  if (kind === "discovery" || kind === "registry") {
    const step = input.step ?? input.phase;
    const total = input.stepTotal ?? input.phaseTotal ?? 9;
    const head =
      step != null && Number.isFinite(Number(step))
        ? `${kind === "registry" ? "Registry" : "Discovery"} ${step}/${total}`
        : kind === "registry"
          ? "Registry"
          : "Discovery";
    return label ? `${head} · ${label}` : head;
  }

  // phase
  const phase = input.phase;
  const phaseTotal = input.phaseTotal ?? 10;
  if (phase != null && Number.isFinite(Number(phase))) {
    return label ? `Phase ${phase}/${phaseTotal} · ${label}` : `Phase ${phase}/${phaseTotal}`;
  }
  return label || "Working";
}

/** Rewrite legacy dual messages into one line (display-only). */
export function normalizeAtlasStatusMessage(raw: string | null | undefined): string {
  if (!raw) return "";
  let t = String(raw).replace(/\s+/g, " ").trim();
  // Drop emoji noise for status plane
  t = t.replace(/[🍳🤖]+/g, "").trim();
  // If both Phase N/M and [n/9] appear, prefer Dig/Discovery rewrite
  const phase = t.match(/Phase\s+(\d+)\s*\/\s*(\d+)/i);
  const bracket = t.match(/\[(\d+)\s*\/\s*(\d+)\]/);
  const cook = t.match(/:\s*([^·\[]{2,80})$/);
  if (bracket && /EDGAR|CH|BRREG|BODACC|Nordic|golf|shipping/i.test(t)) {
    return formatAtlasProgress({
      kind: "registry",
      step: Number(bracket[1]),
      stepTotal: Number(bracket[2]),
      label: t.replace(/\s*\[\d+\s*\/\s*\d+\]\s*/g, " ").replace(/^Phase\s+\d+\/\d+:\s*/i, "").trim().slice(0, 120),
    });
  }
  if (bracket && cook) {
    const name = cook[1].replace(/\.\.\.$/, "").trim();
    if (name.length > 2 && !/batch/i.test(name)) {
      return formatAtlasProgress({ kind: "dig", targetName: name, stage: "research" });
    }
  }
  if (phase && /J\d|pass|agentic|dig/i.test(t)) {
    return formatAtlasProgress({
      kind: "dig",
      stage: t.replace(/^Phase\s+\d+\/\d+:\s*/i, "").slice(0, 100),
    });
  }
  if (phase) {
    return formatAtlasProgress({
      kind: "phase",
      phase: Number(phase[1]),
      phaseTotal: Number(phase[2]),
      label: t.replace(/^Phase\s+\d+\/\d+:\s*/i, "").slice(0, 100),
    });
  }
  return t.slice(0, 200);
}
