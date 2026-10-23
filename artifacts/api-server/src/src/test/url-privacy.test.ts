import { describe, expect, it } from "vitest";
import {
  sanitizeObservableValue,
  sanitizeUrlForEvidence,
  sanitizeUrlsInText,
  retainCompletePublicHttpUrlForPrompt,
} from "../lib/url-privacy";

describe("URL privacy boundary", () => {
  it("retains exact public URLs verbatim instead of normalizing their route", () => {
    const raw = "https://REGISTRY.example.test/record?id=A%2Fb&tab=ownership";
    expect(retainCompletePublicHttpUrlForPrompt(raw)).toBe(raw);
  });

  it.each([
    "https://user:password@example.com/private",
    "https://storage.example.test/object?X-Amz-Signature=signed-secret&download=1",
    "https://example.com/#/callback?access_token=fragment-secret&state=keep",
    "https://example.com/object?api%5Fkey=secret",
    "https://example.com/object?token=%5BREDACTED%5D",
    "https://example.com/path/[REDACTED]",
    "https://example.com/[URL omitted from bounded case-file projection: 1]",
  ])("omits credential-bearing or secret-parameter URLs whole", (raw) => {
    expect(retainCompletePublicHttpUrlForPrompt(raw)).toBeNull();
  });

  it("omits oversized route URLs rather than returning a shortened prefix", () => {
    const raw = "https://registry.example.test/filings/" + "a".repeat(700);
    expect(retainCompletePublicHttpUrlForPrompt(raw, 512)).toBeNull();
  });

  it("removes URL userinfo and redacts sensitive query and fragment parameters", () => {
    const safe = new URL(sanitizeUrlForEvidence(
      "https://user:password@example.com/private?Api-Key=secret&search=known#access_token=fragment-secret&state=public",
    ));

    expect(safe.username).toBe("");
    expect(safe.password).toBe("");
    expect(safe.searchParams.get("Api-Key")).toBe("[REDACTED]");
    expect(safe.searchParams.get("search")).toBe("known");

    const fragment = new URLSearchParams(safe.hash.slice(1));
    expect(fragment.get("access_token")).toBe("[REDACTED]");
    expect(fragment.get("state")).toBe("public");
  });

  it("normalizes separator variations in signed cloud URL parameters", () => {
    const safe = new URL(sanitizeUrlForEvidence(
      "https://storage.example.test/object?X-Amz-Signature=sig&x_goog_credential=credential&download=1",
    ));

    expect(safe.searchParams.get("X-Amz-Signature")).toBe("[REDACTED]");
    expect(safe.searchParams.get("x_goog_credential")).toBe("[REDACTED]");
    expect(safe.searchParams.get("download")).toBe("1");
  });

  it("redacts encoded sensitive keys in route-style OAuth fragments", () => {
    const cases = [
      "https://example.com/#/callback?access%5Ftoken=encoded-underscore-secret&state=keep",
      "https://example.com/#/callback?%61ccess_token=encoded-leading-secret&state=keep",
    ];
    for (const raw of cases) {
      const safe = sanitizeUrlForEvidence(raw);
      expect(safe).toContain("/callback");
      expect(safe).toContain("state=keep");
      expect(safe).toContain("REDACTED");
      expect(safe).not.toContain("encoded-underscore-secret");
      expect(safe).not.toContain("encoded-leading-secret");
    }
  });

  it("sanitizes URLs inside free text without removing sentence punctuation or unrelated prose", () => {
    const output = sanitizeUrlsInText(
      "Redirect to https://user:password@example.com/path?token=secret). The source remains untrusted.",
    );

    expect(output).not.toContain("password");
    expect(output).not.toContain("secret");
    expect(output).toContain("https://example.com/path?token=%5BREDACTED%5D).");
    expect(output).toContain("The source remains untrusted.");
  });

  it("preserves safe authoritative route fields verbatim and omits secret-bearing route fields whole", () => {
    const publicUrl = "https://REGISTRY.example.test/record?id=A%2Fb&space=a%20b&order=2&order=1";
    const secretUrl = "https://registry.example.test/record?X-Amz-Signature=private&view=full";

    const safe = sanitizeObservableValue({
      args: { url: publicUrl },
      leadUrls: [publicUrl],
      finding: { sourceUrls: [publicUrl] },
      secretSourceUrl: secretUrl,
    });

    expect(safe.args.url).toBe(publicUrl);
    expect(safe.leadUrls[0]).toBe(publicUrl);
    expect(safe.finding.sourceUrls[0]).toBe(publicUrl);
    expect(safe.secretSourceUrl).toContain("[URL omitted from privacy-safe observable state");
    expect(safe.secretSourceUrl).not.toContain(secretUrl);
    expect(safe.secretSourceUrl).not.toContain("private");
  });

  it("recursively sanitizes nested observable values without mutating source state", () => {
    const raw = {
      url: "https://user:password@example.com/?api_key=secret",
      notes: ["See https://example.org/report?signature=private.", "No URL here."],
    };
    const safe = sanitizeObservableValue(raw);

    expect(safe.url).not.toContain("password");
    expect(safe.url).not.toContain("secret");
    expect(safe.notes[0]).not.toContain("private");
    expect(safe.notes[1]).toBe("No URL here.");
    expect(raw.url).toContain("password");
    expect(raw.notes[0]).toContain("private");
  });
});
