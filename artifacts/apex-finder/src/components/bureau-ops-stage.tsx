function humanStageTitle(stage: string | undefined, tool: string): string {
  const s = `${stage || ""} ${tool || ""}`.toLowerCase();
  if (/discover|ingest|western|hnwi.?pool|broad.?categor/i.test(s)) return "Finding new people";
  if (/edgar|proxy|sec\b|13d|13g|form\s*[34]/i.test(s)) return "Reading company filings";
  if (/companies.?house|opencorporates|registry/i.test(s)) return "Checking company records";
  if (/domain|whois|rdap|dns/i.test(s)) return "Checking websites";
  if (/adaptive|director|research director/i.test(s)) return "Choosing next research step";
  if (/tavily|exa|serper|serp|web.?search|provider fan/i.test(s)) return "Searching the web";
  if (/social|messenger|linkedin|sherlock|maigret/i.test(s)) return "Checking social profiles";
  if (/in-?house|osint|holehe/i.test(s)) return "Running contact tools";
  if (/ensemble|adjudic|final.?review|persona/i.test(s)) return "Reviewing what we found";
  if (/contact.?route|email|phone|mailto/i.test(s)) return "Looking for contact details";
  if (/enrich|phase\s*j|attribution/i.test(s)) return "Deepening the case file";
  if (/graph|relationship/i.test(s)) return "Linking people and companies";
  if (stage && stage.length < 40 && !isLogGarbage(stage)) {
    return stage.replace(/[_·]+/g, " ").replace(/\s+/g, " ").trim();
  }
  return "Recorded research activity";
}