import { notFound } from "next/navigation";

import { extractDealFacts } from "@/app/actions";
import { CommandPalette } from "@/app/command-palette";
import { findWorkflowRunById } from "@/server/application/workflow-run-store";
import type { ExtractedDealFact, MissingDealFact, WorkflowRun } from "@/server/domain/workflow-run";
import { isWorkflowRunId } from "@/server/domain/workflow-run";
import { CrmContextPanel } from "./crm-context-panel";

type RunPageProps = {
  readonly params: Promise<{ readonly runId: string }>;
};

export default async function RunPage({ params }: RunPageProps) {
  const { runId } = await params;

  if (!isWorkflowRunId(runId)) {
    notFound();
  }

  const run = await findWorkflowRunById(runId);

  if (!run) {
    notFound();
  }

  const hasCompleteExtraction = run.extractionStatus === "complete" && Boolean(run.dealFactExtraction);
  const blockingMissingFacts = run.dealFactExtraction?.missingFacts.filter(
    (fact) => fact.blocksQuoteContinuation,
  ) ?? [];
  const needsClarification = blockingMissingFacts.length > 0;
  const missingFieldNames = formatFieldList(blockingMissingFacts.map((fact) => fact.field));
  const quoteSendReason = blockingMissingFacts.length > 0
    ? `Blocked: missing ${missingFieldNames} before quote continuation.`
    : "Blocked: approval is required before customer send.";

  return (
    <>
      <CommandPalette currentRunHref={`/runs/${run.id}`} />
      <main className="min-h-dvh bg-[#0E1116] px-4 py-8 text-[#F4F7FB] sm:px-6 lg:px-8">
        <a className="app-skip-link" href="#workflow-run-content">
          Skip to workflow run content
        </a>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section
          aria-labelledby="workflow-run-heading"
          className="rounded-2xl border border-[#2F3A49] bg-[#151A22] p-6 shadow-2xl shadow-black/20"
          id="workflow-run-content"
          tabIndex={-1}
        >
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#7E8A9A]">
            DealDesk AI / Workflow Run
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white" id="workflow-run-heading">
                Workflow run intake state
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#B9C3D1]">
                {hasCompleteExtraction
                  ? "Typed deal facts extracted from stored intake evidence."
                  : "Intake event captured. Extraction in progress."}
              </p>
            </div>
            <p
              aria-live="polite"
              className="rounded-full border border-[#F3B34C]/50 bg-[#F3B34C]/10 px-3 py-1 text-sm font-semibold text-[#F3B34C]"
              role="status"
            >
              {hasCompleteExtraction ? "Extraction complete" : "Extraction in progress"}
            </p>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Detail label="Run ID" value={run.id} mono />
            <Detail label="Created timestamp" value={run.createdAt} mono />
            <Detail label="Sender" value={run.dealRequest.sender || "Not provided"} />
            <Detail label="Account" value={run.dealRequest.accountName || "Not provided"} />
            <Detail label="Requested products" value={run.dealRequest.requestedProducts || "Not provided"} />
            <Detail label="Requested terms" value={run.dealRequest.requestedTerms || "Not provided"} />
          </dl>

          <section aria-labelledby="original-request-heading" className="mt-6 rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B9C3D1]" id="original-request-heading">
              Original request text
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white">
              {run.dealRequest.requestText}
            </p>
          </section>

          {run.dealRequest.attachmentText ? (
            <section aria-labelledby="attachment-text-heading" className="mt-4 rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B9C3D1]" id="attachment-text-heading">
                Attachment text
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#B9C3D1]">
                {run.dealRequest.attachmentText}
              </p>
            </section>
          ) : null}

          {run.dealFactExtraction ? (
            <ExtractionReview run={run} blockingMissingFacts={blockingMissingFacts} />
          ) : (
            <section aria-labelledby="extraction-review-heading" className="mt-6 rounded-xl border border-[#5BA7FF]/40 bg-[#5BA7FF]/10 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B9C3D1]" id="extraction-review-heading">
                Extraction review
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#B9C3D1]">
                Demo extraction will validate typed deal facts, append an audit event, and keep quote continuation blocked until missing facts are resolved.
              </p>
              <form action={extractDealFacts} className="mt-4">
                <input name="runId" type="hidden" value={run.id} />
                <button className="app-focus-ring rounded-lg border border-transparent bg-[#5BA7FF] px-4 py-2 text-sm font-semibold text-[#07111F] hover:bg-[#8CC2FF]" type="submit">
                  Extract facts from intake
                </button>
              </form>
            </section>
          )}

          {needsClarification ? <ClarificationRequiredSummary missingFacts={blockingMissingFacts} /> : null}
          <CrmContextPanel run={run} />
          <CustomerSendControls
            showClarificationControl={needsClarification}
            quoteReason={quoteSendReason}
          />
        </section>

        <aside aria-labelledby="timeline-heading" className="rounded-2xl border border-[#2F3A49] bg-[#1D2430] p-6">
          <h2 className="text-lg font-semibold text-white" id="timeline-heading">Timeline</h2>
          {run.events.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {run.events.map((event) => (
              <li key={event.id} className="rounded-xl border border-[#2F3A49] bg-[#151A22] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7E8A9A]">
                  {event.type}
                </p>
                <dl className="mt-3 space-y-3 text-sm">
                  <TimelineDetail label="Timestamp" value={event.createdAt} />
                  <TimelineDetail label="Run ID" value={event.runId} />
                  <TimelineDetail label="Source" value={event.source} />
                  <TimelineDetail label="Payload summary" value={event.summary} />
                </dl>
              </li>
              ))}
            </ol>
          ) : null}
        </aside>
        </div>
      </main>
    </>
  );
}

