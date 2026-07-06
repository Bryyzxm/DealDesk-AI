import { createDemoDealFactExtraction } from "../../fixtures/deal-fact-extraction";
import type { DealFactExtraction, DomainError, WorkflowRun } from "../domain/workflow-run";
import { createAuditEventId, createUtcTimestamp } from "../domain/workflow-run";
import { saveWorkflowRun } from "./workflow-run-store";

export type ExtractionResult =
  | { readonly ok: true; readonly run: WorkflowRun }
  | { readonly ok: false; readonly error: DomainError };

export async function extractDealFactsForRun(run: WorkflowRun): Promise<ExtractionResult> {
  if (run.dealFactExtraction) {
    const completeRun = { ...run, extractionStatus: "complete" as const };
    await saveWorkflowRun(completeRun);
    return { ok: true, run: completeRun };
  }

  const extraction = createDemoDealFactExtraction(run.dealRequest);

  if (!isValidExtraction(extraction)) {
    return {
      ok: false,
      error: {
        code: "deal_fact_extraction_invalid",
        message: "Demo extraction did not produce required typed deal facts.",
        recoverable: true,
      },
    };
  }

  const extractionEvent = {
    id: createAuditEventId(),
    runId: run.id,
    createdAt: createUtcTimestamp(),
    type: "deal_facts_extracted",
    source: run.dealRequest.fixtureSource ?? "demo-extraction-fixture",
    summary: `Deal facts extracted with ${extraction.evidenceCitations.length} evidence citations and ${extraction.missingFacts.length} missing facts.`,
  } satisfies WorkflowRun["events"][number];

  const updatedRun = {
    ...run,
    extractionStatus: "complete" as const,
    dealFactExtraction: extraction,
    events: [...run.events, extractionEvent],
  } satisfies WorkflowRun;

  await saveWorkflowRun(updatedRun);

  return { ok: true, run: updatedRun };
}

function isValidExtraction(extraction: DealFactExtraction): boolean {
  return (
    extraction.buyerIntent.value.length > 0 &&
    extraction.urgency.value.length > 0 &&
    extraction.productNeeds.length > 0 &&
    extraction.budgetOrDiscountHints.length > 0 &&
    extraction.evidenceCitations.length > 0
  );
}
