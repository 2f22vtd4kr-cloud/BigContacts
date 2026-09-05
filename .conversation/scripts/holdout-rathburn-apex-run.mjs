#!/usr/bin/env node
/**
 * Apex Atlas live holdout — Rathburn Precision Machining (ex Rathburn Tool)
 * Same family as holdout-walker-apex-run.mjs: Tavily + SerpAPI + WhoisJSON + HTML CONTACT FACTS.
 * Fail-closed: no invented emails.
 */
import { writeFileSync } from "node:fs";

const TAVILY = process.env.TAVILY_API_KEY || "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";
const SERP = process.env.SERPAPI_KEY || "e1322cb7cf19d21e48e7fb857693e6fa86ef8b227863b80aa13a88859bdf843c";
const WHOIS = process.env.WHOISJSON_KEY || "b3eb211b528c1dce4f4b7b8400ed430a3f138de36e4cdb9f8cbba84dc4bc87bd";

const TARGET = {
  name: "Rathburn Precision Machining",
  alt: "Rathburn Tool & Manufacturing",
  domains: ["rathburnmachining.com", "rathburntool.com"],
  query: "Rathburn Tool Manufacturing Auburn Indiana contact email president owner",
};

const DOMAIN_RE = /rathburnmachining\.com|rathburntool\.com/i;

async function tavilySearch(q) {
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY,
      query: q,
      search_depth: "advanced",
      max_results: 12,
      include_raw_content: false,
    }),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, results: j.results || [], answer: j.answer };
}

async function serpSearch(q) {
  const url =
    "https://serpapi.com/search.json?engine=google&q=" +
    encodeURIComponent(q) +
    "&api_key=" +
    SERP +
    "&num=10";
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  return {
    status: r.status,
    organic: (j.organic_results || []).map((x) => ({
      title: x.title,
      link: x.link,
      snippet: x.snippet,
    })),
  };
}

