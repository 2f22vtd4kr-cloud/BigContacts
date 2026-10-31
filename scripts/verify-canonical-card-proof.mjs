/**
 * Acceptance verifier for the manual, provider-backed canonical Atlas run.
 *
 * A search-result title extracted by deterministic code is not enough: the
 * exact persisted card must also be explicitly selected/promoted by the
 * Investigator and bound to a successful source observation in the durable
 * case-event ledger.
 */

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseObject(value) {
  if (isRecord(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeHttpsUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch {
    return null;
  }
}

function hasExactText(text, value) {
  if (typeof text !== "string" || typeof value !== "string" || !value.trim()) return false;
  const escaped = value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return new RegExp("(^|[^\\p{L}\\p{N}])" + escaped + "(?=$|[^\\p{L}\\p{N}])", "iu").test(text);
  } catch {
    return text.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase());
  }
}

function getEntities(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.entities)) return payload.entities;
  return [];
}

function eventPayload(event) {
  return parseObject(event?.payload);
}

function reviewStatusForLead(entity, lead) {
  const metadata = parseObject(entity?.metadata);
  if (metadata.reviewOnly !== true) return null;
  if (lead.stage === "partial_review") {
    const partialLead = metadata.partialOrganizationLead === true
      || metadata.partialPersonLead === true
      || metadata.roleOnlyLead === true;
    const verificationLevel = String(lead.verificationLevel ?? "");
    if (!partialLead || !["fetched_source", "search_result_lead"].includes(verificationLevel)) return null;
    return verificationLevel;
  }
  if (lead.stage === "candidate_review" && metadata.admission === "investigator-explicit-promotion") {
    return "investigator-explicit-promotion";
  }
  return null;
}

function findingMatchesLead(finding, lead) {
  if (!isRecord(finding) || finding.promotionDecision !== "promote") return false;
  if (lead.entityType === "Corporation") {
    return finding.scope === "organization" && finding.value === lead.entityName;
  }
  if (lead.entityType === "PersonCandidate") {
    return finding.scope === "candidate"
      && finding.personName === lead.entityName
      && typeof finding.role === "string"
      && finding.role.trim().length > 0;
  }
  return false;
}

function urlsForEvent(payload) {
  const findings = Array.isArray(payload.findings) ? payload.findings : [];
  const findingUrls = findings.flatMap((finding) =>
    isRecord(finding) && Array.isArray(finding.sourceUrls) ? finding.sourceUrls : [],
  );
  const values = [
    ...(Array.isArray(payload.observedUrls) ? payload.observedUrls : []),
    ...(Array.isArray(payload.leadUrls) ? payload.leadUrls : []),
    ...findingUrls,
  ];
  return new Set(values.map(normalizeHttpsUrl).filter(Boolean));
}

function allowedInvestigatorCapabilities(boss, caseData) {
  const allowed = new Set([boss.investigatorLlm]);
  const caseFile = parseObject(caseData?.caseFile);
  if (typeof caseFile.investigatorLlm === "string") allowed.add(caseFile.investigatorLlm);
  const history = Array.isArray(caseFile.investigatorCapabilityHistory) ? caseFile.investigatorCapabilityHistory : [];
  for (const entry of history) {
    if (!isRecord(entry)) continue;
    if (typeof entry.from === "string") allowed.add(entry.from);
    if (typeof entry.to === "string") allowed.add(entry.to);
  }
  return allowed;
}

