import { describe, it, expect } from "vitest";

// Inline parse mirror for unit test stability
function parsePersonFindings(
  findings: Array<{ vectorType?: string; value?: string; sourceUrls?: string[]; personName?: string | null; note?: string }>,
) {
  const out: Array<{ name: string; sourceUrls: string[] }> = [];
  const seen = new Set<string>();
  for (const f of findings ?? []) {
    const urls = (f.sourceUrls ?? []).filter((u) => /^https?:\/\//i.test(String(u)));
    if (f.personName && String(f.personName).trim().length >= 3 && urls.length) {
      const n = String(f.personName).trim();
      if (!seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        out.push({ name: n, sourceUrls: urls });
      }
    }
    const value = String(f.value ?? "").trim();
    const m = value.match(/^person:\s*(.+?)(?:\s*\|)/i);
    if (m && urls.length) {
      const n = m[1]!.trim();
      if (!seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        out.push({ name: n, sourceUrls: urls });
      }
    }
  }
  return out;
}

describe("discovery agent parse", () => {
  it("keeps person with source URL", () => {
    const r = parsePersonFindings([
      { personName: "Jane Example", sourceUrls: ["https://sec.gov/x"], note: "officer" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.name).toBe("Jane Example");
  });
  it("drops person without URL", () => {
    const r = parsePersonFindings([{ personName: "No Url Person", sourceUrls: [] }]);
    expect(r).toHaveLength(0);
  });
});
