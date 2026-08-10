/**
 * Manual import extraction — turn research notes / files into review entity drafts.
 * Never invents contacts. LLM extracts only what is present in the source text.
 * Contacts land as candidate/related, never auto-Personal.
 */
import { logger } from "./logger";
import { extractJsonObject } from "./ai-extractor";

export type ImportDraftContact = {
  vectorType: "email" | "phone" | "linkedin" | "website" | "social" | "address";
  value: string;
  scope: "candidate" | "organization" | "personal";
  note?: string;
  sourceUrls?: string[];
};

export type ImportDraftEntity = {
  name: string;
  type: "HNWI" | "Corporation" | "Trust" | "Gatekeeper";
  nationality?: string | null;
  estimatedNetWorth?: number | null;
  knownResidences?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  contactMethod?: string | null;
  notes?: string | null;
  sourceRegistries?: string[];
  contacts: ImportDraftContact[];
  confidence: "high" | "medium" | "low";
  sourceSnippet?: string;
};

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,4}[\s.\-]?\d{3,4}/g;
const LINKEDIN_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/gi;
const URL_RE = /https?:\/\/[^\s"'<>]+/gi;

function normalizeType(raw: string | undefined | null): ImportDraftEntity["type"] {
  const t = String(raw ?? "").toLowerCase();
  if (/corp|company|llc|ltd|inc|plc|gmbh|shell/.test(t)) return "Corporation";
  if (/trust|fiduciary|foundation/.test(t)) return "Trust";
  if (/gate|introducer|assistant|secretary|family.?office|lawyer|attorney|counsel/.test(t)) return "Gatekeeper";
  return "HNWI";
}

function scopeForEmail(email: string): ImportDraftContact["scope"] {
  if (/^(info|contact|office|press|hello|admin|sales|support|noreply)@/i.test(email)) return "organization";
  return "candidate";
}

/** Heuristic parse for CSV with header row. */
export function parseCsvToDrafts(text: string): ImportDraftEntity[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase().trim());
  const nameIdx = headers.findIndex((h) => /^(name|full.?name|person|entity|company)$/.test(h));
  if (nameIdx < 0) return [];
  const typeIdx = headers.findIndex((h) => /^(type|classification|kind)$/.test(h));
  const emailIdx = headers.findIndex((h) => /email/.test(h));
  const phoneIdx = headers.findIndex((h) => /phone|tel|mobile/.test(h));
  const linkedinIdx = headers.findIndex((h) => /linkedin/.test(h));
  const notesIdx = headers.findIndex((h) => /note|comment|bio|about/.test(h));
  const natIdx = headers.findIndex((h) => /national|country|citizenship/.test(h));
  const resIdx = headers.findIndex((h) => /residence|location|city|address/.test(h));
  const wealthIdx = headers.findIndex((h) => /wealth|net.?worth|worth|hnw/.test(h));

  const drafts: ImportDraftEntity[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const name = (cols[nameIdx] ?? "").trim();
    if (!name || name.length < 2) continue;
    const contacts: ImportDraftContact[] = [];
    const email = emailIdx >= 0 ? (cols[emailIdx] ?? "").trim() : "";
    const phone = phoneIdx >= 0 ? (cols[phoneIdx] ?? "").trim() : "";
    const linkedin = linkedinIdx >= 0 ? (cols[linkedinIdx] ?? "").trim() : "";
    if (email && EMAIL_RE.test(email)) {
      contacts.push({ vectorType: "email", value: email.toLowerCase(), scope: scopeForEmail(email), note: "CSV import" });
    }
    if (phone && phone.replace(/\D/g, "").length >= 7) {
      contacts.push({ vectorType: "phone", value: phone, scope: "candidate", note: "CSV import" });
    }
    if (linkedin && /linkedin\.com/i.test(linkedin)) {
      contacts.push({ vectorType: "linkedin", value: linkedin, scope: "candidate", note: "CSV import", sourceUrls: [linkedin] });
    }
    let wealth: number | null = null;
    if (wealthIdx >= 0) {
      const raw = (cols[wealthIdx] ?? "").replace(/[$,\s]/g, "");
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) wealth = n;
    }
    drafts.push({
      name,
      type: normalizeType(typeIdx >= 0 ? cols[typeIdx] : "HNWI"),
      nationality: natIdx >= 0 ? (cols[natIdx] ?? "").trim() || null : null,
      estimatedNetWorth: wealth,
      knownResidences: resIdx >= 0 ? (cols[resIdx] ?? "").trim() || null : null,
      linkedinUrl: linkedin || null,
      phone: phone || null,
      email: email || null,
      notes: notesIdx >= 0 ? (cols[notesIdx] ?? "").trim() || null : null,
      sourceRegistries: ["manual-import-csv"],
      contacts,
      confidence: "medium",
      sourceSnippet: line.slice(0, 200),
    });
  }
  return drafts;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Heuristic JSON array of objects → drafts. */
