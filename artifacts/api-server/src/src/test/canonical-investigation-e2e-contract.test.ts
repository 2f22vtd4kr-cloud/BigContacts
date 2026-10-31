import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error The workflow helper is plain ESM JavaScript and is loaded directly by Node in CI.
import { getCanonicalDiscoveryCaseId, verifyCanonicalCardProof, verifyResearchEvidenceRows, verifyModelAudit } from "../../../../../scripts/verify-canonical-card-proof.mjs";

const apiRoot = process.cwd();
const readApi = (path: string) => readFileSync(resolve(apiRoot, path), "utf8");
const readRepo = (path: string) => readFileSync(resolve(apiRoot, "../..", path), "utf8");
const readFrontend = (path: string) => readFileSync(resolve(apiRoot, "../apex-finder", path), "utf8");

const sourceUrl = "https://registry.example.test/company/7";

function modelAuditBlock(kind: "request" | "response", record: Record<string, unknown>) {
  const json = JSON.stringify(record, null, 2);
  const backtick = String.fromCharCode(96);
  const longestBacktickRun = Math.max(0, ...(json.match(/`+/g) ?? []).map((run) => run.length));
  const fence = backtick.repeat(Math.max(3, longestBacktickRun + 1));
  return "### Model " + kind + " " + String(record.requestId) + "\n\n" + fence + "json\n" + json + "\n" + fence + "\n";
}

function successfulModelAudit(omitRole?: string, jobId = "job-qa-1") {
  const roles = [
    ["groq_boss", "llama-3.3-70b-versatile"],
    ["groq_right_hand", "llama-3.3-70b-versatile"],
    ["groq_investigator", "openai/gpt-oss-120b"],
  ] as const;
  return roles.filter(([role]) => role !== omitRole).map(([role, model], index) => {
    const requestId = "request-" + role;
    const request = {
      event: "atlas_model_request",
      requestId,
      provider: "groq",
      role,
      model,
      attempt: 1,
      jobId,
      caseId: 42,
      requestSummary: index === 0 ? { messages: [{ role: "user", content: String.fromCharCode(96).repeat(3) }] } : {},
    };
    const response = {
      event: "atlas_model_response",
      requestId,
      provider: "groq",
      role,
      model,
      httpStatus: 200,
      latencyMs: 100,
      transportFailure: null,
      response: {
        jsonParsed: true,
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
        choices: [{ index: 0 }],
      },
    };
    return modelAuditBlock("request", request) + modelAuditBlock("response", response);
  }).join("\n");
}
const releasedLane = { type: "atlas-run", active: false, jobId: null, job: null };

function companyProof(overrides: {
  status?: string;
  finding?: Record<string, unknown>;
  sourceExecution?: string;
  sourceAction?: string;
  sourceUrlsInEvent?: boolean;
  sourceUrls?: string[];
  entityName?: string;
  dashboardName?: string;
  activeLane?: Record<string, unknown>;
} = {}) {
  const entityName = overrides.entityName ?? "Example Holdings";
  const dashboardName = overrides.dashboardName ?? entityName;
  const finding = overrides.finding ?? {
    value: entityName,
    scope: "organization",
    promotionDecision: "promote",
    sourceUrls: [sourceUrl],
  };
  const job = {
    jobId: "job-qa-1",
    status: overrides.status ?? "failed",
    outcome: overrides.status === "done" ? "complete" : "incomplete",
    result: JSON.stringify({
      discovery: { caseId: 42 },
      boss: { status: "completed", investigatorLlm: "groq-investigator-120b" },
      rightHand: { status: "completed", approval: "approve", decision: "Scope is evidence-grounded.", reason: "The proposed opening is executable and aligned." },
    }),
  };
  const entitiesPayload = [{
    id: 7,
    name: entityName,
    type: "Corporation",
    metadata: JSON.stringify({ partialOrganizationLead: true, reviewOnly: true }),
  }];
  const dashboard = {
    leads: [{
      entityId: 7,
      entityName: dashboardName,
      entityType: "Corporation",
      stage: "partial_review",
      verificationLevel: "fetched_source",
      sourceUrls: overrides.sourceUrls ?? [sourceUrl],
    }],
  };
  const caseEvents = [{
    id: 11,
    actorRole: "head_investigator",
    eventType: "tool_observation",
    payload: JSON.stringify({
      action: overrides.sourceAction ?? "registry_search",
      jobId: "job-qa-1",
      runId: "run-qa-1",
      runModel: "groq-investigator-120b",
      execution: overrides.sourceExecution ?? "success",
      observation: "Official registry record: Example Holdings",
      leadUrls: overrides.sourceUrlsInEvent === false ? [] : [sourceUrl],
      findings: [finding],
    }),
  }];
  return {
    job,
    applicationRevision: "a".repeat(40),
    entitiesPayload,
    dashboard,
    caseData: { id: 42, caseFile: JSON.stringify({ investigatorLlm: "groq-investigator-120b" }) },
    activeAtlasLane: overrides.activeLane ?? releasedLane,
    caseEvents,
  };
}

describe("canonical investigation end-to-end acceptance proof", () => {
  it("accepts a model-selected company card even when a later control turn fails", () => {
    const result = verifyCanonicalCardProof(companyProof());
    expect(result).toMatchObject({
      acceptance: "PASS",
      jobId: "job-qa-1",
      caseId: 42,
      terminalJobStatus: "failed",
      outcome: "incomplete",
      entityId: 7,
      entityName: "Example Holdings",
      entityType: "Corporation",
      investigatorSelected: true,
      investigatorPromotion: "promote",
      entityProjection: "matched",
      dashboardProjection: "matched",
      activeAtlasLock: "released",
      acceptedAfterControlFailure: true,
    });
    expect(result.sourceUrl).toBe(sourceUrl);
    expect(result.sourceEventId).toBe(11);
  });

  it("accepts a persisted card after a truthful operator cancellation and released lock", () => {
    const proof = companyProof({ status: "cancelled" });
    expect(verifyCanonicalCardProof(proof)).toMatchObject({
      acceptance: "PASS",
      terminalJobStatus: "cancelled",
      outcome: "incomplete",
      entityName: "Example Holdings",
      activeAtlasLock: "released",
      acceptedAfterControlFailure: false,
    });
  });

  it("proves successful real provider calls for Boss, Right-hand and Investigator and reports usage", () => {
    const proof = verifyModelAudit({
      proof: { jobId: "job-qa-1", caseId: 42 },
      auditText: successfulModelAudit(),
    });
    expect(proof.modelAudit).toMatchObject({
      totalRequests: 3,
      totalResponses: 3,
      successfulResponses: 3,
      totalPromptTokens: 300,
      totalCompletionTokens: 60,
      totalTokens: 360,
      totalLatencyMs: 300,
      fallbackRoles: [],
      byRole: {
        groq_boss: { successfulCalls: 1, promptTokens: 100, completionTokens: 20 },
        groq_right_hand: { successfulCalls: 1, promptTokens: 100, completionTokens: 20 },
        groq_investigator: { successfulCalls: 1, promptTokens: 100, completionTokens: 20 },
      },
    });
  });

  it("rejects a model audit that lacks a successful call for any required role", () => {
    expect(() => verifyModelAudit({
      proof: { jobId: "job-qa-1", caseId: 42 },
      auditText: successfulModelAudit("groq_right_hand"),
    })).toThrow(/groq_right_hand/);
  });

  it("rejects model audit calls explicitly bound to another job", () => {
    expect(() => verifyModelAudit({
      proof: { jobId: "job-qa-1", caseId: 42 },
      auditText: successfulModelAudit(undefined, "another-job"),
    })).toThrow(/groq_boss/);
  });

  it("requires a durable research_evidence row bound to the exact job, case, source and supporting event", () => {
    const proof = verifyCanonicalCardProof(companyProof());
    const verified = verifyResearchEvidenceRows({
      proof,
      caseEvents: companyProof().caseEvents,
      rows: [{
        id: 91,
        entityId: 7,
        sessionId: 501,
        claimType: "partial_organization_lead",
        sourceName: "canonical-agentic-discovery",
        sourceDomain: "registry.example.test",
        sourceUrl,
        status: "review",
        confidence: 0.25,
        metadata: JSON.stringify({
          partialReview: true,
          verificationLevel: "fetched_source",
          discoveryCaseId: 42,
          atlasJobId: "job-qa-1",
          supportingEventId: 11,
          noOwnershipOrWealthConclusion: true,
        }),
      }],
    });
    expect(verified).toMatchObject({
      evidenceIds: [91],
      evidenceSupportEventIds: [11],
      evidenceRows: [{ claimType: "partial_organization_lead", status: "review", sessionId: 501 }],
    });
  });

  it("rejects an evidence row that is not linked to this job and source observation", () => {
    const proof = verifyCanonicalCardProof(companyProof());
    expect(() => verifyResearchEvidenceRows({
      proof,
      caseEvents: companyProof().caseEvents,
      rows: [{
        id: 92,
        entityId: 7,
        sessionId: 502,
        claimType: "partial_organization_lead",
        sourceUrl,
        status: "review",
        confidence: 0.25,
        metadata: JSON.stringify({
          partialReview: true,
          discoveryCaseId: 42,
          atlasJobId: "another-job",
          supportingEventId: 11,
        }),
      }],
    })).toThrow(/No durable review-status research_evidence row/);
  });

  it("accepts an exact short person name only when the Investigator explicitly promotes the role-bound finding", () => {
    const personUrl = "https://company.example.test/team/li";
    const finding = {
      value: "Founder",
      scope: "candidate",
      personName: "Li",
      role: "Founder",
      promotionDecision: "promote",
      sourceUrls: [personUrl],
    };
    const result = verifyCanonicalCardProof({
      applicationRevision: "b".repeat(40),
      job: {
        jobId: "job-qa-person",
        status: "done",
        outcome: "complete",
        result: JSON.stringify({
          discovery: { caseId: 43 },
          boss: { status: "completed", investigatorLlm: "groq-investigator-120b" },
          rightHand: { status: "completed", approval: "approve", decision: "The scope is appropriate.", reason: "A public source path is defensible." },
        }),
      },
      entitiesPayload: [{
        id: 8,
        name: "Li",
        type: "PersonCandidate",
        metadata: JSON.stringify({ reviewOnly: true, admission: "investigator-explicit-promotion" }),
      }],
      dashboard: { leads: [{
        entityId: 8,
        entityName: "Li",
        entityType: "PersonCandidate",
        stage: "candidate_review",
        sourceUrls: [personUrl],
      }] },
      caseData: { id: 43, caseFile: JSON.stringify({ investigatorLlm: "groq-investigator-120b" }) },
      activeAtlasLane: releasedLane,
      caseEvents: [{
        id: 12,
        actorRole: "head_investigator",
        eventType: "tool_observation",
        payload: JSON.stringify({
          action: "visit",
          jobId: "job-qa-person",
          runId: "run-qa-person",
          runModel: "groq-investigator-120b",
          execution: "success",
          observation: "Li is the Founder of Example Holdings.",
          observedUrls: [personUrl],
          findings: [finding],
        }),
      }],
    });
    expect(result).toMatchObject({
      acceptance: "PASS",
      caseId: 43,
      entityName: "Li",
      entityType: "PersonCandidate",
      investigatorSelected: true,
    });
  });

  it("requires completed Boss and Right-hand decisions before accepting a card", () => {
    const proof = companyProof();
    proof.job.result = JSON.stringify({
      discovery: { caseId: 42 },
      boss: { status: "completed", investigatorLlm: "groq-investigator-120b" },
      rightHand: { status: "unavailable", approval: null, decision: null, reason: null },
    });
    expect(() => verifyCanonicalCardProof(proof)).toThrow(/completed Right-hand review/);
  });

  it("accepts a source observation from a model-selected OSINT worker without a search-tool preference", () => {
    const result = verifyCanonicalCardProof(companyProof({
      sourceAction: "footprint_spiderfoot",
      sourceUrlsInEvent: false,
    }));
    expect(result).toMatchObject({
      acceptance: "PASS",
      entityName: "Example Holdings",
      investigatorSelected: true,
    });
  });

  it("rejects a deterministic search-title extraction that has no Investigator promotion decision", () => {
    const finding = {
      value: "Example Holdings",
      scope: "organization",
      sourceUrls: [sourceUrl],
      note: "LOW-CONFIDENCE REVIEW-ONLY COMPANY LEAD; deterministic title extraction",
    };
    expect(() => verifyCanonicalCardProof(companyProof({ finding }))).toThrow(
      /explicitly selected and promoted by the Investigator/,
    );
  });

  it("accepts a model explicitly selected by a recorded same-role quota fallback", () => {
    const proof = companyProof();
    proof.caseData.caseFile = JSON.stringify({
      investigatorLlm: "groq-investigator-20b",
      investigatorCapabilityHistory: [{
        from: "groq-investigator-120b",
        to: "groq-investigator-20b",
        trigger: "upstream_quota_exhausted",
      }],
    });
    const payload = JSON.parse(proof.caseEvents[0]!.payload as string);
    payload.runModel = "groq-investigator-20b";
    proof.caseEvents[0]!.payload = JSON.stringify(payload);
    expect(verifyCanonicalCardProof(proof)).toMatchObject({
      acceptance: "PASS",
      entityName: "Example Holdings",
      investigatorSelected: true,
    });
  });

  it("rejects an Investigator capability not recorded by Boss selection or case fallback history", () => {
    const proof = companyProof();
    const payload = JSON.parse(proof.caseEvents[0]!.payload as string);
    payload.runModel = "unrecorded-investigator";
    proof.caseEvents[0]!.payload = JSON.stringify(payload);
    expect(() => verifyCanonicalCardProof(proof)).toThrow(
      /explicitly selected and promoted by the Investigator/,
    );
  });

  it("requires the case read-back to match the exact case ID from the launch result", () => {
    const proof = companyProof();
    proof.caseData.id = 999;
    expect(() => verifyCanonicalCardProof(proof)).toThrow(/exact discovery case ID/);
  });

  it("rejects an otherwise valid finding from a different job in the same case ledger", () => {
    const proof = companyProof();
    const payload = JSON.parse(proof.caseEvents[0]!.payload as string);
    payload.jobId = "older-job";
    proof.caseEvents[0]!.payload = JSON.stringify(payload);
    expect(() => verifyCanonicalCardProof(proof)).toThrow(/explicitly selected and promoted by the Investigator/);
  });

  it("rejects a card whose entity metadata does not keep it explicitly review-only", () => {
    const proof = companyProof();
    proof.entitiesPayload[0]!.metadata = JSON.stringify({ partialOrganizationLead: true, reviewOnly: false });
    expect(() => verifyCanonicalCardProof(proof)).toThrow(
      /explicitly selected and promoted by the Investigator/,
    );
  });

  it("rejects a partial lead with an unknown verification label", () => {
    const proof = companyProof();
    proof.dashboard.leads[0]!.verificationLevel = "unknown";
    expect(() => verifyCanonicalCardProof(proof)).toThrow(
      /explicitly selected and promoted by the Investigator/,
    );
  });

  it("accepts a partial tool result only when the exact card source is in a successful sub-result", () => {
    expect(verifyCanonicalCardProof(companyProof({ sourceExecution: "partial" }))).toMatchObject({
      acceptance: "PASS",
      entityName: "Example Holdings",
    });
    expect(() => verifyCanonicalCardProof(companyProof({
      sourceExecution: "partial",
      sourceUrlsInEvent: false,
    }))).toThrow(/explicitly selected and promoted by the Investigator/);
  });

  it("rejects a candidate whose source event failed, even if a card row exists", () => {
    expect(() => verifyCanonicalCardProof(companyProof({ sourceExecution: "error" }))).toThrow(
      /explicitly selected and promoted by the Investigator/,
    );
  });

  it("rejects a candidate when its card source URL is not bound to the model finding and successful event", () => {
    expect(() => verifyCanonicalCardProof(companyProof({
      sourceUrls: ["https://other.example.test/unrelated"],
    }))).toThrow(/explicitly selected and promoted by the Investigator/);
  });

  it("rejects an API entity projection that does not match the dashboard card identity", () => {
    expect(() => verifyCanonicalCardProof(companyProof({ dashboardName: "Different Holdings" }))).toThrow(
      /explicitly selected and promoted by the Investigator/,
    );
  });

  it("requires exact application revision and Investigator episode IDs", () => {
    const proof = companyProof();
    proof.applicationRevision = "unknown";
    expect(() => verifyCanonicalCardProof(proof)).toThrow(/40-character application revision/);
    proof.applicationRevision = "a".repeat(40);
    const payload = JSON.parse(proof.caseEvents[0]!.payload as string);
    delete payload.runId;
    proof.caseEvents[0]!.payload = JSON.stringify(payload);
    expect(() => verifyCanonicalCardProof(proof)).toThrow(/explicitly selected and promoted by the Investigator/);
  });

  it("rejects an inconsistent terminal outcome", () => {
    const proof = companyProof();
    proof.job.outcome = "complete";
    expect(() => verifyCanonicalCardProof(proof)).toThrow(/outcome is missing or inconsistent/);
  });

  it("never accepts a terminal card while the canonical Atlas lock remains active", () => {
    expect(() => verifyCanonicalCardProof(companyProof({
      activeLane: { type: "atlas-run", active: true, jobId: "job-qa-1", job: { status: "failed" } },
    }))).toThrow(/active Atlas lock was not proven released/);
  });

  it("extracts the discovery case identifier from the terminal job result", () => {
    expect(getCanonicalDiscoveryCaseId({
      result: JSON.stringify({ discovery: { caseId: 123 } }),
    })).toBe(123);
    expect(getCanonicalDiscoveryCaseId({ result: "{malformed" })).toBeNull();
  });
});

describe("canonical application path is wired to the acceptance proof", () => {
  it("connects the canonical launch, durable Investigator trajectory, admission, and read-back projections", () => {
    const launch = readApi("src/src/routes/research/canonical-atlas-launch.ts");
    const routeIndex = readApi("src/src/routes/index.ts");
    const pass = readApi("src/src/lib/bureau-agentic-pass.ts");
    const canonical = readApi("src/src/lib/canonical-atlas-discovery.ts");
    const dashboardRoute = readApi("src/src/routes/dashboard.ts");
    const entitiesRoute = readApi("src/src/routes/entities.ts");
    const dashboardPage = readFrontend("src/pages/dashboard.tsx");
    const frontendRouter = readFrontend("src/router.tsx");
    const profilePage = readFrontend("src/pages/profile.tsx");
    const runtimeWorkflow = readRepo(".github/workflows/apex-canonical-runtime-proof.yml");

    expect(launch).toContain('router.post("/ingest/atlas-run"');
    expect(routeIndex).toContain("router.use(canonicalAtlasLaunchRouter)");
    expect(routeIndex).toContain("router.use(atlasRouter)");
    expect(routeIndex.indexOf("router.use(canonicalAtlasLaunchRouter)"))
      .toBeLessThan(routeIndex.indexOf("router.use(atlasRouter)"));
    expect(launch).toContain("runCanonicalAtlasPipeline");
    expect(launch).toContain("reconcileOrganizationReviewCardsForJob");
    expect(launch).toContain("reconcilePersonReviewCardsForJob");
    expect(launch).toContain("releaseCanonicalJob");
    expect(launch).toContain("status(202)");
    expect(runtimeWorkflow).toContain("POST http://127.0.0.1:8080/api/ingest/atlas-run");
    expect(pass).toContain("persistDiscoveryTrajectory");
    expect(pass).toContain("onDiscoveryCheckpoint");
    expect(pass).toContain("tool_observation");
    expect(canonical).toContain("checkpointCanonicalDiscoveryFindings");
    expect(canonical).toContain("materializeAtlasAdmissions");
    expect(canonical).toContain("clearActiveJobIfOwned");
    expect(dashboardRoute).toContain('eq(researchEvidenceTable.claimType, "identity_candidate")');
    expect(dashboardRoute).toContain('evidenceMetadata.promotionDecision !== "promote"');
    expect(dashboardRoute).toContain("supportingEventId");
    expect(entitiesRoute).toContain("res.json({\n    ...entity");
    expect(dashboardPage).toContain("/api/dashboard/research-leads?limit=8");
    expect(dashboardPage).toContain("function ReviewLeadCard(");
    expect(dashboardPage).toContain("lead.sourceUrls");
    expect(dashboardPage).toContain('href={`/profile/${lead.entityId}`}');
    expect(frontendRouter).toContain('Route path="/profile/:id" component={ProfileRoute}');
    expect(profilePage).toContain("data-testid=\"discovery-evidence-hierarchy\"");
    expect(profilePage).toContain("Source trail");
    expect(profilePage).toContain("meta.limitations");
    const workflowTriggers = runtimeWorkflow.split("\n").slice(0, 20).join("\n");
    expect(workflowTriggers).toContain("workflow_dispatch");
    expect(workflowTriggers).not.toContain("pull_request");
    expect(workflowTriggers).not.toContain("\n  push:");
    expect(runtimeWorkflow).toContain("verifyCanonicalCardProof");
    expect(runtimeWorkflow).toContain("verifyResearchEvidenceRows");
    expect(runtimeWorkflow).toContain("verifyModelAudit");
    expect(runtimeWorkflow).toContain("APEX_ATLAS_MODEL_AUDIT_");
    expect(runtimeWorkflow).toContain("research_evidence");
    expect(runtimeWorkflow).toContain('if [ "$STATUS" = "cancelled" ]');
    expect(runtimeWorkflow).toContain("exit 0; fi");
    expect(runtimeWorkflow).toContain("inputs.objective");
    expect(runtimeWorkflow).toContain("required: true");
    expect(runtimeWorkflow).toContain("ATLAS_OBJECTIVE: ${{ inputs.objective }}");
    expect(runtimeWorkflow).toContain('jq -n --arg objective "$ATLAS_OBJECTIVE"');
    expect(runtimeWorkflow).not.toContain('jq -n --arg objective "${{ inputs.objective }}"');
    expect(runtimeWorkflow).toContain("discoveryContext:$objective");
    expect(runtimeWorkflow).not.toContain("Operator objective: identify a real casino operator");
    expect(runtimeWorkflow).toContain("caseData");
    expect(runtimeWorkflow).toContain("caseEvents");
    const anonymousAuthProbe = runtimeWorkflow.indexOf("UNAUTH_STATUS");
    const liveResearchLaunch = runtimeWorkflow.indexOf("POST http://127.0.0.1:8080/api/ingest/atlas-run");
    expect(anonymousAuthProbe).toBeGreaterThanOrEqual(0);
    expect(liveResearchLaunch).toBeGreaterThan(anonymousAuthProbe);
    const prelaunchLockProbe = runtimeWorkflow.indexOf("-o /tmp/prelaunch-active-atlas-job.json");
    expect(prelaunchLockProbe).toBeGreaterThanOrEqual(0);
    expect(liveResearchLaunch).toBeGreaterThan(prelaunchLockProbe);
    expect(runtimeWorkflow).toContain("Unauthenticated API read returned HTTP");
    const finalizerProbe = runtimeWorkflow.indexOf("active/atlas-run");
    const cardReadback = runtimeWorkflow.indexOf("/api/entities?limit=50&offset=0");
    expect(finalizerProbe).toBeGreaterThanOrEqual(0);
    expect(cardReadback).toBeGreaterThan(finalizerProbe);
  });
});
