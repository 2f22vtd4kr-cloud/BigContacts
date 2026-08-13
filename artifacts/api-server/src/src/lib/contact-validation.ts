/**
 * Contact sanitization + trash gate (fail-closed).
 * Never invent contacts. Org inboxes stay organization-scoped.
 * Trash-phone gate stays on: US 555-exchange, all-same-digit, trivial sequences rejected.
 */

const ORG_MAILBOX_PREFIXES = new Set([
  "info", "contact", "office", "press", "hello", "admin", "sales", "support",
  "billing", "help", "service", "enquiries", "inquiry", "mail", "general",
  "team", "hr", "jobs", "careers", "noreply", "no-reply", "donotreply",
  "marketing", "media", "pr", "webmaster", "postmaster", "abuse",
]);

const TRASH_EMAIL_LOCALS = new Set([
  "test", "example", "sample", "dummy", "fake", "noreply", "no-reply",
  "donotreply", "mailer-daemon", "postmaster", "abuse",
]);

/** Normalize phone to digits-only for trash checks. */
export function normalizePhone(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;

  // US 555-exchange (555-0100 style fictionals)
  if (digits.length === 10 || digits.length === 11) {
    const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (national.length === 10) {
      const exchange = national.slice(3, 6);
      if (exchange === "555") return null;
    }
  }

  // All-same-digit
  if (/^(\d)\1+$/.test(digits)) return null;

  // Trivial sequences
  const trivial = new Set([
    "1234567890", "0123456789", "9876543210", "1234567", "12345678",
    "123456789", "1111111111", "0000000000", "9999999999",
  ]);
  if (trivial.has(digits) || trivial.has(digits.slice(-10))) return null;

  // Repeating short patterns
  if (/^(\d{2,4})\1+$/.test(digits) && digits.length >= 8) return null;

  return digits;
}

export function isTrashContactValue(kind: "email" | "phone" | string, value: string): boolean {
  if (!value || typeof value !== "string") return true;
  const v = value.trim().toLowerCase();
  if (!v) return true;

  if (kind === "phone" || /^\+?[\d\s().-]{7,}$/.test(value)) {
    const norm = normalizePhone(value);
    if (!norm) return true;
    // Re-check 555 after normalize
    if (norm.length >= 10) {
      const national = norm.length === 11 && norm.startsWith("1") ? norm.slice(1) : norm;
      if (national.length === 10 && national.slice(3, 6) === "555") return true;
    }
    return false;
  }

  if (kind === "email" || v.includes("@")) {
    const at = v.indexOf("@");
    if (at < 1) return true;
    const local = v.slice(0, at);
    const domain = v.slice(at + 1);
    if (!domain.includes(".") || domain.length < 3) return true;
    if (TRASH_EMAIL_LOCALS.has(local)) return true;
    if (/^(test|example|sample|dummy|fake|xxx|asdf)/i.test(local)) return true;
    if (domain === "example.com" || domain === "test.com" || domain.endsWith(".invalid")) return true;
    return false;
  }

  return false;
}

export function sanitizePublicEmail(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim().toLowerCase();
  // Cloudflare email-protection style remnants
  s = s.replace(/\[at\]/gi, "@").replace(/\[dot\]/gi, ".").replace(/\s*\(at\)\s*/gi, "@").replace(/\s*\(dot\)\s*/gi, ".");
  s = s.replace(/\s+/g, "");
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(s)) return null;
  if (isTrashContactValue("email", s)) return null;
  return s;
}

export function sanitizePublicPhone(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const norm = normalizePhone(raw);
  if (!norm) return null;
  if (isTrashContactValue("phone", norm)) return null;
  // Prefer E.164-ish display for US
  if (norm.length === 10) return `+1${norm}`;
  if (norm.length === 11 && norm.startsWith("1")) return `+${norm}`;
  return `+${norm}`;
}

export function isOrgMailbox(email: string | null | undefined): boolean {
  if (!email) return false;
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return ORG_MAILBOX_PREFIXES.has(local) || /^(info|sales|support|contact|admin|office)\b/i.test(local);
}

export function sanitizePublicSocialUrl(
  raw: string | null | undefined,
  platform?: string,
  _scope?: string
): string | null {
  if (!raw || typeof raw !== "string") return null;
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) {
    if (platform === "linkedin" && /linkedin\.com/i.test(u)) u = `https://${u.replace(/^\/+/, "")}`;
    else if (platform === "twitter" || platform === "x") {
      if (/^(twitter|x)\.com/i.test(u)) u = `https://${u.replace(/^\/+/, "")}`;
      else if (/^@?[\w]+$/.test(u)) u = `https://x.com/${u.replace(/^@/, "")}`;
    } else if (platform === "instagram" && !u.includes(".")) {
      u = `https://instagram.com/${u.replace(/^@/, "")}`;
    } else return null;
  }
  try {
    const parsed = new URL(u);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    // Basic platform host check
    const host = parsed.hostname.toLowerCase();
    if (platform === "linkedin" && !host.includes("linkedin.com")) return null;
    if ((platform === "twitter" || platform === "x") && !host.includes("twitter.com") && !host.includes("x.com")) return null;
    if (platform === "instagram" && !host.includes("instagram.com")) return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function sanitizePublicSocialHandle(raw: string | null | undefined, platform?: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  let h = raw.trim().replace(/^@/, "");
  if (!h || h.includes(" ") || h.length > 64) return null;
  if (platform === "linkedin" && h.includes("linkedin.com")) {
    const m = h.match(/linkedin\.com\/in\/([^/?#]+)/i);
    return m ? m[1] : null;
  }
  return h;
}
