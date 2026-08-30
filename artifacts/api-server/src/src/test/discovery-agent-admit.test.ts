import { describe, expect, it, vi, afterEach } from "vitest";
import { sourceActuallyMentionsCandidate } from "../lib/discovery-agent-admit";
import type { DiscoveryCandidate } from "../lib/discovery-agent";

const candidate = (name: string, sourceUrls: string[]): DiscoveryCandidate => ({
  name,
  role: "Founder",
  company: "Example Holdings",
  basis: "Named in public source",
  sourceUrls,
  lane: "discovery-agent",
});

afterEach(() => vi.unstubAllGlobals());

describe("discovery admission source establishment", () => {
  it("accepts a source that actually names the candidate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      "Leadership: Jane Example, Founder of Example Holdings.",
      { status: 200, headers: { "content-type": "text/html" } },
    )));

    await expect(sourceActuallyMentionsCandidate(candidate("Jane Example", ["https://example.com/team"]))).resolves.toBe(true);
  });

  it("rejects a real URL that does not establish the claimed name", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      "Leadership: John Other, Founder of Example Holdings.",
      { status: 200, headers: { "content-type": "text/html" } },
    )));

    await expect(sourceActuallyMentionsCandidate(candidate("Jane Example", ["https://example.com/team"]))).resolves.toBe(false);
  });

  it("rejects search-engine URLs as identity evidence", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sourceActuallyMentionsCandidate(candidate("Jane Example", ["https://www.google.com/search?q=Jane+Example"]))).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts common LAST, First ordering when both identity tokens are nearby", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      "Board member: EXAMPLE, JANE — founder and director.",
      { status: 200, headers: { "content-type": "text/html" } },
    )));

    await expect(sourceActuallyMentionsCandidate(candidate("Jane Example", ["https://example.com/board"]))).resolves.toBe(true);
  });
});
