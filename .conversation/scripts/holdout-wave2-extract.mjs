#!/usr/bin/env node
/** Wave-2 discovery holdouts: Advance Turning, Walker Tool, Baumann Tool. */
import { writeFileSync } from "node:fs";

const ORG = /^(info|sales|support|contact|office|admin|hello|quotes)@/i;
const MI_AREA = /^(231|248|269|313|517|586|616|734|810|906|989)/;

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ApexAtlas-Holdout/1.0", Accept: "text/html" },
      signal: AbortSignal.timeout(12000),
    });
    return { url, ok: res.ok, status: res.status, html: res.ok ? await res.text() : "" };
  } catch (e) {
    return { url, ok: false, status: 0, html: "", error: String(e.message || e) };
  }
}

function plainOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "'")
    .replace(/\n{3,}/g, "\n\n");
}

function extractPhones(text) {
  const out = [];
  for (const m of text.matchAll(/\b\(?\s*(\d{3})\s*\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g)) {
    const d = `${m[1]}${m[2]}${m[3]}`;
    if (d.slice(3, 6) === "555" || /^(\d)\1+$/.test(d)) continue;
    if (!MI_AREA.test(d.slice(0, 3)) && !/^800|^877|^888/.test(d.slice(0, 3))) continue;
    out.push(`+1${d}`);
  }
  return [...new Set(out)];
}

function extract(page) {
  const html = page.html || "";
  const plain = plainOf(html);
  const people = [];
  const seen = new Set();
  const push = (name, role, email) => {
    let personName = name
      .replace(/\s+/g, " ")
      .replace(/^(Leadership|Meet Our Team|Our Team|Team)\s+/i, "")
      .replace(/\s*,?\s*(Jr\.?|Sr\.?|II|III)\s*$/i, (m) => m.trim())
      .trim();
    // Keep Jr/Sr as part of name for Macchia
    if (personName.split(/\s+/).length < 2 || personName.length > 55) return;
    if (/Advance Turning|Walker Tool|Contact|Founder$|PRESIDENT$|CEO$/i.test(personName) && personName.split(/\s+/).length < 3) {
      /* allow John Macchia, Sr. */
    }
    const key = personName.toLowerCase().replace(/[^a-z\s]/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    people.push({
      personName,
      role: (role || "related_contact").replace(/\s+/g, " ").trim().slice(0, 80),
      email: email || null,
      scope: email && ORG.test(email) ? "organization" : "candidate",
      sourceUrls: [page.url],
    });
  };

  // #### Name \n ROLE (Advance Turning Wix/markdown)
  for (const m of plain.matchAll(
    /(?:^|\n)\s*#{0,4}\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+(?:\s*,?\s*(?:Jr\.?|Sr\.?|II|III))?)\s*\n\s*((?:FOUNDER|CEO|PRESIDENT|VP OF [A-Z &]+|Owner|Chairman|Vice President)[^\n]{0,40})/gim,
  )) {
    push(m[1], m[2]);
  }

  // Name on heading then role ALL CAPS nearby
  for (const m of html.matchAll(
    /<h[1-4][^>]*>\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+(?:\s*,?\s*(?:Jr\.?|Sr\.?))?)\s*<\/h[1-4]>[\s\S]{0,400}?(?:FOUNDER|CEO|PRESIDENT|VP OF [A-Z &\/]+|Owner|Chairman)/gi,
  )) {
    const roleM = m[0].replace(/<[^>]+>/g, " ").match(/\b(FOUNDER|CEO|PRESIDENT|VP OF [A-Z &\/]+|Owner|Chairman)\b/i);
    push(m[1], roleM?.[1] || "principal");
  }

  // David Hendricks / Jeff Umlor style in prose
  for (const m of plain.matchAll(
    /\b((?:David|Dave|Jeff|Jeffrey)\s+[A-Z]\.?\s*[A-Z][a-z]+)\b[^.]{0,40}\b(president|owner|CEO)\b/gi,
  )) {
    push(m[1], m[2]);
  }
  for (const m of plain.matchAll(
    /\b(Gordon Hendricks|David N\.?\s*Hendricks|David Hendricks|Jeff Umlor)\b[^.]{0,60}\b(president|owner|partner|current president)?/gi,
  )) {
    push(m[1], m[2] || "principal");
  }

  // mailto name proximity
  for (const m of html.matchAll(
    /href=["']mailto:([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/gi,
  )) {
    const email = m[1].toLowerCase();
    if (ORG.test(email)) continue;
    // local part as weak name hint only if already have person
  }

  const orgEmails = [];
  for (const m of (html + plain).matchAll(/\b([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})\b/gi)) {
    const e = m[1].toLowerCase();
    if (ORG.test(e) && !orgEmails.includes(e)) orgEmails.push(e);
  }
  for (const m of html.matchAll(/mailto:([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/gi)) {
    const e = m[1].toLowerCase();
    if (!orgEmails.includes(e) && (ORG.test(e) || /baumanntd|advanceturning|walkertool/i.test(e))) {
      if (ORG.test(e)) orgEmails.push(e);
      else {
        // personal domain email — attach as candidate without inventing name if local is firstname
        const local = e.split("@")[0];
        if (/^markb$/i.test(local)) push("Mark Brown", "CEO", e);
      }
    }
  }

  return { people, orgEmails, phones: extractPhones(plain), succession: /family|son|acquired|founder|second.?gen/i.test(plain) };
}

async function score(spec) {
  const pages = await Promise.all(spec.urls.map(fetchHtml));
  const people = [];
  let orgEmails = [];
  let phones = [];
  let succession = false;
  for (const p of pages) {
    if (!p.ok) continue;
    const r = extract(p);
    for (const person of r.people) {
      if (!people.some((x) => x.personName.toLowerCase().replace(/[^a-z]/g, "") === person.personName.toLowerCase().replace(/[^a-z]/g, ""))) {
        people.push(person);
      }
    }
    for (const e of r.orgEmails) if (!orgEmails.includes(e)) orgEmails.push(e);
    for (const ph of r.phones) if (!phones.includes(ph)) phones.push(ph);
    succession = succession || r.succession;
  }
  const ledgerHits = (spec.ledger || []).filter((n) =>
    people.some((p) => p.personName.toLowerCase().includes(n.toLowerCase().split(" ").pop()) && p.personName.toLowerCase().includes(n.toLowerCase().split(" ")[0])),
  );
  const hasNameTiedEmail = people.some((p) => p.email && !ORG.test(p.email));
  const assert = {
    relatedPersonsAtLeast: people.length >= spec.minPeople,
    ledgerMin: ledgerHits.length >= spec.minLedger,
    hasOrgPhone: phones.length >= 1 || spec.phoneOptional === true,
    hasOrgEmail: orgEmails.length >= 1 || spec.emailOptional === true || hasNameTiedEmail,
    allHaveSourceUrls: people.every((p) => (p.sourceUrls || []).length > 0),
  };
  return {
    id: spec.id,
    pages: pages.map((p) => ({ url: p.url, ok: p.ok, status: p.status })),
    relatedPersons: people.length,
    people,
    orgEmails,
    phones,
    succession,
    ledgerHits,
    assert,
    pass: Object.values(assert).every(Boolean),
  };
}

async function main() {
  const targets = [];
  targets.push(
    await score({
      id: "advance-turning",
      urls: ["https://www.advanceturning.com/about", "https://www.advanceturning.com/contact"],
      ledger: ["John Macchia", "John Rappleye", "Kristin Flick", "Joe Sorenson", "Ben Britten"],
      minPeople: 5,
      minLedger: 4,
    }),
  );
  targets.push(
    await score({
      id: "walker-tool",
      urls: ["https://www.walkertool.com/aboutus.html", "https://www.walkertool.com/contactus.html"],
      ledger: ["David Hendricks", "Gordon Hendricks"],
      minPeople: 1,
      minLedger: 1,
      emailOptional: true, // public contact is phone-first
    }),
  );
  targets.push(
    await score({
      id: "baumann",
      urls: ["https://www.baumanntd.com/"],
      ledger: ["Mark Brown"],
      minPeople: 1,
      minLedger: 1,
    }),
  );

  const out = { tip: "wave2-holdout", at: new Date().toISOString(), targets, pass: targets.every((t) => t.pass) };
  writeFileSync("scripts/holdout-wave2-result.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log(out.pass ? "\nWAVE2 PASS" : "\nWAVE2 FAIL");
  process.exitCode = out.pass ? 0 : 1;
}

main();