function findModelSelectedEvidence(lead, events, investigatorCapabilities, jobId) {
  const cardUrls = new Set(
    (Array.isArray(lead.sourceUrls) ? lead.sourceUrls : [])
      .map(normalizeHttpsUrl)
      .filter(Boolean),
  );
  if (!cardUrls.size) return null;

  for (const selectionEvent of events) {
    if (selectionEvent?.actorRole !== "head_investigator") continue;
    const selectionPayload = eventPayload(selectionEvent);
    if (selectionPayload.jobId !== jobId || !investigatorCapabilities.has(selectionPayload.runModel)) continue;
    const findings = Array.isArray(selectionPayload.findings) ? selectionPayload.findings : [];
    if (typeof selectionPayload.runId !== "string" || !selectionPayload.runId.trim()) continue;
    for (const finding of findings) {
      if (!findingMatchesLead(finding, lead)) continue;
      const findingUrls = new Set(
        (Array.isArray(finding.sourceUrls) ? finding.sourceUrls : [])
          .map(normalizeHttpsUrl)
          .filter(Boolean),
      );
      const selectedCardUrls = [...findingUrls].filter((url) => cardUrls.has(url));
      if (!selectedCardUrls.length) continue;

      for (const sourceEvent of events) {
        if (sourceEvent?.actorRole !== "head_investigator" || sourceEvent?.eventType !== "tool_observation") continue;
        const sourcePayload = eventPayload(sourceEvent);
        if (typeof sourcePayload.runId !== "string" || !sourcePayload.runId.trim()) continue;
        if (sourcePayload.jobId !== jobId
          || !["success", "partial"].includes(String(sourcePayload.execution))
          || !investigatorCapabilities.has(sourcePayload.runModel)) continue;
        const observedUrls = urlsForEvent(sourcePayload);
        const sharedUrl = selectedCardUrls.find((url) => observedUrls.has(url));
        if (!sharedUrl) continue;
        if (sourcePayload.execution === "partial") {
          const successfulSubsourceUrls = new Set([
            ...(Array.isArray(sourcePayload.observedUrls) ? sourcePayload.observedUrls : []),
            ...(Array.isArray(sourcePayload.leadUrls) ? sourcePayload.leadUrls : []),
          ].map(normalizeHttpsUrl).filter(Boolean));
          if (!successfulSubsourceUrls.has(sharedUrl)) continue;
        }
        const observation = typeof sourcePayload.observation === "string" ? sourcePayload.observation : "";
        if (!hasExactText(observation, lead.entityName)) continue;
        if (lead.entityType === "PersonCandidate" && !hasExactText(observation, finding.role)) continue;
        return {
          selectionEventId: selectionEvent.id ?? null,
          sourceEventId: sourceEvent.id ?? null,
          selectionRunId: selectionPayload.runId,
          sourceRunId: sourcePayload.runId,
          selectionModel: selectionPayload.runModel,
          sourceModel: sourcePayload.runModel,
          selectedSourceUrls: selectedCardUrls,
          sourceUrl: sharedUrl,
          investigatorFinding: finding,
        };
      }
    }
  }
  return null;
}

export function getCanonicalDiscoveryCaseId(job) {
  const result = parseObject(job?.result);
  const nestedResult = parseObject(result.result);
  const candidates = [
    result?.discovery?.caseId,
    nestedResult?.discovery?.caseId,
    job?.discoveryCaseId,
    job?.caseId,
    job?.launch?.caseId,
  ];
  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isSafeInteger(id) && id > 0) return id;
  }
  return null;
}

