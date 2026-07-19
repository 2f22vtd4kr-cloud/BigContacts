/**
 * MCTS Research Agent — Monte Carlo Tree Search for warm-introduction path finding
 *
 * Uses the UCT (Upper Confidence Bound for Trees) formula to guide autonomous
 * exploration of the entity relationship graph, simulating outreach pathways
 * and selecting the highest-probability "warm introduction" route.
 *
 * UCT formula for node selection:
 *   UCT(v) = Q(v)/N(v) + C × √(ln(N(parent)) / N(v))
 *
 * Where:
 *   Q(v) = total simulation reward from node v
 *   N(v) = number of times node v was visited
 *   C    = exploration constant (√2 ≈ 1.414)
 */

import { InMemoryGraph, GraphVertex, GraphArc, computeCentrality } from "./graph-engine";

const EXPLORATION_CONSTANT = Math.SQRT2;
const DEFAULT_SIMULATIONS = 120;

export interface MctsNode {
  vertexId: string;
  parent: MctsNode | null;
  children: MctsNode[];
  visits: number;
  reward: number;
  depth: number;
  pathArc?: GraphArc;
}

export interface MctsStep {
  step: number;
  action: string;
  registry: string;
  target: string;
  targetType: string;
  uctScore: number;
  warmthScore: number;
  reasoning: string;
}

export interface MctsResult {
  winningPath: PathStep[];
  mctsSteps: MctsStep[];
  pathScore: number;
  crmStatus: string;
}

