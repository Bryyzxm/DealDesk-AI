import type { DealRequestInput, DomainError, WorkflowRun } from "../domain/workflow-run";
import {
  createAuditEventId,
  createUtcTimestamp,
  createWorkflowRunId,
} from "../domain/workflow-run";

export type IntakeResult =
  | { readonly ok: true; readonly run: WorkflowRun }
  | { readonly ok: false; readonly error: DomainError };

export function createWorkflowRunFromIntake(input: DealRequestInput): IntakeResult {
  if (input.requestText.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: "request_text_required",
        message: "Request text is required before a workflow run can be created.",
        recoverable: true,
      },
    };
  }

  const runId = createWorkflowRunId();
  const createdAt = createUtcTimestamp();
  const source = input.fixtureSource ?? "manual";
  const auditEvent = {
    id: createAuditEventId(),
    runId,
    createdAt,
    type: "deal_request_intake_created",
    source,
    summary: createIntakeSummary(input, source),
  } satisfies WorkflowRun["events"][number];

  return {
    ok: true,
    run: {
      id: runId,
      createdAt,
      dealRequest: input,
      extractionStatus: "in_progress",
      events: [auditEvent],
    },
  };
}

function createIntakeSummary(input: DealRequestInput, source: string): string {
  const populatedFields = [
    "request text",
    input.sender.length > 0 ? "sender" : undefined,
    input.accountName.length > 0 ? "account" : undefined,
    input.requestedProducts.length > 0 ? "products" : undefined,
    input.requestedTerms.length > 0 ? "terms" : undefined,
    input.attachmentText && input.attachmentText.length > 0 ? "attachment" : undefined,
  ].filter((field): field is string => field !== undefined);

  return `Deal request intake captured from ${source}; populated fields: ${populatedFields.join(", ")}.`;
}