export function verifyCanonicalCardProof(input) {
  const job = input?.job ?? {};
  const jobStatus = String(job.status ?? "").toLowerCase();
  if (!["done", "completed", "failed", "cancelled"].includes(jobStatus)) {
    throw new Error("Canonical job is not terminal (done/completed/failed/cancelled): " + (jobStatus || "missing"));
  }
  const outcome = String(job.outcome ?? "").toLowerCase();
  if (!["complete", "incomplete"].includes(outcome)
    || (["failed", "cancelled"].includes(jobStatus) && outcome !== "incomplete")) {
    throw new Error("Terminal job outcome is missing or inconsistent with its terminal status.");
  }

  const activeLane = input?.activeAtlasLane ?? {};
  if (activeLane.type !== "atlas-run" || activeLane.active !== false
    || activeLane.jobId !== null || activeLane.job !== null) {
    throw new Error("Canonical job terminalized but the active Atlas lock was not proven released.");
  }

  const jobId = String(job.jobId ?? job.id ?? "");
  if (!jobId) throw new Error("Terminal job response does not identify its exact job ID.");
  const applicationRevision = String(input?.applicationRevision ?? "");
  if (!/^[a-f0-9]{40}$/i.test(applicationRevision)) {
    throw new Error("Canonical card proof is missing the exact 40-character application revision.");
  }
  const jobResult = parseObject(job.result);
  const boss = parseObject(jobResult.boss);
  const rightHand = parseObject(jobResult.rightHand);
  if (boss.status !== "completed" || typeof boss.investigatorLlm !== "string" || !boss.investigatorLlm.trim()) {
    throw new Error("Terminal job result does not prove a completed Boss decision and selected Investigator capability.");
  }
  // Verify that the independent review actually happened and was recorded.
  // Do not require a particular approval enum here: Right-hand advises Boss;
  // it must not become a second deterministic authority over the mission.
  if (rightHand.status !== "completed"
    || typeof rightHand.decision !== "string" || !rightHand.decision.trim()
    || typeof rightHand.reason !== "string" || !rightHand.reason.trim()) {
    throw new Error("Terminal job result does not prove a completed Right-hand review.");
  }
  const investigatorCapabilities = allowedInvestigatorCapabilities(boss, input?.caseData);
  const caseId = getCanonicalDiscoveryCaseId({ ...job, caseId: input?.caseId ?? job.caseId });
  if (!caseId) throw new Error("Terminal job result does not identify its canonical discovery case.");
  if (Number(input?.caseData?.id) !== caseId || typeof input?.caseData?.caseFile !== "string") {
    throw new Error("Canonical case read-back does not match the exact discovery case ID.");
  }
  const entities = getEntities(input?.entitiesPayload);
  const leads = Array.isArray(input?.dashboard?.leads) ? input.dashboard.leads : [];
  const events = Array.isArray(input?.caseEvents) ? input.caseEvents : [];
  const jobEvents = events.filter((event) =>
    event?.actorRole === "head_investigator" && eventPayload(event).jobId === jobId,
  );
  const toolObservations = jobEvents.filter((event) => event?.eventType === "tool_observation");
  const executionCounts = {};
  const observedSourceUrls = [];
  let duplicateActionBlocks = 0;
  for (const event of toolObservations) {
    const payload = eventPayload(event);
    const execution = String(payload.execution ?? "unknown");
    executionCounts[execution] = (executionCounts[execution] ?? 0) + 1;
    observedSourceUrls.push(
      ...(Array.isArray(payload.observedUrls) ? payload.observedUrls : []),
      ...(Array.isArray(payload.leadUrls) ? payload.leadUrls : []),
    );
    const observation = typeof payload.observation === "string" ? payload.observation : "";
    if (execution === "blocked" && /repeat_action_guard|duplicate/i.test(observation)) duplicateActionBlocks += 1;
  }
  const normalizedObservedUrls = observedSourceUrls.map(normalizeHttpsUrl).filter(Boolean);
  const uniqueObservedUrls = [...new Set(normalizedObservedUrls)];

  for (const lead of leads) {
    if (!isRecord(lead)) continue;
    if (!["partial_review", "candidate_review"].includes(String(lead.stage))) continue;
    if (!["Corporation", "PersonCandidate"].includes(String(lead.entityType))) continue;
    const sourceUrls = Array.isArray(lead.sourceUrls) ? lead.sourceUrls : [];
    if (!sourceUrls.some((url) => normalizeHttpsUrl(url))) continue;

    const entity = entities.find((candidate) =>
      String(candidate?.id) === String(lead.entityId)
      && candidate?.name === lead.entityName
      && candidate?.type === lead.entityType,
    );
    if (!entity) continue;
    const verificationStatus = reviewStatusForLead(entity, lead);
    if (!verificationStatus) continue;

    const selectedEvidence = findModelSelectedEvidence(lead, events, investigatorCapabilities, jobId);
    if (!selectedEvidence) continue;

    return {
      acceptance: "PASS",
      jobId,
      caseId,
      applicationRevision,
      bossModel: typeof boss.model === "string" ? boss.model : null,
      rightHandModel: typeof rightHand.model === "string" ? rightHand.model : null,
      investigatorCapability: selectedEvidence.selectionModel,
      sourceExecutionCapability: selectedEvidence.sourceModel,
      terminalJobStatus: jobStatus,
      outcome,
      entityId: lead.entityId,
      entityName: lead.entityName,
      entityType: lead.entityType,
      stage: lead.stage,
      verificationStatus,
      reviewOnly: true,
      sourceUrl: selectedEvidence.sourceUrl,
      cardSourceUrls: (Array.isArray(lead.sourceUrls) ? lead.sourceUrls : []).map(normalizeHttpsUrl).filter(Boolean),
      selectedSourceUrls: selectedEvidence.selectedSourceUrls,
      allowedInvestigatorCapabilities: [...investigatorCapabilities],
      investigatorSelected: true,
      investigatorExecutionMetrics: {
        toolObservations: toolObservations.length,
        executionCounts,
        duplicateActionBlocks,
        sourceUrlObservations: normalizedObservedUrls.length,
        uniqueSourceUrlCount: uniqueObservedUrls.length,
        repeatedSourceUrlObservations: normalizedObservedUrls.length - uniqueObservedUrls.length,
        uniqueSourceUrls: uniqueObservedUrls,
      },
      investigatorPromotion: "promote",
      selectionEventId: selectedEvidence.selectionEventId,
      sourceEventId: selectedEvidence.sourceEventId,
      selectionRunId: selectedEvidence.selectionRunId,
      sourceRunId: selectedEvidence.sourceRunId,
      entityProjection: "matched",
      dashboardProjection: "matched",
      activeAtlasLock: "released",
      acceptedAfterControlFailure: jobStatus === "failed",
    };
  }

  const sourceBackedLeadCount = leads.filter((lead) =>
    isRecord(lead)
    && ["partial_review", "candidate_review"].includes(String(lead.stage))
    && ["Corporation", "PersonCandidate"].includes(String(lead.entityType))
    && Array.isArray(lead.sourceUrls)
    && lead.sourceUrls.some((url) => normalizeHttpsUrl(url)),
  ).length;
  throw new Error(
    "No persisted company/person card was proven to be explicitly selected and promoted by the Investigator, bound to a successful source event, and matched across the dashboard and entity APIs. "
    + "entities=" + entities.length
    + ", dashboardLeads=" + leads.length
    + ", sourceBackedReviewLeads=" + sourceBackedLeadCount
    + ", caseEvents=" + events.length
    + ", terminalJobStatus=" + jobStatus,
  );
}