export function parseJsonToDrafts(text: string): ImportDraftEntity[] {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : Array.isArray(data?.entities) ? data.entities : Array.isArray(data?.people) ? data.people : null;
    if (!arr) return [];
    return arr
      .map((row: any) => {
        const name = String(row.name ?? row.fullName ?? row.person ?? "").trim();
        if (!name) return null;
        const contacts: ImportDraftContact[] = [];
        if (row.email) contacts.push({ vectorType: "email", value: String(row.email).toLowerCase(), scope: scopeForEmail(String(row.email)), note: "JSON import" });
        if (row.phone) contacts.push({ vectorType: "phone", value: String(row.phone), scope: "candidate", note: "JSON import" });
        if (row.linkedinUrl || row.linkedin) {
          const url = String(row.linkedinUrl ?? row.linkedin);
          contacts.push({ vectorType: "linkedin", value: url, scope: "candidate", note: "JSON import", sourceUrls: [url] });
        }
        return {
          name,
          type: normalizeType(row.type),
          nationality: row.nationality ?? null,
          estimatedNetWorth: typeof row.estimatedNetWorth === "number" ? row.estimatedNetWorth : null,
          knownResidences: row.knownResidences ?? row.location ?? null,
          linkedinUrl: row.linkedinUrl ?? row.linkedin ?? null,
          phone: row.phone ?? null,
          email: row.email ?? null,
          notes: row.notes ?? row.bio ?? null,
          sourceRegistries: ["manual-import-json"],
          contacts,
          confidence: "medium" as const,
          sourceSnippet: JSON.stringify(row).slice(0, 200),
        } satisfies ImportDraftEntity;
      })
      .filter(Boolean) as ImportDraftEntity[];
  } catch {
    return [];
  }
}

/** Regex fallback when no LLM keys available. */
export function heuristicExtractDrafts(text: string, max = 25): ImportDraftEntity[] {
  const drafts: ImportDraftEntity[] = [];
  const seen = new Set<string>();

  // LinkedIn profiles → person-shaped candidates
  for (const m of text.matchAll(LINKEDIN_RE)) {
    const url = m[0]!.replace(/\/$/, "");
    const slug = url.split("/in/")[1]?.replace(/\/.*/, "") ?? "";
    const name = slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    if (!name || name.length < 3) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push({
      name,
      type: "HNWI",
      linkedinUrl: url,
      sourceRegistries: ["manual-import-heuristic"],
      contacts: [{ vectorType: "linkedin", value: url, scope: "candidate", note: "Heuristic LinkedIn URL", sourceUrls: [url] }],
      confidence: "low",
      sourceSnippet: url,
    });
    if (drafts.length >= max) return drafts;
  }

  // Lines that look like "Name — email / phone"
  for (const line of text.split(/\r?\n/)) {
    if (drafts.length >= max) break;
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 300) continue;
    const emails = trimmed.match(EMAIL_RE) ?? [];
    const nameMatch = trimmed.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z.'\-]+){1,4})\b/);
    if (!nameMatch && emails.length === 0) continue;
    const name = nameMatch?.[1]?.trim() ?? emails[0]?.split("@")[0]?.replace(/[._]/g, " ") ?? "";
    if (!name || name.length < 3) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const contacts: ImportDraftContact[] = [];
    for (const email of emails.slice(0, 3)) {
      contacts.push({ vectorType: "email", value: email.toLowerCase(), scope: scopeForEmail(email), note: "Heuristic line parse" });
    }
    const phones = trimmed.match(PHONE_RE) ?? [];
    for (const phone of phones.slice(0, 2)) {
      if (phone.replace(/\D/g, "").length >= 8) {
        contacts.push({ vectorType: "phone", value: phone.trim(), scope: "candidate", note: "Heuristic line parse" });
      }
    }
    drafts.push({
      name,
      type: "HNWI",
      email: emails[0]?.toLowerCase() ?? null,
      phone: phones[0]?.trim() ?? null,
      notes: trimmed.slice(0, 400),
      sourceRegistries: ["manual-import-heuristic"],
      contacts,
      confidence: "low",
      sourceSnippet: trimmed.slice(0, 200),
    });
  }
  return drafts;
}

