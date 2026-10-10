import { describe, expect, it } from "vitest";
import { sanitizeUrlForEvidence, sanitizeUrlsInText } from "../lib/url-privacy";
import { buildClaimSupportGraph, countIndependentSourceHosts, graphHasIndependentCorroboration, meetsTwoSourceRule, isAggregatorHost, hostnameOf, observationsFromSourceUrls, publisherDomain, validateClaimSupportGraph } from "../lib/source-corroboration";
describe("source-corroboration",()=>{
 it("does not persist URL credentials or secret-like query parameters",()=>{const raw="https://user:password@example.com/contact?access_token=top-secret-token&ref=profile#access_token=fragment-secret&display=full";const safe=sanitizeUrlForEvidence(raw);expect(safe).toContain("example.com/contact");expect(safe).toContain("ref=profile");expect(safe).not.toContain("user");expect(safe).not.toContain("password");expect(safe).not.toContain("top-secret-token");expect(safe).not.toContain("fragment-secret");const observations=observationsFromSourceUrls([raw]);expect(observations).toHaveLength(1);expect(observations[0].sourceUrl).not.toContain("top-secret-token");expect(observations[0].sourceUrl).not.toContain("fragment-secret");});

 it("redacts provider-specific signed URL parameters",()=>{
  const raw="https://example.test/object?X-Amz-Signature=aws-signature-secret&X-Amz-Credential=AWSACCESSKEY%2Fscope&X-Amz-Security-Token=temporary-token&X-Goog-Signature=google-signature-secret&safe=public#X-Goog-Credential=fragment-credential";
  const safe=sanitizeUrlForEvidence(raw);
  expect(safe).toContain("safe=public");
  for (const secret of ["aws-signature-secret","AWSACCESSKEY","temporary-token","google-signature-secret","fragment-credential"]) expect(safe).not.toContain(secret);
  expect(safe).toContain("X-Amz-Signature=%5BREDACTED%5D");
  expect(safe).toContain("X-Goog-Signature=%5BREDACTED%5D");
 });
 it("redacts OAuth secrets inside route-style URL fragments and arbitrary observed text",()=>{
   const raw="https://example.com/#/callback?access_token=fragment-route-secret&state=preserve-me";
   const safe=sanitizeUrlForEvidence(raw);
   expect(safe).toContain("/callback");
   expect(safe).toContain("state=preserve-me");
   expect(safe).not.toContain("fragment-route-secret");
   const text=sanitizeUrlsInText("Redirected to "+raw+" and https://cdn.example/file?X-Amz-Signature=cloud-secret.");
   expect(text).not.toContain("fragment-route-secret");
   expect(text).not.toContain("cloud-secret");
   expect(text).toContain("and ");
 });
 it("preserves safe excerpts when a source URL is redacted",()=>{
   const raw="https://example.com/contact?access_token=excerpt-secret&ref=public";
   const observations=observationsFromSourceUrls([raw],{observedAt:"2026-10-09T00:00:00.000Z",excerptByUrl:{[raw]:"Alice Example contact page; see "+raw},idPrefix:"privacy-excerpt"});
   expect(observations).toHaveLength(1);
   expect(observations[0].sourceUrl).toContain("ref=public");
   expect(observations[0].excerpt).toContain("Alice Example contact page");
   expect(observations[0].excerpt).not.toContain("excerpt-secret");
 });
  it("parses hostname",()=>{expect(hostnameOf("https://www.example.com/path")).toBe("example.com");});
 it("detects aggregator hosts",()=>{expect(isAggregatorHost("zoominfo.com")).toBe(true);expect(isAggregatorHost("www.thatsthem.com")).toBe(true);expect(isAggregatorHost("crunchbase.com")).toBe(true);expect(isAggregatorHost("sec.gov")).toBe(false);});
 it("normalizes a DNS root dot before aggregator filtering and source counting",()=>{expect(hostnameOf("https://www.zoominfo.com./p/a")).toBe("zoominfo.com");expect(isAggregatorHost("zoominfo.com.")).toBe(true);expect(countIndependentSourceHosts(["https://zoominfo.com./p/a","https://apollo.io./p/b"])).toBe(0);});
 it("collapses multiple aggregator URLs to zero independent buckets",()=>{expect(countIndependentSourceHosts(["https://www.zoominfo.com/p/a","https://rocketreach.co/b","https://apollo.io/c","https://thatsthem.com/x","https://crunchbase.com/org/x"])).toBe(0);});
 it("keeps unrelated registrable domains distinct under nested country-code registries",()=>{expect(publisherDomain("alpha.co.in")).toBe("alpha.co.in");expect(publisherDomain("beta.co.in")).toBe("beta.co.in");expect(publisherDomain("alpha.com.ua")).toBe("alpha.com.ua");expect(publisherDomain("beta.com.ua")).toBe("beta.com.ua");expect(countIndependentSourceHosts(["https://alpha.co.in/contact","https://beta.co.in/team"])).toBe(2);expect(countIndependentSourceHosts(["https://alpha.com.ua/about","https://beta.com.ua/contact"])).toBe(2);});
 it("normalizes registrable publisher roots and preserves IP literals",()=>{expect(publisherDomain("www.investor.example.co.uk")).toBe("example.co.uk");expect(publisherDomain("192.0.1.1")).toBe("192.0.1.1");expect(publisherDomain("[2001:4860::1]")).toBe("[2001:4860::1]");});
 it("collapses subdomains of one publisher into one independent bucket",()=>{expect(countIndependentSourceHosts(["https://www.example.com/about","https://investor.example.com/contact","https://press.example.com/news"])).toBe(1);expect(meetsTwoSourceRule(["https://investor.example.com/contact","https://press.example.com/news"])).toBe(false);});
 it("counts primary hosts separately (two-source rule)",()=>{const urls=["https://www.sec.gov/Archives/edgar/data/1/a.htm","https://investor.example.com/contact"];expect(countIndependentSourceHosts(urls)).toBe(2);expect(meetsTwoSourceRule(urls)).toBe(true);});
 it("one primary + aggregator is not two independent sources",()=>{const urls=["https://investor.example.com/contact","https://www.zoominfo.com/p/x"];expect(countIndependentSourceHosts(urls)).toBe(1);expect(meetsTwoSourceRule(urls)).toBe(false);expect(meetsTwoSourceRule(["https://www.zoominfo.com/p/x"])).toBe(false);});
 it("represents multiple observations supporting one claim without promoting it",()=>{const observations=observationsFromSourceUrls(["https://company.example/about","https://filings.example/2026/proxy"],{observedAt:"2026-09-11T12:00:00.000Z",runId:"run-1",caseId:42,collectionMethod:"browser_fetch",idPrefix:"run-1:claim-1"});const graph=buildClaimSupportGraph({id:"claim:person-role",subject:"John Smith",predicate:"role",object:"CFO of Company X",scope:"candidate",personName:"John Smith"},observations);expect(graph.claims).toHaveLength(1);expect(graph.observations).toHaveLength(2);expect(new Set(graph.observations.map(o=>o.id)).size).toBe(2);expect(graph.edges).toHaveLength(2);expect(graph.edges.every(edge=>edge.kind==="supports")).toBe(true);expect(graphHasIndependentCorroboration(graph)).toBe(true);expect(validateClaimSupportGraph(graph).valid).toBe(true);});
 it("rejects a graph containing an unattributed observation",()=>{const observations=observationsFromSourceUrls(["https://one.example/a"],{observedAt:"2026-09-11T12:00:00.000Z",idPrefix:"test"});const graph=buildClaimSupportGraph({id:"claim:test",subject:"A",predicate:"email",object:"a@example.com",scope:"candidate",personName:"A"},observations);graph.observations.push({...observationsFromSourceUrls(["https://unattributed.example/b"],{observedAt:"2026-09-11T12:00:00.000Z",idPrefix:"unattributed"})[0]});expect(validateClaimSupportGraph(graph)).toEqual({valid:false,reason:"graph contains unattributed observations"});});
 it("rejects a dangling support edge",()=>{const observations=observationsFromSourceUrls(["https://one.example/a"],{observedAt:"2026-09-11T12:00:00.000Z",idPrefix:"dangling"});const graph=buildClaimSupportGraph({id:"claim:dangling",subject:"A",predicate:"role",object:"CFO",scope:"candidate"},observations);graph.edges.push({from:"claim:dangling",to:"observation:missing",kind:"supports",createdAt:"2026-09-11T12:00:00.000Z"});expect(validateClaimSupportGraph(graph)).toEqual({valid:false,reason:"claim has a dangling supporting edge"});});
});