export function verifyResearchEvidenceRows(input) {
  const proof = input?.proof ?? {};
  const rows = Array.isArray(input?.rows) ? input.rows : [];
  const events = Array.isArray(input?.caseEvents) ? input.caseEvents : [];
  const cardSources = new Set(
    (Array.isArray(proof.cardSourceUrls) ? proof.cardSourceUrls : [])
      .map(normalizeHttpsUrl)
      .filter(Boolean),
  );
  const selectedSources = new Set(
    (Array.isArray(proof.selectedSourceUrls) ? proof.selectedSourceUrls : [])
      .map(normalizeHttpsUrl)
      .filter(Boolean),
  );
  const capabilities = new Set(Array.isArray(proof.allowedInvestigatorCapabilities)
    ? proof.allowedInvestigatorCapabilities : []);
  const accepted = [];

  for (const row of rows) {
    if (!isRecord(row) || !Number.isSafeInteger(Number(row.id)) || Number(row.id) <= 0
      || !Number.isSafeInteger(Number(row.sessionId)) || Number(row.sessionId) <= 0) continue;
    if (Number(row.entityId) !== Number(proof.entityId)) continue;
    if (!["identity_candidate", "partial_organization_lead", "partial_person_role_lead"].includes(String(row.claimType))) continue;
    if (row.status !== "review" || !Number.isFinite(Number(row.confidence)) || Number(row.confidence) <= 0) continue;
    const sourceUrl = normalizeHttpsUrl(row.sourceUrl);
    if (!sourceUrl || !cardSources.has(sourceUrl) || !selectedSources.has(sourceUrl)) continue;

    const metadata = parseObject(row.metadata);
    if (metadata.atlasJobId !== proof.jobId || Number(metadata.discoveryCaseId) !== Number(proof.caseId)) continue;
    if (metadata.reviewOnly !== true && metadata.partialReview !== true) continue;
    const supportingEventId = Number(metadata.supportingEventId);
    if (!Number.isSafeInteger(supportingEventId) || supportingEventId <= 0) continue;

    const event = events.find((candidate) => Number(candidate?.id) === supportingEventId);
    if (event?.actorRole !== "head_investigator" || event?.eventType !== "tool_observation") continue;
    const payload = eventPayload(event);
    if (payload.jobId !== proof.jobId || !capabilities.has(payload.runModel)) continue;
    if (!["success", "partial"].includes(String(payload.execution))) continue;
    if (!urlsForEvent(payload).has(sourceUrl)) continue;
    if (payload.execution === "partial") {
      const successfulSubsourceUrls = new Set([
        ...(Array.isArray(payload.observedUrls) ? payload.observedUrls : []),
        ...(Array.isArray(payload.leadUrls) ? payload.leadUrls : []),
      ].map(normalizeHttpsUrl).filter(Boolean));
      if (!successfulSubsourceUrls.has(sourceUrl)) continue;
    }
    const observation = typeof payload.observation === "string" ? payload.observation : "";
    if (!hasExactText(observation, proof.entityName)) continue;
    const evidenceRole = typeof metadata.role === "string" ? metadata.role : null;
    if (proof.entityType === "PersonCandidate" && evidenceRole && !hasExactText(observation, evidenceRole)) continue;

    accepted.push({
      id: Number(row.id),
      entityId: Number(row.entityId),
      sessionId: Number(row.sessionId),
      claimType: row.claimType,
      sourceName: typeof row.sourceName === "string" ? row.sourceName : null,
      sourceDomain: typeof row.sourceDomain === "string" ? row.sourceDomain : null,
      sourceUrl,
      status: row.status,
      confidence: Number(row.confidence),
      verificationLevel: typeof metadata.verificationLevel === "string" ? metadata.verificationLevel : null,
      reviewOnly: metadata.reviewOnly === true || metadata.partialReview === true,
      supportingEventId,
    });
  }

  if (!accepted.length) {
    throw new Error("No durable review-status research_evidence row was found for this exact entity, job, case, selected source URL and successful supporting event.");
  }
  return {
    ...proof,
    evidenceIds: accepted.map((row) => row.id),
    evidenceRows: accepted,
    evidenceSupportEventIds: [...new Set(accepted.map((row) => row.supportingEventId))],
  };
}