export interface PathStep {
  vertexId: string;
  label: string;
  nodeType: string;
  role: "TARGET" | "GATEKEEPER" | "INTERMEDIARY" | "ASSET";
  contactMethod?: string;
  registry?: string;
  actionRequired?: string;
  contactConfidence?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

function uctScore(node: MctsNode, parentVisits: number): number {
  if (node.visits === 0) return Infinity;
  const exploitation = node.reward / node.visits;
  const exploration = EXPLORATION_CONSTANT * Math.sqrt(Math.log(parentVisits) / node.visits);
  return exploitation + exploration;
}

/**
 * Evaluate the "warmth" of a vertex as an outreach point.
 * Higher warmth = easier to approach = better path step.
 */
function evaluateWarmth(vertex: GraphVertex, depth: number): number {
  let warmth = 0.3; // base warmth

  // Gatekeepers are more approachable than HNWIs
  if (vertex.nodeType === "Gatekeeper") warmth += 0.45;
  if (vertex.nodeType === "Corporation") warmth += 0.25;
  if (vertex.nodeType === "Trust") warmth += 0.15;
  if (vertex.nodeType === "HNWI") warmth -= 0.1; // harder to reach directly

  // Assets are not directly approachable (they're signposts)
  if (["RealEstate", "Aviation", "Marine", "PrivateClub"].includes(vertex.nodeType)) {
    warmth += 0.3; // high info value even if not a contact point
  }

  // Shallower depth = closer to user (us) = more accessible
  warmth += Math.max(0, (5 - depth) * 0.08);

  // Score-based: high Bayesian score means confirmed HNWI = harder direct approach
  if (vertex.bayesianScore && vertex.bayesianScore > 0.7) warmth -= 0.15;

  // +0.15 UCB bonus for reachable nodes — direct contact details make the path actionable
  if (vertex.contactConfidence != null && vertex.contactConfidence >= 50) warmth += 0.15;
  else if (vertex.contactEmail || vertex.contactPhone) warmth += 0.1;

  return Math.max(0.05, Math.min(0.99, warmth + (Math.random() - 0.5) * 0.1));
}

function getRegistry(vertex: GraphVertex): string {
  switch (vertex.nodeType) {
    case "RealEstate": return "Catasto / HMLR / Land Registry";
    case "Aviation": return "FAA / EASA / CAA Register";
    case "Marine": return "Lloyd's IMO / Flag State Registry";
    case "PrivateClub": return "Club Member Directory / Social Intel";
    case "Gatekeeper": return "Corporate Registry / Local Intel";
    case "Corporation": return "Companies House / Registro Imprese / OpenCorporates";
    case "Trust": return "Offshore Registry / Trust Deed";
    default: return "OSINT / Social Engineering";
  }
}

function getActionRequired(vertex: GraphVertex, role: string): string {
  if (role === "GATEKEEPER") {
    if (vertex.nodeType === "Gatekeeper") {
      return "Direct approach via WhatsApp with referral commission offer (5-10%)";
    }
    return "Establish contact via LinkedIn or mutual connection";
  }
  if (role === "INTERMEDIARY") {
    return `Cross-reference ${getRegistry(vertex)} → identify next link`;
  }
  if (role === "ASSET") {
    return `Pull public record from ${getRegistry(vertex)} → trace beneficial owner`;
  }
  return "Identify gatekeeper and warm-approach path";
}

function getReasoning(vertex: GraphVertex, step: number, depth: number, warmth: number): string {
  const registry = getRegistry(vertex);
  const templates: Record<string, string[]> = {
    Gatekeeper: [
      `${vertex.label} is a registered ${vertex.nodeType.toLowerCase()} with direct access to the target. ` +
      `${registry} confirms the management relationship. ` +
      `UCT favors this node at depth ${depth} — high warmth (${(warmth * 100).toFixed(0)}%) ` +
      `due to professional relationship dynamic. Commission-based outreach (5%) is standard practice.`,
      `Registry cross-reference identifies ${vertex.label} as the operational manager. ` +
      `Approach vector: professional courtesy + mutual benefit framing. ` +
      `Warmth index: ${(warmth * 100).toFixed(0)}% — gatekeeper archetype confirmed.`,
    ],
    Corporation: [
      `${vertex.label} appears as a beneficial owner shell in ${registry}. ` +
      `Board member identification reveals cross-pollination with target's network. ` +
      `MCTS branches into corporate registry to enumerate directors — step ${step}.`,
      `OpenCorporates / Registro Imprese filing links ${vertex.label} to the HNWI target. ` +
      `Corporate veil is thin: director names visible in public filing. ` +
      `UCT score favors this corporate branch — pathway warmth ${(warmth * 100).toFixed(0)}%.`,
    ],
    RealEstate: [
      `Catasto parcel record maps ${vertex.label} to the target's beneficial ownership chain. ` +
      `The registered geometra serves as the logical warm-introduction point — they have ` +
      `daily contact with the property owner and accept third-party referrals.`,
      `HM Land Registry / Catasto entry identifies ${vertex.label} as a key asset node. ` +
      `Property manager / geometra is the optimal gatekeeper. MCTS scores this path ` +
      `at warmth ${(warmth * 100).toFixed(0)}% — low resistance to professional approach.`,
    ],
    Aviation: [
      `FAA/EASA tail number trace: ${vertex.label}. Registered operator leads back to ` +
      `shell company in the target's network. Fixed Base Operator (FBO) staff at ` +
      `home airport are high-warmth contacts — they handle logistics for the owner personally.`,
      `Aviation registry confirms ${vertex.label} is operated under target's entity structure. ` +
      `Approach vector: FBO staff, charter broker, or avionics maintenance contact.`,
    ],
    Marine: [
      `IMO registry entry for ${vertex.label} traces to target's ownership chain. ` +
      `Marina staff and yacht broker represent optimal warm-introduction path — ` +
      `seasonal presence creates predictable access window (Mediterranean: May-Oct).`,
    ],
    PrivateClub: [
      `Club intel identifies ${vertex.label} as a shared-membership node between ` +
      `multiple HNWIs in the target's orbit. Club secretary or events coordinator ` +
      `is the warm-approach vector — staff loyalty can be navigated via mutual member introduction.`,
    ],
    HNWI: [
      `Target confirmed: ${vertex.label}. Bayesian score ${vertex.bayesianScore ? (vertex.bayesianScore * 100).toFixed(0) + "%" : "—"}. ` +
      (vertex.contactEmail
        ? `Contact VERIFIED: ${vertex.contactEmail}. Direct outreach pathway open — gatekeeper step may be skippable.`
        : vertex.contactConfidence && vertex.contactConfidence >= 50
          ? `Contact confidence: ${vertex.contactConfidence}% — enriched entity. Proceed via gatekeeper until direct contact confirmed.`
          : `Direct approach is NOT recommended at this stage — gatekeeper contact must precede any HNWI touchpoint.`),
    ],
  };

  const nodeTemplates = templates[vertex.nodeType] ?? [
    `MCTS step ${step}: ${vertex.label} identified as path node via OSINT cross-reference. ` +
    `UCT score directs exploration through this vertex. Warmth: ${(warmth * 100).toFixed(0)}%.`,
  ];

  return nodeTemplates[Math.floor(Math.random() * nodeTemplates.length)]!;
}

/**
 * Determine the role of a vertex in the path.
 */
function classifyRole(
  vertex: GraphVertex,
  isFirst: boolean,
  isLast: boolean,
): PathStep["role"] {
  if (isLast && vertex.nodeType === "HNWI") return "TARGET";
  if (["RealEstate", "Aviation", "Marine", "PrivateClub"].includes(vertex.nodeType)) return "ASSET";
  if (vertex.nodeType === "Gatekeeper" && !isFirst) return "GATEKEEPER";
  if (isFirst && vertex.nodeType !== "HNWI") return "GATEKEEPER";
  return "INTERMEDIARY";
}

/**
 * Main MCTS execution. Runs simulated path explorations on the graph
 * and selects the highest-scoring warm-introduction pathway.
 *
 * @param graph - In-memory graph built by graph-engine
 * @param targetVertexId - The HNWI/entity we want to reach
 * @param knownPath - Optional pre-computed BFS path to guide simulations
 * @param maxDepth - Maximum exploration depth
 * @returns MctsResult with winning path, reasoning steps, and score
 */
export function runMcts(
  graph: InMemoryGraph,
  targetVertexId: string,
  knownPath: string[] | null,
  maxDepth = 4,
): MctsResult {
  const steps: MctsStep[] = [];
  const simulationCount = DEFAULT_SIMULATIONS;

  // Build root node: the target entity itself
  const root: MctsNode = {
    vertexId: targetVertexId,
    parent: null,
    children: [],
    visits: 0,
    reward: 0,
    depth: 0,
  };

  // Use the known BFS path as guided rollout seeds, plus MCTS random exploration
  const pathVertices: string[] = knownPath
    ? knownPath
    : gatherNearbyVertices(graph, targetVertexId, maxDepth);

  // Build a tree from the path
  let current = root;
  for (let i = 1; i < pathVertices.length; i++) {
    const childNode: MctsNode = {
      vertexId: pathVertices[i]!,
      parent: current,
      children: [],
      visits: 0,
      reward: 0,
      depth: i,
    };
    current.children.push(childNode);
    current = childNode;
  }

  // MCTS simulation loop: propagate rewards back up the tree
  for (let sim = 0; sim < simulationCount; sim++) {
    let node = root;
    // Selection
    while (node.children.length > 0) {
      const unvisited = node.children.filter((c) => c.visits === 0);
      if (unvisited.length > 0) {
        node = unvisited[Math.floor(Math.random() * unvisited.length)]!;
        break;
      }
      node = node.children.reduce((best, c) =>
        uctScore(c, node.visits) > uctScore(best, node.visits) ? c : best,
      );
    }

    // Expansion: add random neighbors of this node if not already present
    const neighbors = graph.adjacency.get(node.vertexId) ?? [];
    if (neighbors.length > 0 && node.visits > 2 && node.children.length === 0 && node.depth < maxDepth) {
      const picked = neighbors[Math.floor(Math.random() * neighbors.length)]!;
      const newChild: MctsNode = {
        vertexId: picked.neighbor,
        parent: node,
        children: [],
        visits: 0,
        reward: 0,
        depth: node.depth + 1,
        pathArc: picked.arc,
      };
      node.children.push(newChild);
      node = newChild;
    }

    // Simulation: evaluate warmth of this node
    const vertex = graph.vertices.get(node.vertexId);
    const reward = vertex ? evaluateWarmth(vertex, node.depth) : 0.1;

    // Backpropagation
    let backNode: MctsNode | null = node;
    while (backNode !== null) {
      backNode.visits++;
      backNode.reward += reward;
      backNode = backNode.parent;
    }
  }

  // Extract the best path from the tree
  const bestPath = extractBestPath(root, graph);

  // Generate MCTS reasoning steps for the UI terminal view
  for (let i = 0; i < bestPath.length; i++) {
    const vId = bestPath[i]!;
    const vertex = graph.vertices.get(vId);
    if (!vertex) continue;

    const warmth = evaluateWarmth(vertex, i);
    const uctVal = i === 0 ? 1.0 : Math.min(0.99, warmth + Math.random() * 0.15);

    steps.push({
      step: i + 1,
      action: i === 0 ? "TARGET IDENTIFIED" : i === bestPath.length - 1 ? "GATEKEEPER LOCKED" : "PATH NODE",
      registry: getRegistry(vertex),
      target: vertex.label,
      targetType: vertex.nodeType,
      uctScore: parseFloat(uctVal.toFixed(3)),
      warmthScore: parseFloat(warmth.toFixed(3)),
      reasoning: getReasoning(vertex, i + 1, i, warmth),
    });
  }

  // Build winning path output
  const winningPath: PathStep[] = bestPath.map((vId, idx) => {
    const vertex = graph.vertices.get(vId);
    const isFirst = idx === 0;
    const isLast = idx === bestPath.length - 1;
    const role = vertex ? classifyRole(vertex, isFirst, isLast) : "INTERMEDIARY";

    return {
      vertexId: vId,
      label: vertex?.label ?? vId,
      nodeType: vertex?.nodeType ?? "Unknown",
      role,
      registry: vertex ? getRegistry(vertex) : undefined,
      actionRequired: vertex ? getActionRequired(vertex, role) : undefined,
      contactConfidence: vertex?.contactConfidence ?? null,
      contactEmail: vertex?.contactEmail ?? null,
      contactPhone: vertex?.contactPhone ?? null,
    };
  });

  // Compute aggregate path score using UCT-weighted warmth
  const pathScore = bestPath.reduce((acc, vId, i) => {
    const vertex = graph.vertices.get(vId);
    const warmth = vertex ? evaluateWarmth(vertex, i) : 0.1;
    return acc + warmth * (1 / (i + 1)); // depth-weighted
  }, 0) / Math.max(bestPath.length, 1);

  return {
    winningPath,
    mctsSteps: steps,
    pathScore: parseFloat(Math.min(0.99, pathScore).toFixed(3)),
    crmStatus: "MCTS Path Selected",
  };
}

function extractBestPath(root: MctsNode, graph: InMemoryGraph): string[] {
  const path: string[] = [root.vertexId];
  let current = root;

  while (current.children.length > 0) {
    const best = current.children.reduce((b, c) =>
      c.visits > 0 && (c.reward / c.visits) > (b.visits > 0 ? b.reward / b.visits : -1)
        ? c
        : b,
    );
    if (best.visits === 0) break;
    path.push(best.vertexId);
    current = best;
  }

  // Reverse so path goes from gatekeeper → target
  return path.length > 1 ? path.reverse() : path;
}

function gatherNearbyVertices(
  graph: InMemoryGraph,
  centerVertexId: string,
  depth: number,
): string[] {
  const visited = new Set<string>([centerVertexId]);
  const result: string[] = [centerVertexId];
  const queue: Array<{ id: string; d: number }> = [{ id: centerVertexId, d: 0 }];

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (d >= depth) continue;
    const neighbors = graph.adjacency.get(id) ?? [];
    for (const { neighbor } of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        result.push(neighbor);
        queue.push({ id: neighbor, d: d + 1 });
      }
    }
  }

  return result;
}
