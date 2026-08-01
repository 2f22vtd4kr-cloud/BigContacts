import type { InsertResearchEvidence } from "@workspace/db";
import type { HybridSearchMeta } from "./hybrid-search";

type PathNode = {
  label?: string;
  role?: string;
  registry?: string;
  contactConfidence?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

type MctsStep = {
  action?: string;
  target?: string;
  targetType?: string;
  registry?: string;
  warmthScore?: number;
  reasoning?: string;
};

export function buildResearchEvidenceRows(input: {
  sessionId: number;
  entityId: number;
  targetName: string;
  path: PathNode[];
  steps: MctsStep[];
  hybridMeta?: Partial<HybridSearchMeta>;
  reachability?: { status?: string; score?: number; reasons?: string[]; blockers?: string[] };
}): InsertResearchEvidence[] {
  const rows: InsertResearchEvidence[] = [];
  const add = (row: Omit<InsertResearchEvidence, "sessionId" | "entityId">) => {
    rows.push({
      ...row,
      sessionId: input.sessionId,
      entityId: input.entityId,
    });
  };

  add({
    claimType: "identity",
    claim: `Research target is ${input.targetName}`,
    value: input.targetName,
    sourceName: "Apex Atlas target record",
    status: "review",
    confidence: 0.5,
    metadata: JSON.stringify({ basis: "selected_entity" }),
  });

  for (const node of input.path) {
    const confidence = Math.max(0, Math.min(1, (node.contactConfidence ?? 0) / 100));
    add({
      claimType: node.role === "GATEKEEPER" ? "access" : "relationship",
      claim: `${node.role ?? "PATH"} candidate: ${node.label ?? "unlabelled node"}`,
      value: node.label ?? null,
      sourceName: node.registry ?? "Graph path",
      status: confidence >= 0.7 ? "supported" : "review",
      confidence: confidence || 0.35,
      metadata: JSON.stringify({
        role: node.role ?? null,
        contactEmail: node.contactEmail ?? null,
        contactPhone: node.contactPhone ?? null,
        registry: node.registry ?? null,
      }),
    });
  }

  for (const step of input.steps) {
    add({
      claimType: "process",
      claim: step.reasoning || `${step.action ?? "Research step"} → ${step.target ?? "unknown target"}`,
      value: step.target ?? null,
      sourceName: step.registry ?? "MCTS",
      status: (step.warmthScore ?? 0) >= 0.7 ? "supported" : "review",
      confidence: Math.max(0, Math.min(1, step.warmthScore ?? 0)),
      metadata: JSON.stringify({ action: step.action ?? null, targetType: step.targetType ?? null }),
    });
  }

  if (input.hybridMeta) {
    add({
      claimType: "process",
      claim: `Retrieval returned ${input.hybridMeta.totalCandidates ?? 0} candidate records`,
      value: String(input.hybridMeta.totalCandidates ?? 0),
      sourceName: "Apex Atlas hybrid retrieval",
      status: (input.hybridMeta.totalCandidates ?? 0) > 0 ? "supported" : "review",
      confidence: (input.hybridMeta.totalCandidates ?? 0) > 0 ? 0.75 : 0.25,
      metadata: JSON.stringify(input.hybridMeta),
    });
  }

  if (input.reachability) {
    const status = input.reachability.status === "reachable" ? "supported" : "review";
    add({
      claimType: "access",
      claim: `Reachability preflight: ${input.reachability.status ?? "unknown"}`,
      value: input.reachability.status ?? null,
      sourceName: "Apex Atlas reachability preflight",
      status,
      confidence: Math.max(0, Math.min(1, (input.reachability.score ?? 0) / 100)),
      rejectionReason: input.reachability.blockers?.join("; ") || null,
      metadata: JSON.stringify({
        reasons: input.reachability.reasons ?? [],
        blockers: input.reachability.blockers ?? [],
      }),
    });
  }

  return rows;
}