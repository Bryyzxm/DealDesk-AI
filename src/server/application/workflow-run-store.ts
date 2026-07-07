import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AuditEvent,
  CrmAccountContext,
  CrmLookupState,
  DealFactExtraction,
  DealRequestInput,
  EvidenceCitation,
  ExtractedDealFact,
  MissingDealFact,
  WorkflowToolCall,
  WorkflowRun,
  WorkflowRunId,
} from "../domain/workflow-run";

const STORE_FILE = path.join(process.cwd(), ".data", "workflow-runs.json");
let writeChain: Promise<void> = Promise.resolve();

type StoredRuns = Record<WorkflowRunId, WorkflowRun>;

export async function saveWorkflowRun(run: WorkflowRun): Promise<void> {
  writeChain = writeChain.then(async () => {
    const runs = await readRuns();
    runs[run.id] = run;
    await mkdir(path.dirname(STORE_FILE), { recursive: true });
    await writeFile(STORE_FILE, `${JSON.stringify(runs, null, 2)}\n`, "utf8");
  });

  return writeChain;
}

export async function loadWorkflowRun(id: WorkflowRunId): Promise<WorkflowRun | undefined> {
  const runs = await readRuns();
  return runs[id];
}

export async function findWorkflowRunById(id: WorkflowRunId): Promise<WorkflowRun | undefined> {
  return loadWorkflowRun(id);
}

async function readRuns(): Promise<StoredRuns> {
  try {
    const contents = await readFile(STORE_FILE, "utf8");
    const parsed: unknown = JSON.parse(contents);
    return isStoredRuns(parsed) ? parsed : {};
  } catch (error: unknown) {
    if (isMissingFile(error) || error instanceof SyntaxError) {
      return {};
    }

    throw error;
  }
}

function isStoredRuns(value: unknown): value is StoredRuns {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([id, run]) => id.startsWith("run_") && isWorkflowRun(run) && run.id === id,
  );
}

function isWorkflowRun(value: unknown): value is WorkflowRun {
  if (!isRecord(value)) {
    return false;
  }

  const runId = value.id;

  return (
    typeof runId === "string" &&
    runId.startsWith("run_") &&
    typeof value.createdAt === "string" &&
    isDealRequestInput(value.dealRequest) &&
    isOptionalExtractionStatus(value.extractionStatus) &&
    isOptionalDealFactExtraction(value.dealFactExtraction) &&
    isOptionalCrmLookupState(value.crmLookup) &&
    Array.isArray(value.events) &&
    value.events.length > 0 &&
    value.events.every((event) => isAuditEvent(event, runId))
  );
}

function isDealRequestInput(value: unknown): value is DealRequestInput {
  return (
    isRecord(value) &&
    typeof value.sender === "string" &&
    typeof value.accountName === "string" &&
    typeof value.requestText === "string" &&
    typeof value.requestedProducts === "string" &&
    typeof value.requestedTerms === "string" &&
    isOptionalString(value.attachmentText) &&
    isOptionalString(value.fixtureSource)
  );
}

function isAuditEvent(value: unknown, runId: string): value is AuditEvent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.startsWith("evt_") &&
    value.runId === runId &&
    typeof value.createdAt === "string" &&
    (value.type === "deal_request_intake_created" ||
      value.type === "deal_facts_extracted" ||
      value.type === "crm_account_context_retrieved") &&
    typeof value.source === "string" &&
    typeof value.summary === "string"
  );
}

function isOptionalExtractionStatus(value: unknown): value is WorkflowRun["extractionStatus"] {
  return value === undefined || value === "in_progress" || value === "complete";
}

function isOptionalDealFactExtraction(value: unknown): value is DealFactExtraction | undefined {
  return value === undefined || isDealFactExtraction(value);
}

function isOptionalCrmLookupState(value: unknown): value is CrmLookupState | undefined {
  return value === undefined || isCrmLookupState(value);
}

function isCrmLookupState(value: unknown): value is CrmLookupState {
  if (!isRecord(value) || typeof value.accountName !== "string" || !isWorkflowToolCall(value.toolCall)) {
    return false;
  }

  switch (value.status) {
    case "success":
      return isCrmAccountContext(value.accountContext);
    case "account_name_missing":
    case "missing_record":
      return isWorkflowBlocker(value.blocker);
    case "adapter_failure":
      return true;
    default:
      return false;
  }
}

function isCrmAccountContext(value: unknown): value is CrmAccountContext {
  return (
    isRecord(value) &&
    typeof value.customerTier === "string" &&
    typeof value.priorDiscount === "string" &&
    typeof value.hasActiveContract === "boolean" &&
    typeof value.owner === "string"
  );
}

function isWorkflowBlocker(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.reason === "string" &&
    typeof value.blocksQuoteContinuation === "boolean"
  );
}

function isWorkflowToolCall(value: unknown): value is WorkflowToolCall {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.startsWith("tool_") &&
    typeof value.toolName === "string" &&
    value.sideEffectClass === "read" &&
    (value.status === "success" || value.status === "blocked" || value.status === "failed") &&
    typeof value.durationMs === "number" &&
    typeof value.resultSummary === "string" &&
    isOptionalWorkflowToolError(value.error)
  );
}

function isOptionalWorkflowToolError(value: unknown): value is WorkflowToolCall["error"] {
  return (
    value === undefined ||
    (isRecord(value) &&
      (value.code === "crm_account_not_found" ||
        value.code === "crm_adapter_unavailable" ||
        value.code === "crm_account_name_missing") &&
      typeof value.message === "string")
  );
}

function isDealFactExtraction(value: unknown): value is DealFactExtraction {
  return (
    isRecord(value) &&
    isExtractedDealFact(value.buyerIntent) &&
    isExtractedDealFact(value.urgency) &&
    Array.isArray(value.productNeeds) &&
    value.productNeeds.every(isExtractedDealFact) &&
    Array.isArray(value.budgetOrDiscountHints) &&
    value.budgetOrDiscountHints.every(isExtractedDealFact) &&
    (value.requestedDate === undefined || isExtractedDealFact(value.requestedDate)) &&
    Array.isArray(value.missingFacts) &&
    value.missingFacts.every(isMissingDealFact) &&
    Array.isArray(value.evidenceCitations) &&
    value.evidenceCitations.every(isEvidenceCitation)
  );
}

function isExtractedDealFact(value: unknown): value is ExtractedDealFact {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.value === "string" &&
    (value.confidence === "high" || value.confidence === "medium" || value.confidence === "low") &&
    Array.isArray(value.citationIds) &&
    value.citationIds.every((id) => typeof id === "string" && id.startsWith("cite_"))
  );
}

function isMissingDealFact(value: unknown): value is MissingDealFact {
  return (
    isRecord(value) &&
    typeof value.field === "string" &&
    typeof value.reason === "string" &&
    typeof value.blocksQuoteContinuation === "boolean"
  );
}

function isEvidenceCitation(value: unknown): value is EvidenceCitation {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.startsWith("cite_") &&
    typeof value.label === "string" &&
    (value.source === "request_text" || value.source === "attachment_text" || value.source === "form_field") &&
    typeof value.snippet === "string"
  );
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMissingFile(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}