function getGroqKeys(): string[] {
  const keys: string[] = [];
  for (const k of [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3]) {
    if (k?.trim()) keys.push(k.trim());
  }
  const multi = process.env.GROQ_API_KEYS;
  if (multi) for (const k of multi.split(/[,;\s]+/)) if (k.trim()) keys.push(k.trim());
  return [...new Set(keys)];
}

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  for (const k of [process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY, process.env.GEMINI_API_KEY_2]) {
    if (k?.trim()) keys.push(k.trim());
  }
  return [...new Set(keys)];
}

const MULTI_ENTITY_PROMPT = (text: string) => `You are an OSINT extraction assistant for Apex Atlas.
Extract ONLY people, companies, trusts, and gatekeepers that are EXPLICITLY named in the source text below.
Do NOT invent emails, phones, LinkedIn URLs, or net-worth figures. If a field is not present, omit it.

Return JSON only:
{
  "entities": [
    {
      "name": "Full name as written",
      "type": "HNWI" | "Corporation" | "Trust" | "Gatekeeper",
      "nationality": "optional",
      "estimatedNetWorth": null or number in USD if explicitly stated,
      "knownResidences": "optional locations",
      "linkedinUrl": "optional full URL if present",
      "phone": "optional if present",
      "email": "optional if present",
      "notes": "one short sentence of context from the source",
      "contacts": [
        { "vectorType": "email"|"phone"|"linkedin"|"website"|"social", "value": "...", "scope": "candidate"|"organization" }
      ]
    }
  ]
}

Rules:
- scope "organization" for generic company emails (info@, contact@, press@)
- scope "candidate" for person-looking emails/phones/profiles (never mark personal — operator verifies)
- Max 30 entities. Prefer named principals and officers over pure org shells when both appear.
- If the text is a company list with officers, emit both company and named officers.

SOURCE TEXT:
---
${text.slice(0, 24_000)}
---`;

async function extractWithGroq(text: string): Promise<ImportDraftEntity[] | null> {
  const keys = getGroqKeys();
  for (const key of keys) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: MULTI_ENTITY_PROMPT(text) }],
          temperature: 0,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (resp.status === 429) continue;
      if (!resp.ok) continue;
      const data = await resp.json() as any;
      const raw = String(data?.choices?.[0]?.message?.content ?? "");
      return parseLlmEntityJson(raw, "groq");
    } catch (err) {
      logger.debug({ err: err instanceof Error ? err.message : String(err) }, "manual-import Groq failed");
    }
  }
  return null;
}

async function extractWithGemini(text: string): Promise<ImportDraftEntity[] | null> {
  const keys = getGeminiKeys();
  for (const key of keys) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: MULTI_ENTITY_PROMPT(text) }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 4000, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!resp.ok) continue;
      const data = await resp.json() as any;
      const raw = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
      return parseLlmEntityJson(raw, "gemini");
    } catch (err) {
      logger.debug({ err: err instanceof Error ? err.message : String(err) }, "manual-import Gemini failed");
    }
  }
  return null;
}

