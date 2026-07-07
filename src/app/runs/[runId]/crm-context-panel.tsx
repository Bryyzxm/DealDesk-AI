import { retrieveCrmAccountContext } from "@/app/actions";
import type { CrmLookupState, WorkflowRun, WorkflowToolCall } from "@/server/domain/workflow-run";

type CrmContextPanelProps = {
  readonly run: WorkflowRun;
};

export function CrmContextPanel({ run }: CrmContextPanelProps) {
  const lookup = run.crmLookup;

  return (
    <section aria-labelledby="crm-context-heading" className="mt-6 rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B9C3D1]" id="crm-context-heading">
            CRM context
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#B9C3D1]">
            Read-only account enrichment for customer tier, ownership, contract status, and prior discount history.
          </p>
        </div>
        <CrmLookupAction runId={run.id} label={lookup ? "Retry CRM lookup" : "Retrieve CRM context"} />
      </div>
      <CrmLookupResult lookup={lookup} runId={run.id} />
    </section>
  );
}

type CrmLookupActionProps = {
  readonly runId: WorkflowRun["id"];
  readonly label: string;
};

function CrmLookupAction({ label, runId }: CrmLookupActionProps) {
  return (
    <form action={retrieveCrmAccountContext}>
      <input name="runId" type="hidden" value={runId} />
      <button className="app-focus-ring rounded-lg border border-transparent bg-[#5BA7FF] px-4 py-2 text-sm font-semibold text-[#07111F] hover:bg-[#8CC2FF]" type="submit">
        {label}
      </button>
    </form>
  );
}

type CrmLookupResultProps = {
  readonly lookup: CrmLookupState | undefined;
  readonly runId: WorkflowRun["id"];
};

function CrmLookupResult({ lookup, runId }: CrmLookupResultProps) {
  if (!lookup) {
    return (
      <p className="mt-4 rounded-lg border border-[#5BA7FF]/40 bg-[#5BA7FF]/10 p-3 text-sm leading-6 text-[#D8EAFF]">
        CRM context has not been retrieved for this workflow run.
      </p>
    );
  }

  switch (lookup.status) {
    case "success":
      return <CrmSuccess lookup={lookup} />;
    case "account_name_missing":
    case "missing_record":
      return <CrmBlockedLookup lookup={lookup} runId={runId} />;
    case "adapter_failure":
      return <CrmToolCallCard runId={runId} toolCall={lookup.toolCall} />;
    default:
      return assertNever(lookup);
  }
}

type CrmSuccessProps = {
  readonly lookup: Extract<CrmLookupState, { readonly status: "success" }>;
};

function CrmSuccess({ lookup }: CrmSuccessProps) {
  return (
    <div className="mt-5 space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <CrmDetail label="Customer tier" value={lookup.accountContext.customerTier} />
        <CrmDetail label="Prior discount" value={lookup.accountContext.priorDiscount} />
        <CrmDetail label="Active contract" value={lookup.accountContext.hasActiveContract ? "Yes" : "No"} />
        <CrmDetail label="Owner" value={lookup.accountContext.owner} />
      </dl>
      <CrmToolCallCard toolCall={lookup.toolCall} />
    </div>
  );
}

type CrmBlockedLookupProps = {
  readonly lookup: Extract<CrmLookupState, { readonly status: "account_name_missing" | "missing_record" }>;
  readonly runId: WorkflowRun["id"];
};

function CrmBlockedLookup({ lookup, runId }: CrmBlockedLookupProps) {
  const heading = lookup.status === "account_name_missing" ? "CRM account name blocker" : "CRM record blocker";

  return (
    <div className="mt-5 space-y-4">
      <section aria-labelledby="crm-missing-record-heading" className="rounded-xl border border-[#F3B34C]/50 bg-[#F3B34C]/10 p-4">
        <h3 className="text-sm font-semibold text-[#F8D89A]" id="crm-missing-record-heading">
          {heading}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#F4F7FB]">
          {lookup.blocker.reason} Quote preparation remains blocked until account context is retrieved or reviewed manually.
        </p>
      </section>
      <CrmToolCallCard runId={runId} toolCall={lookup.toolCall} />
    </div>
  );
}

type CrmToolCallCardProps = {
  readonly runId?: WorkflowRun["id"];
  readonly toolCall: WorkflowToolCall;
};

function CrmToolCallCard({ runId, toolCall }: CrmToolCallCardProps) {
  const statusClass = toolCall.status === "failed"
    ? "border-[#F87171]/50 bg-[#F87171]/10 text-[#FCA5A5]"
    : toolCall.status === "blocked"
      ? "border-[#F3B34C]/50 bg-[#F3B34C]/10 text-[#F8D89A]"
      : "border-[#5BA7FF]/40 bg-[#5BA7FF]/10 text-[#D8EAFF]";

  return (
    <article className={`rounded-xl border p-4 ${statusClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">Tool call</h3>
          <p className="mt-2 font-mono text-xs">{toolCall.toolName}</p>
        </div>
        <p className="rounded-full border border-current/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
          {toolCall.status}
        </p>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <CrmTimelineDetail label="Duration" value={`${toolCall.durationMs}ms`} />
        <CrmTimelineDetail label="Result summary" value={toolCall.resultSummary} />
        {toolCall.error ? <CrmTimelineDetail label="Error" value={`${toolCall.error.code}: ${toolCall.error.message}`} /> : null}
        {runId ? <CrmRetryControl runId={runId} /> : null}
      </dl>
    </article>
  );
}

function CrmRetryControl({ runId }: { readonly runId: WorkflowRun["id"] }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-current/70">
        Retry
      </dt>
      <dd className="mt-2">
        <form action={retrieveCrmAccountContext}>
          <input name="runId" type="hidden" value={runId} />
          <button className="app-focus-ring rounded-lg border border-current/40 px-3 py-2 text-xs font-semibold text-[#F4F7FB] hover:bg-white/10" type="submit">
            Retry CRM lookup
          </button>
        </form>
      </dd>
    </div>
  );
}

type CrmDetailProps = {
  readonly label: string;
  readonly value: string;
};

function CrmDetail({ label, value }: CrmDetailProps) {
  return (
    <div className="rounded-xl border border-[#2F3A49] bg-[#151A22] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7E8A9A]">
        {label}
      </dt>
      <dd className="mt-2 text-sm text-[#F4F7FB]">{value}</dd>
    </div>
  );
}

function CrmTimelineDetail({ label, value }: CrmDetailProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-current/70">
        {label}
      </dt>
      <dd className="mt-1 break-words font-mono text-xs leading-5 text-[#F4F7FB]">{value}</dd>
    </div>
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled CRM lookup state: ${JSON.stringify(value)}`);
}