async function whoisJson(domain) {
  const r = await fetch("https://whoisjson.com/api/v1/whois?domain=" + domain, {
    headers: { Authorization: `TOKEN=${WHOIS}` },
  });
  const j = await r.json().catch(() => ({}));
  return {
    status: r.status,
    name: j.name,
    created: j.created,
    registrar: j.registrar?.name,
    privacy: /privacy|redacted|proxy/i.test(JSON.stringify(j.contacts || {})),
  };
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 18000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "ApexAtlas-Holdout/1.0 (public research)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const html = res.ok ? await res.text() : "";
    return { url, ok: res.ok, status: res.status, html };
  } catch (e) {
    return { url, ok: false, status: 0, html: "", error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

function extractFromHtml(page) {
  const html = page.html || "";
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#64;/g, "@")
    .replace(/\n{3,}/g, "\n\n");

  const emails = new Set();
  const phones = new Set();
  const people = [];
  const seenPerson = new Set();

  for (const m of html.matchAll(/mailto:([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/gi)) {
    emails.add(m[1].toLowerCase());
  }
  for (const m of plain.matchAll(
    /\b([a-z0-9._%+\-]+@(?:rathburnmachining|rathburntool)\.com)\b/gi,
  )) {
    emails.add(m[1].toLowerCase());
  }
  for (const m of plain.matchAll(
    /\b([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})\b/gi,
  )) {
    const e = m[1].toLowerCase();
    if (DOMAIN_RE.test(e) && !/example|sentry|schema|wixpress|cloudflare/.test(e)) {
      emails.add(e);
    }
  }

  for (const m of plain.matchAll(
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  )) {
    const p = m[0].replace(/[^\d+]/g, "");
    if (p.length >= 10 && p.length <= 12) phones.add(m[0].trim());
  }

  const roleRe =
    /\b(President|CEO|Owner|Founder|Controller|Manager|Director|Operations|Engineering|Quality|Human Resources|HR|Sales)\b/i;
  for (const m of plain.matchAll(
    /([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*[\n,|–—-]+\s*([^\n]{0,80})/g,
  )) {
    const name = m[1].replace(/\s+/g, " ").trim();
    const ctx = m[2] || "";
    if (name.split(/\s+/).length < 2 || name.length > 40) continue;
    if (/Rathburn|Auburn|Indiana|Contact|Request|About|Precision/i.test(name)) continue;
    if (!roleRe.test(ctx) && !roleRe.test(name)) continue;
    const key = name.toLowerCase();
    if (seenPerson.has(key)) continue;
    seenPerson.add(key);
    const roleM = (ctx + " " + name).match(roleRe);
    people.push({ name, role: roleM ? roleM[1] : null, sourceUrls: [page.url] });
  }

  for (const pair of [
    [/Angie\s+Holt|Angela\s+Holt/gi, "President / CEO"],
    [/Jerry\s+Rathburn/gi, "Founder"],
    [/Doug\s+Cartee/gi, "Technical Sales"],
    [/April\s+Winfield/gi, "Operations Manager"],
    [/Patrick\s+Martin/gi, "Engineering Manager"],
    [/April\s+Dobson/gi, "Quality Manager"],
    [/Shay\s+Barry/gi, "Human Resources"],
  ]) {
    const re = pair[0];
    let mm;
    while ((mm = re.exec(plain))) {
      const name = mm[0].replace(/\s+/g, " ").trim();
      const key = name.toLowerCase();
      if (seenPerson.has(key)) continue;
      seenPerson.add(key);
      people.push({ name, role: pair[1], sourceUrls: [page.url] });
    }
  }

  return { url: page.url, ok: page.ok, emails: [...emails], phones: [...phones], people };
}

function extractFromSnippets(items) {
  const emails = new Set();
  const phones = new Set();
  const people = [];
  const seen = new Set();
  for (const it of items) {
    const text = `${it.title || ""} ${it.snippet || ""} ${it.content || ""}`;
    for (const m of text.matchAll(
      /\b([a-z0-9._%+\-]+@(?:rathburnmachining|rathburntool)\.com)\b/gi,
    )) {
      emails.add(m[1].toLowerCase());
    }
    for (const m of text.matchAll(
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    )) {
      phones.add(m[0].trim());
    }
    for (const pair of [
      [/Angie\s+Holt|Angela\s+\(Angie\)\s+Holt|Angela\s+Holt/gi, "President / CEO"],
      [/Jerry\s+Rathburn/gi, "Founder"],
      [/Doug\s+Cartee/gi, "Technical Sales"],
    ]) {
      let mm;
      const re = pair[0];
      while ((mm = re.exec(text))) {
        const name = mm[0].replace(/\s+/g, " ").trim();
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        people.push({
          name,
          role: pair[1],
          sourceUrls: [it.link || it.url].filter(Boolean),
        });
      }
    }
  }
  return { emails: [...emails], phones: [...phones], people };
}

function isOrgEmail(e) {
  return /^(info|sales|admin|contact|office|support|hello|mail)@/i.test(e);
}

async function main() {
  const report = {
    target: TARGET,
    ranAt: new Date().toISOString(),
    mode: "holdout-apex-extractor",
    searches: {},
    pages: [],
    whois: {},
    merged: { emails: [], phones: [], people: [], orgEmails: [], personalEmails: [] },
  };

  const queries = [
    TARGET.query,
    `"${TARGET.name}" OR "${TARGET.alt}" (email OR contact OR president) Auburn`,
    `site:rathburnmachining.com contact`,
    `Angie Holt Rathburn email`,
  ];

  const allSnippetItems = [];
  for (const q of queries) {
    const [tav, serp] = await Promise.all([tavilySearch(q), serpSearch(q)]);
    report.searches[q] = {
      tavilyStatus: tav.status,
      tavilyN: tav.results.length,
      serpStatus: serp.status,
      serpN: serp.organic.length,
    };
    allSnippetItems.push(
      ...tav.results.map((r) => ({
        title: r.title,
        snippet: r.content || r.snippet,
        link: r.url,
        content: r.content,
      })),
      ...serp.organic,
    );
  }

  const seedUrls = [
    "https://rathburnmachining.com/contacts/",
    "https://rathburnmachining.com/",
    "https://rathburnmachining.com/01-featured_content/rathburn-tool-manufacturing-changing-name-to-rathburn-precision-machining/",
  ];
  const fromSearch = allSnippetItems
    .map((x) => x.link)
    .filter((u) => u && /rathburn/i.test(u))
    .slice(0, 8);
  const urls = [...new Set([...seedUrls, ...fromSearch])];

  for (const u of urls) {
    const page = await fetchHtml(u);
    const ex = extractFromHtml(page);
    report.pages.push({
      url: u,
      ok: page.ok,
      status: page.status,
      emails: ex.emails,
      phones: ex.phones,
      people: ex.people,
    });
  }

  for (const d of TARGET.domains) {
    report.whois[d] = await whoisJson(d);
  }

  const snip = extractFromSnippets(allSnippetItems);
  const emailSet = new Set([...snip.emails]);
  const phoneSet = new Set([...snip.phones]);
  const peopleMap = new Map();

  for (const p of snip.people) {
    const k = p.name.toLowerCase();
    if (!peopleMap.has(k)) peopleMap.set(k, p);
  }
  for (const page of report.pages) {
    for (const e of page.emails || []) emailSet.add(e);
    for (const ph of page.phones || []) phoneSet.add(ph);
    for (const p of page.people || []) {
      const k = p.name.toLowerCase();
      if (!peopleMap.has(k)) peopleMap.set(k, p);
      else {
        const cur = peopleMap.get(k);
        cur.sourceUrls = [...new Set([...(cur.sourceUrls || []), ...(p.sourceUrls || [])])];
        if (!cur.role && p.role) cur.role = p.role;
      }
    }
  }

  const emails = [...emailSet];
  report.merged.emails = emails;
  report.merged.phones = [...phoneSet];
  report.merged.people = [...peopleMap.values()];
  report.merged.orgEmails = emails.filter(isOrgEmail);
  report.merged.personalEmails = emails.filter((e) => !isOrgEmail(e) && DOMAIN_RE.test(e));
  report.score = {
    personalEmails: report.merged.personalEmails.length,
    orgEmails: report.merged.orgEmails.length,
    peopleWithRoles: report.merged.people.filter((p) => p.role).length,
    peopleTotal: report.merged.people.length,
    phones: report.merged.phones.length,
  };

  writeFileSync(
    "scripts/holdout-rathburn-apex-result.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ ok: true, score: report.score, personalEmails: report.merged.personalEmails, people: report.merged.people }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
