import { describe, expect, it } from "vitest";
import {
  hasCredibleDiscoveryWealthPotentialSignal,
  hasDiscoveryOwnershipLeadSignal,
} from "./candidate-source-url-union";

describe("discovery review-lead ownership boundary", () => {
  const noMaterialityYet = [{
    action: "visit",
    execution: "success",
    sourceUrl: "https://registry.example/companies/northstar-solar",
    observation: "Jane Doe is the founder and co-owner of Northstar Solar GmbH. The filing names Jane Doe as founder and co-owner.",
  }];

  it("accepts an exact person with an observed ownership clue even when materiality is unresolved", () => {
    expect(hasDiscoveryOwnershipLeadSignal({
      personName: "Jane Doe",
      role: "Founder and co-owner",
      observations: noMaterialityYet,
    })).toBe(true);
    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Doe",
      role: "Founder and co-owner",
      observations: noMaterialityYet,
    })).toBe(false);
  });

  it("does not admit a senior employee based on title alone", () => {
    const observations = [{
      ...noMaterialityYet[0],
      observation: "Jane Doe is the chief executive officer of Northstar Solar GmbH.",
    }];
    expect(hasDiscoveryOwnershipLeadSignal({
      personName: "Jane Doe",
      role: "Chief Executive Officer",
      observations,
    })).toBe(false);
  });

  it("rejects search results, unvisited sources, and unrelated ownership text", () => {
    expect(hasDiscoveryOwnershipLeadSignal({
      personName: "Jane Doe",
      role: "Founder",
      observations: [{
        action: "web_search",
        execution: "success",
        sourceUrl: "https://registry.example/companies/northstar-solar",
        observation: "Jane Doe is the founder and owner.",
      }],
    })).toBe(false);
    expect(hasDiscoveryOwnershipLeadSignal({
      personName: "Jane Doe",
      role: "Founder",
      observations: [{
        action: "visit",
        execution: "success",
        sourceUrl: "https://google.com/search?q=jane",
        observation: "Jane Doe is the founder and owner.",
      }],
    })).toBe(false);
    expect(hasDiscoveryOwnershipLeadSignal({
      personName: "Jane Doe",
      role: "Founder",
      observations: [{
        action: "visit",
        execution: "success",
        sourceUrl: "https://registry.example/companies/northstar-solar",
        observation: "Jane Doe works at Northstar Solar. The company's founder and co-owner is Alex Roe.",
      }],
    })).toBe(false);
  });

  it("still recognizes materiality when the source actually supplies it", () => {
    const observations = [{
      ...noMaterialityYet[0],
      observation: "Jane Doe is the founder and co-owner of Northstar Solar GmbH, which reports annual revenue of €25 million.",
    }];
    expect(hasDiscoveryOwnershipLeadSignal({
      personName: "Jane Doe",
      role: "Founder and co-owner",
      observations,
    })).toBe(true);
    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Doe",
      role: "Founder and co-owner",
      observations,
    })).toBe(true);
  });
});