type ClarificationRequiredSummaryProps = {
  readonly missingFacts: readonly MissingDealFact[];
};

function ClarificationRequiredSummary({ missingFacts }: ClarificationRequiredSummaryProps) {
  const fieldSummary = formatFieldList(missingFacts.map((fact) => fact.field));

  return (
    <section aria-labelledby="clarification-review-heading" className="mt-6 rounded-xl border border-[#9B8CFF]/50 bg-[#9B8CFF]/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D7D0FF]" id="clarification-review-heading">
            Clarification required
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#F4F7FB]">
            Missing {fieldSummary}. Customer send remains blocked until these fields are resolved.
          </p>
        </div>
        <p className="rounded-full border border-[#F3B34C]/50 bg-[#F3B34C]/10 px-3 py-1 text-sm font-semibold text-[#F8D89A]" role="status">
          Manual clarification required
        </p>
      </div>

      <ul className="mt-5 space-y-2 text-sm text-[#F4F7FB]">
        {missingFacts.map((fact) => (
          <li key={fact.field} className="rounded-lg border border-[#2F3A49] bg-[#151A22] p-3">
            <span className="font-semibold">{formatFieldName(fact.field)}</span>: {fact.reason}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatFieldList(fields: readonly string[]): string {
  return fields.map(formatFieldName).join(", ");
}

function formatFieldName(field: string): string {
  return field.replaceAll("_", " ");
}

type CustomerSendControlsProps = {
  readonly showClarificationControl: boolean;
  readonly quoteReason: string;
};

function CustomerSendControls({
  quoteReason,
  showClarificationControl,
}: CustomerSendControlsProps) {
  return (
    <section aria-labelledby="customer-send-controls-heading" className="mt-6 rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B9C3D1]" id="customer-send-controls-heading">
        Customer send controls
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {showClarificationControl ? (
          <DisabledSendButton idBase="send-clarification" label="Send clarification" reason="Blocked: clarify missing fields manually before customer send." />
        ) : null}
        <DisabledSendButton idBase="send-quote" label="Send quote" reason={quoteReason} />
      </div>
    </section>
  );
}


type DisabledSendButtonProps = {
  readonly idBase: string;
  readonly label: string;
  readonly reason: string;
};

function DisabledSendButton({ idBase, label, reason }: DisabledSendButtonProps) {
  const reasonId = `${idBase.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-reason`;

  return (
    <div
      aria-describedby={reasonId}
      aria-label={`${label} blocked`}
      className="app-focus-ring rounded-xl border border-[#F87171]/50 bg-[#F87171]/10 p-4"
      role="group"
      tabIndex={0}
    >
      <button
        aria-describedby={reasonId}
        className="app-focus-ring w-full cursor-not-allowed rounded-lg border border-[#F87171]/60 px-4 py-2 text-sm font-semibold text-[#FCA5A5]"
        disabled
        type="button"
      >
        [Blocked] {label}
      </button>
      <p id={reasonId} className="mt-3 text-sm leading-6 text-[#F4F7FB]">
        {reason}
      </p>
    </div>
  );
}

type ExtractionReviewProps = {
  readonly run: WorkflowRun;
  readonly blockingMissingFacts: readonly MissingDealFact[];
};

function ExtractionReview({ blockingMissingFacts, run }: ExtractionReviewProps) {
  const extraction = run.dealFactExtraction;

  if (!extraction) {
    return null;
  }

  const factGroups = [
    [extraction.buyerIntent],
    [extraction.urgency],
    extraction.productNeeds,
    extraction.budgetOrDiscountHints,
    extraction.requestedDate ? [extraction.requestedDate] : [],
  ];

  return (
    <section aria-labelledby="extraction-review-heading" className="mt-6 rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B9C3D1]" id="extraction-review-heading">
            Extraction review
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#B9C3D1]">
            Demo extraction produced typed facts from stored intake fields.
          </p>
        </div>
        {blockingMissingFacts.length > 0 && (
          <p className="rounded-full border border-[#F3B34C]/50 bg-[#F3B34C]/10 px-3 py-1 text-sm font-semibold text-[#F3B34C]" role="status">
            Quote continuation blocked
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {factGroups.flat().map((fact) => (
          <FactCard key={fact.label} fact={fact} run={run} />
        ))}
      </div>

      <section aria-labelledby="missing-facts-blocker-heading" className="mt-5 rounded-xl border border-[#F87171]/50 bg-[#F87171]/10 p-4">
        <h3 className="text-sm font-semibold text-[#FCA5A5]" id="missing-facts-blocker-heading">Missing facts blocking quote continuation</h3>
        <ul className="mt-3 space-y-3 text-sm text-[#F4F7FB]">
          {blockingMissingFacts.map((fact) => (
            <li key={fact.field}>
              <span className="font-semibold">{formatFieldName(fact.field)}</span>: {fact.reason}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

type FactCardProps = {
  readonly fact: ExtractedDealFact;
  readonly run: WorkflowRun;
};

function FactCard({ fact, run }: FactCardProps) {
  const citations = run.dealFactExtraction?.evidenceCitations.filter((citation) =>
    fact.citationIds.includes(citation.id),
  ) ?? [];

  return (
    <article className="rounded-xl border border-[#2F3A49] bg-[#151A22] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A9A]">
        {fact.label}
      </p>
      <p className="mt-2 text-sm leading-6 text-white">{fact.value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#B9C3D1]">
        Confidence: {fact.confidence}
      </p>
      <div className="mt-3 space-y-2">
        {citations.map((citation) => (
          <details key={citation.id} className="rounded-lg border border-[#9B8CFF]/40 bg-[#9B8CFF]/10 p-3">
            <summary className="app-focus-ring cursor-pointer rounded-md text-sm font-semibold text-[#D7D0FF]">
              Evidence: {citation.label}
            </summary>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#B9C3D1]">
              Source: {citation.source}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#F4F7FB]">
              {citation.snippet}
            </p>
          </details>
        ))}
      </div>
    </article>
  );
}

type DetailProps = {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
};

function Detail({ label, mono = false, value }: DetailProps) {
  return (
    <div className="rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7E8A9A]">
        {label}
      </dt>
      <dd className={`mt-2 text-sm text-[#F4F7FB] ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function TimelineDetail({ label, value }: DetailProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A9A]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-mono text-xs leading-5 text-[#B9C3D1]">{value}</dd>
    </div>
  );
}
