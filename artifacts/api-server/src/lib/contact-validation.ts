/**
 * Validation for public contact evidence extracted from web pages and search
 * results. Search-engine diagnostics, placeholder addresses, and privacy
 * relay addresses are not person or organization contact vectors.
 */

const BLOCKED_EMAIL_DOMAINS = new Set([
  "example.com",
  "domain.com",
  "email.com",
  "test.com",
  "foo.com",
  "bar.com",
  "sample.com",
  "invalid.com",
  "localhost",
  "placeholder.com",
  "yourname.com",
  "company.com",
  "yourdomain.com",
  "noreply.com",
  "no-reply.com",
  "privacy.com",
  "domains.com",
  "domainsbyproxy.com",
  "whoisguard.com",
  "privacyprotect.org",
  "whoisprivacycorp.com",
  "registrant.com",
  "duckduckgo.com",
  "bing.com",
  "google.com",
  "search.yahoo.com",
]);

const BLOCKED_EMAIL_LOCAL_PARTS = new Set([
  "error",
  "error-lite",
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "webmaster",
]);

const EMAIL_RE = /^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i;

export function isValidPublicEmail(value: string | null | undefined): boolean {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return false;
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return false;
  if (BLOCKED_EMAIL_LOCAL_PARTS.has(local)) return false;
  if (domain.includes("privacy") || domain.includes("proxy")) return false;
  return true;
}

export function sanitizePublicEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  return isValidPublicEmail(email) ? email : null;
}