function parseLlmEntityJson(raw: string, source: string): ImportDraftEntity[] {
  const jsonStr = extractJsonObject(raw) ?? raw;
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return [];
  }
  const arr = Array.isArray(parsed?.entities) ? parsed.entities : Array.isArray(parsed) ? parsed : [];
  const drafts: ImportDraftEntity[] = [];
  for (const row of arr.slice(0, 30)) {
    const name = String(row?.name ?? "").trim();
    if (!name || name.length < 2) continue;
    const contacts: ImportDraftContact[] = [];
    if (Array.isArray(row.contacts)) {
      for (const c of row.contacts) {
        const value = String(c?.value ?? "").trim();
        if (!value) continue;
        const vectorType = String(c?.vectorType ?? "website").toLowerCase();
        const vt = (["email", "phone", "linkedin", "website", "social", "address"].includes(vectorType)
          ? vectorType
          : "website") as ImportDraftContact["vectorType"];
        const scopeRaw = String(c?.scope ?? "candidate").toLowerCase();
        // Never accept LLM "personal" — operator verifies later
        const scope: ImportDraftContact["scope"] =
          scopeRaw === "organization" || scopeRaw === "org" ? "organization" : "candidate";
        contacts.push({
          vectorType: vt,
          value: vt === "email" ? value.toLowerCase() : value,
          scope,
          note: `LLM extract (${source})`,
          sourceUrls: vt === "linkedin" || vt === "website" || vt === "social" ? [value] : undefined,
        });
      }
    }
    if (row.email && !contacts.some((c) => c.vectorType === "email")) {
      contacts.push({ vectorType: "email", value: String(row.email).toLowerCase(), scope: scopeForEmail(String(row.email)), note: `LLM extract (${source})` });
    }
    if (row.phone && !contacts.some((c) => c.vectorType === "phone")) {
      contacts.push({ vectorType: "phone", value: String(row.phone), scope: "candidate", note: `LLM extract (${source})` });
    }
    if (row.linkedinUrl && !contacts.some((c) => c.vectorType === "linkedin")) {
      contacts.push({
        vectorType: "linkedin",
        value: String(row.linkedinUrl),
        scope: "candidate",
        note: `LLM extract (${source})`,
        sourceUrls: [String(row.linkedinUrl)],
      });
    }
    drafts.push({
      name,
      type: normalizeType(row.type),
      nationality: row.nationality ? String(row.nationality) : null,
      estimatedNetWorth: typeof row.estimatedNetWorth === "number" ? row.estimatedNetWorth : null,
      knownResidences: row.knownResidences ? String(row.knownResidences) : null,
      linkedinUrl: row.linkedinUrl ? String(row.linkedinUrl) : null,
      phone: row.phone ? String(row.phone) : null,
      email: row.email ? String(row.email).toLowerCase() : null,
      notes: row.notes ? String(row.notes).slice(0, 2000) : null,
      sourceRegistries: [`manual-import-${source}`],
      contacts,
      confidence: "high",
      sourceSnippet: String(row.notes ?? name).slice(0, 200),
    });
  }
  return drafts;
}

export type ExtractResult = {
  drafts: ImportDraftEntity[];
  method: "csv" | "json" | "llm-groq" | "llm-gemini" | "heuristic";
  sourceBytes: number;
};

/**
 * Extract entity drafts from arbitrary research text or structured file content.
 * Prefer structured parsers, then LLM, then heuristic.
 */
export async function extractImportDrafts(input: {
  text: string;
  filename?: string | null;
  preferLlm?: boolean;
}): Promise<ExtractResult> {
  const text = String(input.text ?? "").trim();
  const filename = (input.filename ?? "").toLowerCase();
  if (!text) return { drafts: [], method: "heuristic", sourceBytes: 0 };

  if (filename.endsWith(".csv") || (text.includes(",") && /name/i.test(text.split("\n")[0] ?? ""))) {
    const csv = parseCsvToDrafts(text);
    if (csv.length) return { drafts: csv, method: "csv", sourceBytes: text.length };
  }
  if (filename.endsWith(".json") || text.trimStart().startsWith("{") || text.trimStart().startsWith("[")) {
    const json = parseJsonToDrafts(text);
    if (json.length) return { drafts: json, method: "json", sourceBytes: text.length };
  }

  if (input.preferLlm !== false && text.length >= 40) {
    const groq = await extractWithGroq(text);
    if (groq && groq.length) return { drafts: groq, method: "llm-groq", sourceBytes: text.length };
    const gemini = await extractWithGemini(text);
    if (gemini && gemini.length) return { drafts: gemini, method: "llm-gemini", sourceBytes: text.length };
  }

  return { drafts: heuristicExtractDrafts(text), method: "heuristic", sourceBytes: text.length };
}