export function verifyModelAudit(input) {
  const proof = input?.proof ?? {};
  const auditText = typeof input?.auditText === "string" ? input.auditText : "";
  const pattern = /### Model (request|response) ([^\n]+)\n\n(`{3,})json\n([\s\S]*?)\n\3/g;
  const requests = new Map();
  const responses = [];
  for (const match of auditText.matchAll(pattern)) {
    let record;
    try {
      record = JSON.parse(match[4]);
    } catch {
      continue;
    }
    if (!isRecord(record) || typeof record.requestId !== "string") continue;
    if (match[1] === "request" && record.event === "atlas_model_request") {
      requests.set(record.requestId, record);
    } else if (match[1] === "response" && record.event === "atlas_model_response") {
      responses.push(record);
    }
  }

  const requiredRoles = ["groq_boss", "groq_right_hand", "groq_investigator"];
  const successful = [];
  for (const response of responses) {
    const request = requests.get(response.requestId);
    if (!request || request.role !== response.role || request.provider !== response.provider || request.model !== response.model) continue;
    if (request.jobId != null && request.jobId !== proof.jobId) continue;
    if (request.caseId != null && Number(request.caseId) !== Number(proof.caseId)) continue;
    const httpStatus = Number(response.httpStatus);
    const responsePayload = parseObject(response.response);
    if (httpStatus < 200 || httpStatus >= 300 || response.transportFailure || response.auditCaptureFailure || responsePayload.jsonParsed !== true) continue;
    if (!Array.isArray(responsePayload.choices) || responsePayload.choices.length === 0) continue;
    successful.push({ request, response, httpStatus });
  }

  const belongsToProofRun = (request) =>
    request.jobId == null || request.jobId === proof.jobId
      ? request.caseId == null || Number(request.caseId) === Number(proof.caseId)
      : false;
  const scopedRequests = [...requests.values()].filter(belongsToProofRun);
  const scopedResponses = responses.filter((response) => {
    const request = requests.get(response.requestId);
    return request && belongsToProofRun(request);
  });

  const byRole = {};
  for (const role of requiredRoles) {
    const roleCalls = successful.filter((call) => call.request.role === role);
    if (!roleCalls.length) {
      throw new Error("Model audit does not prove a successful real provider request/response for role " + role + ".");
    }
    const roleRequests = [...requests.values()].filter((request) =>
      request.role === role
      && (request.jobId == null || request.jobId === proof.jobId)
      && (request.caseId == null || Number(request.caseId) === Number(proof.caseId)),
    );
    const promptTokens = roleCalls.reduce((sum, call) => sum + Number(parseObject(call.response.response).usage?.prompt_tokens ?? 0), 0);
    const completionTokens = roleCalls.reduce((sum, call) => sum + Number(parseObject(call.response.response).usage?.completion_tokens ?? 0), 0);
    const totalTokens = roleCalls.reduce((sum, call) => sum + Number(parseObject(call.response.response).usage?.total_tokens ?? 0), 0);
    const models = [...new Set(roleRequests.map((request) => request.model).filter((value) => typeof value === "string"))];
    const actualModels = [...new Set(roleCalls.map((call) => parseObject(call.response.response).model).filter((value) => typeof value === "string"))];
    const providers = [...new Set(roleRequests.map((request) => request.provider).filter((value) => typeof value === "string"))];
    byRole[role] = {
      attempts: roleRequests.length,
      successfulCalls: roleCalls.length,
      models,
      actualModels,
      providers,
      promptTokens,
      completionTokens,
      totalTokens,
      latencyMs: roleCalls.reduce((sum, call) => sum + Number(call.response.latencyMs ?? 0), 0),
      requestIds: roleCalls.map((call) => call.response.requestId),
    };
  }

  const totalPromptTokens = requiredRoles.reduce((sum, role) => sum + byRole[role].promptTokens, 0);
  const totalCompletionTokens = requiredRoles.reduce((sum, role) => sum + byRole[role].completionTokens, 0);
  const totalLatencyMs = requiredRoles.reduce((sum, role) => sum + byRole[role].latencyMs, 0);
  const fallbackRoles = requiredRoles.filter((role) =>
    byRole[role].models.length > 1 || byRole[role].actualModels.length > 1 || byRole[role].providers.length > 1,
  );
  const retryCount = scopedRequests.filter((request) => Number(request.attempt ?? 1) > 1).length;

  return {
    ...proof,
    modelAudit: {
      totalRequests: scopedRequests.length,
      totalResponses: scopedResponses.length,
      successfulResponses: successful.length,
      retryCount,
      fallbackRoles,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
      tokensPerVerifiedCard: totalPromptTokens + totalCompletionTokens,
      successfulCallsPerVerifiedCard: successful.length,
      totalLatencyMs,
      costUsd: null,
      byRole,
    },
  };
}
