import type { CrmLookupPort, CrmLookupResult } from "../ports/crm";
import type { DomainError, WorkflowRun, WorkflowToolCall } from "../domain/workflow-run";
import { createAuditEventId, createToolCallId, createUtcTimestamp } from "../domain/workflow-run";
import { saveWorkflowRun } from "./workflow-run-store";

type CrmFailureCode = Extract<CrmLookupResult, { readonly ok: false }>["error"]["code"];

export type CrmContextResult =
  | { readonly ok: true; readonly run: WorkflowRun }
  | { readonly ok: false; readonly run: WorkflowRun; readonly error: DomainError };

export async function retrieveCrmAccountContextForRun(
  run: WorkflowRun,
  crm: CrmLookupPort,
): Promise<CrmContextResult> {
  const accountName = run.dealRequest.accountName.trim();

  if (run.crmLookup?.status === "success" && run.crmLookup.accountName === accountName) {
    await saveWorkflowRun(run);
    return { ok: true, run };
  }

  const lookup = await lookupAccountContext(crm, accountName);
  const toolCall = createToolCall(lookup.audit);
  const eventId = createAuditEventId();
  const event = {
    id: eventId,
    runId: run.id,
    createdAt: createUtcTimestamp(),
    type: "crm_account_context_retrieved",
    source: lookup.audit.toolName,
    summary: lookup.audit.resultSummary,
  } satisfies WorkflowRun["events"][number];

  switch (lookup.ok) {
    case true: {
    const updatedRun = {
      ...run,
      crmLookup: {
        status: "success",
        accountName,
        accountContext: lookup.data,
        toolCall,
      },
      events: [...run.events, event],
    } satisfies WorkflowRun;

    await saveWorkflowRun(updatedRun);
    return { ok: true, run: updatedRun };
  }

    case false: {
      const status = getFailureStatus(lookup.error.code);
      const updatedRun = {
        ...run,
        crmLookup: status === "adapter_failure"
          ? {
              status,
              accountName,
              toolCall,
            }
          : {
              status,
              accountName,
              blocker: {
                reason: lookup.error.message,
                blocksQuoteContinuation: true,
              },
              toolCall,
            },
        events: [...run.events, event],
      } satisfies WorkflowRun;

      await saveWorkflowRun(updatedRun);

      return {
        ok: false,
        run: updatedRun,
        error: {
          code: lookup.error.code === "crm_adapter_unavailable" ? "crm_adapter_failure" : lookup.error.code,
          message: lookup.error.message,
          recoverable: lookup.error.recoverable,
          auditEventId: eventId,
        },
      };
    }
  }
}

async function lookupAccountContext(crm: CrmLookupPort, accountName: string): Promise<CrmLookupResult> {
  try {
    return await crm.lookupAccountContext(accountName);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return createThrownAdapterFailure(error.message);
    }

    throw error;
  }
}

function createThrownAdapterFailure(message: string): CrmLookupResult {
  return {
    ok: false,
    error: {
      code: "crm_adapter_unavailable",
      message: `CRM lookup failed: ${message}`,
      recoverable: true,
    },
    audit: {
      toolName: "crm.lookupAccountContext",
      sideEffectClass: "read",
      timeoutMs: 1_000,
      retryPolicy: "manual",
      idempotencyBehavior: "log_each_retry",
      durationMs: 0,
      status: "failed",
      resultSummary: "CRM lookup failed because the CRM adapter threw an error.",
      errorCode: "crm_adapter_unavailable",
      errorMessage: `CRM lookup failed: ${message}`,
    },
  };
}

function getFailureStatus(errorCode: CrmFailureCode): "account_name_missing" | "adapter_failure" | "missing_record" {
  switch (errorCode) {
    case "crm_account_name_missing":
      return "account_name_missing";
    case "crm_adapter_unavailable":
      return "adapter_failure";
    case "crm_account_not_found":
      return "missing_record";
    default:
      return assertNever(errorCode);
  }
}

type CrmAuditInput = Parameters<CrmLookupPort["lookupAccountContext"]> extends readonly [string]
  ? Awaited<ReturnType<CrmLookupPort["lookupAccountContext"]>>["audit"]
  : never;

function createToolCall(audit: CrmAuditInput): WorkflowToolCall {
  const base = {
    id: createToolCallId(),
    toolName: audit.toolName,
    sideEffectClass: audit.sideEffectClass,
    status: audit.status,
    durationMs: audit.durationMs,
    resultSummary: audit.resultSummary,
  } satisfies Omit<WorkflowToolCall, "error">;

  if (audit.errorCode && audit.errorMessage) {
    return {
      ...base,
      error: {
        code: audit.errorCode,
        message: audit.errorMessage,
      },
    };
  }

  return base;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled CRM failure code: ${JSON.stringify(value)}`);
}
