/**
 * Surface contact-shaped tokens already visible in SERP snippets.
 * OSINT practice: treat as leads until verified on a primary page (visit).
 */
export function extractSerpContactTokens(text: string): { phones: string[]; emails: string[] } {
  const body = text || "";
  const phones = body.match(/\+?\d[\d\s().-]{8,}\d/g) ?? [];
  const emails = body.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()))].slice(0, 6);
  return { phones: uniq(phones), emails: uniq(emails) };
}

export function formatSerpContactTokenBlock(text: string): string {
  const { phones, emails } = extractSerpContactTokens(text);
  if (!phones.length && !emails.length) return "";
  const lines = ["Contact-shaped tokens visible in snippets (verify via visit before done):"];
  if (emails.length) lines.push(`  emails: ${emails.join(", ")}`);
  if (phones.length) lines.push(`  phones: ${phones.join(", ")}`);
  return lines.join("\n");
}
