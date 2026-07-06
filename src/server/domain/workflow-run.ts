export type WorkflowRunId = `run_${string}`;
export type AuditEventId = `evt_${string}`;
export type EvidenceCitationId = `cite_${string}`;

export type EvidenceCitation = {
  readonly id: EvidenceCitationId;
  readonly label: string;
  readonly source: "request_text" | "attachment_text" | "form_field";
  readonly snippet: string;
};

export type ExtractedDealFact = {
  readonly label: string;
  readonly value: string;
  readonly confidence: "high" | "medium" | "low";
  readonly citationIds: readonly EvidenceCitationId[];
};

export type MissingDealFact = {
  readonly field: string;
  readonly reason: string;
  readonly blocksQuoteContinuation: boolean;
};

export type DealFactExtraction = {
  readonly buyerIntent: ExtractedDealFact;
  readonly urgency: ExtractedDealFact;
  readonly productNeeds: readonly ExtractedDealFact[];
  readonly budgetOrDiscountHints: readonly ExtractedDealFact[];
  readonly requestedDate?: ExtractedDealFact;
  readonly missingFacts: readonly MissingDealFact[];
  readonly evidenceCitations: readonly EvidenceCitation[];
};

export type DealRequestInput = {
  readonly sender: string;
  readonly accountName: string;
  readonly requestText: string;
  readonly requestedProducts: string;
  readonly requestedTerms: string;
  readonly attachmentText?: string;
  readonly fixtureSource?: string;
};

export type AuditEvent = {
  readonly id: AuditEventId;
  readonly runId: WorkflowRunId;
  readonly createdAt: string;
  readonly type: "deal_request_intake_created" | "deal_facts_extracted";
  readonly source: string;
  readonly summary: string;
};

export type WorkflowRun = {
  readonly id: WorkflowRunId;
  readonly createdAt: string;
  readonly dealRequest: DealRequestInput;
  readonly extractionStatus?: "in_progress" | "complete";
  readonly dealFactExtraction?: DealFactExtraction;
  readonly events: readonly AuditEvent[];
};

export type DomainError = {
  readonly code: "request_text_required" | "workflow_run_not_found" | "deal_fact_extraction_invalid";
  readonly message: string;
  readonly recoverable: boolean;
  readonly auditEventId?: AuditEventId;
};

export function createWorkflowRunId(): WorkflowRunId {
  return `run_${crypto.randomUUID()}`;
}

export function isWorkflowRunId(value: string): value is WorkflowRunId {
  return value.startsWith("run_");
}

export function createAuditEventId(): AuditEventId {
  return `evt_${crypto.randomUUID()}`;
}

export function createUtcTimestamp(): string {
  return new Date().toISOString();
}
