import type { CrmAccountContext } from "../domain/workflow-run";

export type CrmToolAudit = {
  readonly toolName: "crm.lookupAccountContext";
  readonly sideEffectClass: "read";
  readonly timeoutMs: number;
  readonly retryPolicy: "manual";
  readonly idempotencyBehavior: "same_account_success_only" | "log_each_retry";
  readonly durationMs: number;
  readonly status: "success" | "blocked" | "failed";
  readonly resultSummary: string;
  readonly errorCode?: "crm_account_not_found" | "crm_adapter_unavailable" | "crm_account_name_missing";
  readonly errorMessage?: string;
};

export type CrmLookupResult =
  | {
      readonly ok: true;
      readonly data: CrmAccountContext;
      readonly audit: CrmToolAudit;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: "crm_account_not_found" | "crm_adapter_unavailable" | "crm_account_name_missing";
        readonly message: string;
        readonly recoverable: boolean;
      };
      readonly audit: CrmToolAudit;
    };

export type CrmLookupPort = {
  readonly lookupAccountContext: (accountName: string) => Promise<CrmLookupResult>;
};
