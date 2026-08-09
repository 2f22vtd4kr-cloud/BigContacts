import { describe, expect, it } from "vitest";
import { buildGraph, extractSubgraph, findShortestPath, forwardArc } from "../lib/graph-engine";

describe("graph provenance", () => {
  it("raises edge quality for cited verified relationships", () => {
    const graph = buildGraph(
      [
        { id: 1, name: "Target", type: "HNWI", bayesianScore: 0.8 },
        { id: 2, name: "Gatekeeper", type: "Gatekeeper", bayesianScore: 0.4 },
      ],
      [],
      [{
        id: 1,
        sourceEntityId: 1,
        targetId: 2,
        targetType: "Entity",
        relationshipType: "KNOWN_ASSOCIATE",
        strength: 0.7,
        notes: "Verified in official filing. Source: https://example.org/filing",
      }],
    );

    const arc = graph.adjacency.get("e:1")?.[0]?.arc;
    expect(arc?.evidenceStatus).toBe("supported");
    expect(arc?.citationCount).toBe(2);
    expect(arc?.provenanceScore).toBeGreaterThanOrEqual(0.9);
  });

  it("marks disputed edges and lowers their provenance score", () => {
    const graph = buildGraph(
      [
        { id: 1, name: "Target", type: "HNWI", bayesianScore: 0.8 },
        { id: 2, name: "Candidate", type: "HNWI", bayesianScore: 0.4 },
      ],
      [],
      [{
        id: 2,
        sourceEntityId: 1,
        targetId: 2,
        targetType: "Entity",
        relationshipType: "KNOWN_ASSOCIATE",
        strength: 0.9,
        notes: "Disputed and unverified.",
      }],
    );

    const arc = graph.adjacency.get("e:1")?.[0]?.arc;
    expect(arc?.evidenceStatus).toBe("disputed");
    expect(arc?.provenanceScore).toBeLessThan(0.3);
  });

  it("skips dangling relationships when endpoints are missing", () => {
    const graph = buildGraph(
      [{ id: 1, name: "Only", type: "HNWI", bayesianScore: 0.5 }],
      [],
      [{
        id: 9,
        sourceEntityId: 1,
        targetId: 999,
        targetType: "Entity",
        relationshipType: "KNOWS",
        strength: 0.5,
        notes: null,
      }],
    );
    expect(graph.adjacency.get("e:1") ?? []).toHaveLength(0);
  });

  it("returns forward-oriented edges from extractSubgraph", () => {
    const graph = buildGraph(
      [
        { id: 1, name: "A", type: "HNWI", bayesianScore: 0.5 },
        { id: 2, name: "B", type: "Corporation", bayesianScore: 0.4 },
      ],
      [],
      [{
        id: 3,
        sourceEntityId: 1,
        targetId: 2,
        targetType: "Entity",
        relationshipType: "OWNS",
        strength: 0.8,
        notes: "Verified registry link",
      }],
    );
    const { edges } = extractSubgraph(graph, "e:1", 1);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.id).toBe("r:3");
    expect(edges[0]!.id.endsWith("_rev")).toBe(false);
    expect(edges[0]!.source).toBe("e:1");
    expect(edges[0]!.target).toBe("e:2");
  });

  it("finds shortest path and normalizes arc direction", () => {
    const graph = buildGraph(
      [
        { id: 1, name: "A", type: "HNWI", bayesianScore: 0.5 },
        { id: 2, name: "B", type: "Gatekeeper", bayesianScore: 0.4 },
        { id: 3, name: "C", type: "HNWI", bayesianScore: 0.6 },
      ],
      [],
      [
        {
          id: 1,
          sourceEntityId: 1,
          targetId: 2,
          targetType: "Entity",
          relationshipType: "KNOWS",
          strength: 0.7,
          notes: null,
        },
        {
          id: 2,
          sourceEntityId: 2,
          targetId: 3,
          targetType: "Entity",
          relationshipType: "KNOWS",
          strength: 0.7,
          notes: null,
        },
      ],
    );
    const path = findShortestPath(graph, "e:1", "e:3");
    expect(path).not.toBeNull();
    expect(path!.path).toEqual(["e:1", "e:2", "e:3"]);
    expect(path!.arcs.every((a) => !a.id.endsWith("_rev"))).toBe(true);
  });

  it("forwardArc flips reversed edges", () => {
    const rev = {
      id: "r:1_rev",
      source: "e:2",
      target: "e:1",
      label: "KNOWS",
      strength: 0.5,
      provenanceScore: 0.5,
      citationCount: 0,
      freshnessScore: 0.7,
      evidenceStatus: "review" as const,
    };
    const fwd = forwardArc(rev);
    expect(fwd.id).toBe("r:1");
    expect(fwd.source).toBe("e:1");
    expect(fwd.target).toBe("e:2");
  });
});
