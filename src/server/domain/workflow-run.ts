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

export type CrmAccountContext = {
  readonly customerTier: string;
  readonly priorDiscount: string;
  readonly hasActiveContract: boolean;
  readonly owner: string;
};

export type ToolCallId = `tool_${string}`;

export type WorkflowToolCall = {
  readonly id: ToolCallId;
  readonly toolName: string;
  readonly sideEffectClass: "read";
  readonly status: "success" | "blocked" | "failed";
  readonly durationMs: number;
  readonly resultSummary: string;
  readonly error?: {
    readonly code: "crm_account_not_found" | "crm_adapter_unavailable" | "crm_account_name_missing";
    readonly message: string;
  };
};

export type WorkflowBlocker = {
  readonly reason: string;
  readonly blocksQuoteContinuation: boolean;
};

export type CrmLookupState =
  | {
      readonly status: "success";
      readonly accountName: string;
      readonly accountContext: CrmAccountContext;
      readonly toolCall: WorkflowToolCall;
    }
  | {
      readonly status: "missing_record";
      readonly accountName: string;
      readonly blocker: WorkflowBlocker;
      readonly toolCall: WorkflowToolCall;
    }
  | {
      readonly status: "account_name_missing";
      readonly accountName: string;
      readonly blocker: WorkflowBlocker;
      readonly toolCall: WorkflowToolCall;
    }
  | {
      readonly status: "adapter_failure";
      readonly accountName: string;
      readonly toolCall: WorkflowToolCall;
    };

export type AuditEvent = {
  readonly id: AuditEventId;
  readonly runId: WorkflowRunId;
  readonly createdAt: string;
  readonly type: "deal_request_intake_created" | "deal_facts_extracted" | "crm_account_context_retrieved";
  readonly source: string;
  readonly summary: string;
};

export type WorkflowRun = {
  readonly id: WorkflowRunId;
  readonly createdAt: string;
  readonly dealRequest: DealRequestInput;
  readonly extractionStatus?: "in_progress" | "complete";
  readonly dealFactExtraction?: DealFactExtraction;
  readonly crmLookup?: CrmLookupState;
  readonly events: readonly AuditEvent[];
};

export type DomainError = {
  readonly code:
    | "request_text_required"
    | "workflow_run_not_found"
    | "deal_fact_extraction_invalid"
    | "crm_account_name_missing"
    | "crm_account_not_found"
    | "crm_adapter_failure";
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

export function createToolCallId(): ToolCallId {
  return `tool_${crypto.randomUUID()}`;
}

export function createUtcTimestamp(): string {
  return new Date().toISOString();
}
