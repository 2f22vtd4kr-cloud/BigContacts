#!/usr/bin/env node
/**
 * Griffin Tool holdout — live fetch + Apex-style extractors.
 * Assert ≥5 related persons with emails + sourceUrls; org phone + org email.
 */
import { writeFileSync } from "node:fs";

const ABOUT = "https://www.griffintool.com/about";
const CONTACT = "https://www.griffintool.com/copy-of-contact-2";

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ApexAtlas-Holdout/1.0 (public research)", Accept: "text/html" },
    });
    const html = res.ok ? await res.text() : "";
    return { url, ok: res.ok, status: res.status, html };
  } catch (e) {
    return { url, ok: false, status: 0, html: "", error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

function extract(page) {
  const findings = [];
  const push = (f) => findings.push({ ...f, sourceUrls: [page.url] });
  const html = page.html || "";
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "'")
    .replace(/\n{3,}/g, "\n\n");

  const orgPrefixes = /^(info|sales|support|contact|office|admin|hello|quotes)@/i;
  const seen = new Set();

  // Wix h3/h4 Name → mailto within 2500 chars + role in between
  for (const m of html.matchAll(
    /<h[1-4][^>]*>\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*<\/h[1-4]>[\s\S]{0,2500}?href=["']mailto:([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/gi,
  )) {
    const personName = m[1].replace(/\s+/g, " ").trim();
    const email = m[2].toLowerCase();
    if (personName.split(/\s+/).length < 2 || personName.length > 45) continue;
    if (/Contact|Griffin Tool|Meet|Request/i.test(personName)) continue;
    const key = personName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const between = m[0].replace(/<[^>]+>/g, " ");
    const roleM = between.match(
      /\b(Chief Executive Officer(?:\s+and\s+President)?|President|CEO|CFO|Chief Financial Officer|Owner|Office Manager|Operations Manager|Engineering Manager|Administrative Specialist|Senior Engineer|Head of CNC(?:\s+Department)?|Process Engineer|Director of Business Development|General Manager|Plant Manager|Controller|Manager|Director|Engineer)\b/i,
    );
    const role = roleM ? roleM[1].replace(/\s+/g, " ").trim() : "related_contact";
    push({
      vectorType: "email",
      value: email,
      personName,
      role,
      scope: orgPrefixes.test(email) ? "organization" : "candidate",
    });
  }

  // Org emails
  for (const m of html.matchAll(/mailto:([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/gi)) {
    const e = m[1].toLowerCase();
    if (!orgPrefixes.test(e)) continue;
    if (findings.some((f) => f.value === e)) continue;
    push({ vectorType: "email", value: e, personName: null, role: null, scope: "organization" });
  }

  // Phones (skip 555 / all-same)
  for (const m of plain.matchAll(/\b\(?\s*(\d{3})\s*\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g)) {
    const digits = `${m[1]}${m[2]}${m[3]}`;
    if (digits.slice(3, 6) === "555" || /^(\d)\1+$/.test(digits)) continue;
    if (findings.some((f) => f.vectorType === "phone" && f.value.endsWith(digits))) continue;
    push({ vectorType: "phone", value: `+1${digits}`, personName: null, role: null, scope: "organization" });
  }

  if (/acquired the business|fourth-generation|family-run|family-owned/i.test(plain)) {
    const sn = plain.match(/.{0,60}(?:acquired the business|fourth-generation|family-run).{0,60}/i)?.[0]
      ?.replace(/\s+/g, " ")
      .trim();
    if (sn)
      push({
        vectorType: "other",
        value: sn.slice(0, 180),
        personName: null,
        role: "succession",
        scope: "organization",
      });
  }

  push({
    vectorType: "website",
    value: "https://www.griffintool.com/",
    personName: null,
    role: null,
    scope: "organization",
  });

  return findings;
}

async function main() {
  const pages = await Promise.all([fetchHtml(ABOUT), fetchHtml(CONTACT)]);
  const findings = pages.flatMap((p) => (p.ok ? extract(p) : []));

  const people = [...new Map(
    findings
      .filter((f) => f.personName && f.personName.split(/\s+/).length >= 2)
      .map((p) => [p.personName.toLowerCase(), p]),
  ).values()];

  const withEmail = people.filter((p) => p.vectorType === "email");
  const orgEmails = findings.filter((f) => f.vectorType === "email" && f.scope === "organization");
  const phones = [...new Set(findings.filter((f) => f.vectorType === "phone").map((p) => p.value))];
  const succession = findings.filter((f) => f.role === "succession");

  const ledger = [
    "Malcolm Cowan",
    "Jenny Cowan",
    "Lillian Cowan",
    "Jason Caropepe",
    "Tim Dye",
    "Rod McGilvra",
    "Brian Moore",
  ];
  const hits = ledger.filter((n) => people.some((p) => p.personName.toLowerCase() === n.toLowerCase()));

  const score = {
    tip: "griffin-holdout-live",
    pages: pages.map((p) => ({ url: p.url, ok: p.ok, status: p.status })),
    relatedPersons: people.length,
    relatedWithEmail: withEmail.length,
    orgEmails: orgEmails.map((e) => e.value),
    phones,
    successionFacts: succession.length,
    ledgerHits: hits,
    ledgerHitCount: hits.length,
    people: people.map((p) => ({
      name: p.personName,
      role: p.role,
      email: p.value,
      scope: p.scope,
      sourceUrls: p.sourceUrls,
    })),
    assert: {
      relatedPersonsAtLeast5: people.length >= 5,
      relatedWithEmailAtLeast5: withEmail.length >= 5,
      ledgerAtLeast5: hits.length >= 5,
      hasOrgPhone: phones.length >= 1,
      hasOrgEmail: orgEmails.length >= 1,
      allHaveSourceUrls: people.every((p) => (p.sourceUrls || []).some((u) => /^https?:\/\//.test(u))),
    },
  };
  score.pass = Object.values(score.assert).every(Boolean);

  writeFileSync("/tmp/apex-griffin-holdout.json", JSON.stringify(score, null, 2));
  writeFileSync("scripts/holdout-griffin-result.json", JSON.stringify(score, null, 2));
  console.log(JSON.stringify(score, null, 2));
  console.log(score.pass ? "\nHOLDOUT PASS" : "\nHOLDOUT FAIL");
  process.exitCode = score.pass ? 0 : 1;
}

main();
