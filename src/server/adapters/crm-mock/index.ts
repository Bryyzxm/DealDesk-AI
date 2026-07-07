import type { CrmLookupPort, CrmLookupResult } from "../../ports/crm";

const CRM_LOOKUP_TOOL = "crm.lookupAccountContext" as const;
const CRM_LOOKUP_TIMEOUT_MS = 1_000;
const CRM_LOOKUP_RETRY_POLICY = "manual" as const;
const SUCCESS_DURATION_MS = 42;
const BLOCKED_DURATION_MS = 18;
const FAILURE_DURATION_MS = 25;

const NORTHSTAR_CONTEXT = {
  customerTier: "Enterprise",
  priorDiscount: "18% renewal discount approved last cycle",
  hasActiveContract: true,
  owner: "Priya Raman",
} as const;

export function createCrmMockAdapter(): CrmLookupPort {
  return {
    lookupAccountContext: async (accountName: string): Promise<CrmLookupResult> => {
      const normalizedName = accountName.trim();

      if (normalizedName.length === 0) {
        return createFailure(
          "crm_account_name_missing",
          "CRM lookup failed: account name is missing from this workflow run.",
          "CRM lookup blocked because the workflow run has no account name.",
          BLOCKED_DURATION_MS,
        );
      }

      if (normalizedName === "CRM Adapter Failure Demo") {
        return createFailure(
          "crm_adapter_unavailable",
          "CRM mock adapter failure for CRM Adapter Failure Demo.",
          "CRM lookup failed because the CRM mock adapter returned an error.",
          FAILURE_DURATION_MS,
        );
      }

      if (normalizedName !== "Northstar Demo Systems") {
        return createFailure(
          "crm_account_not_found",
          `CRM lookup failed: account not found for ${normalizedName}.`,
          `CRM lookup blocked because no CRM record matched ${normalizedName}.`,
          BLOCKED_DURATION_MS,
        );
      }

      return {
        ok: true,
        data: NORTHSTAR_CONTEXT,
        audit: {
          toolName: CRM_LOOKUP_TOOL,
          sideEffectClass: "read",
          timeoutMs: CRM_LOOKUP_TIMEOUT_MS,
          retryPolicy: CRM_LOOKUP_RETRY_POLICY,
          idempotencyBehavior: "same_account_success_only",
          durationMs: SUCCESS_DURATION_MS,
          status: "success",
          resultSummary: "CRM account context retrieved for Northstar Demo Systems.",
        },
      };
    },
  };
}

function createFailure(
  code: "crm_account_not_found" | "crm_adapter_unavailable" | "crm_account_name_missing",
  message: string,
  resultSummary: string,
  durationMs: number,
): CrmLookupResult {
  return {
    ok: false,
    error: {
      code,
      message,
      recoverable: true,
    },
    audit: {
      toolName: CRM_LOOKUP_TOOL,
      sideEffectClass: "read",
      timeoutMs: CRM_LOOKUP_TIMEOUT_MS,
      retryPolicy: CRM_LOOKUP_RETRY_POLICY,
      idempotencyBehavior: "log_each_retry",
      durationMs,
      status: code === "crm_adapter_unavailable" ? "failed" : "blocked",
      resultSummary,
      errorCode: code,
      errorMessage: message,
    },
  };
}
