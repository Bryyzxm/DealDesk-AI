import assert from "node:assert/strict";

import { MESSY_DEAL_REQUEST_FIXTURE } from "../../fixtures/messy-deal-request";
import { extractDealFactsForRun } from "./extract";
import { createWorkflowRunFromIntake } from "./intake";
import { loadWorkflowRun, saveWorkflowRun } from "./workflow-run-store";

async function main(): Promise<void> {
  const intake = createWorkflowRunFromIntake(MESSY_DEAL_REQUEST_FIXTURE);

  assert.equal(intake.ok, true);

  if (!intake.ok) {
    throw new Error("Messy deal fixture should create a workflow run.");
  }

  await saveWorkflowRun(intake.run);

  const extraction = await extractDealFactsForRun(intake.run);

  assert.equal(extraction.ok, true);

  if (!extraction.ok) {
    throw new Error("Extraction should produce typed deal facts.");
  }

  const reloaded = await loadWorkflowRun(extraction.run.id);
  const extracted = reloaded?.dealFactExtraction;
  const extractionEvent = reloaded?.events.find((event) => event.type === "deal_facts_extracted");

  assert.ok(reloaded);
  assert.equal(reloaded.id, intake.run.id);
  assert.ok(extracted);
  assert.equal(extracted.buyerIntent.value, "Quote request for DealDesk AI Enterprise seats");
  assert.match(extracted.urgency.value, /before Friday/);
  assert.ok(extracted.requestedDate?.value.includes("next month"));
  assert.ok(extracted.productNeeds.some((fact) => fact.value.includes("75 Enterprise seats")));
  assert.ok(extracted.budgetOrDiscountHints.some((fact) => fact.value.includes("Net 60")));
  assert.ok(extracted.missingFacts.some((fact) => fact.blocksQuoteContinuation));
  assert.ok(extracted.evidenceCitations.some((citation) => citation.snippet.includes("before Friday")));
  assert.ok(extractionEvent);
  assert.equal(extractionEvent.runId, intake.run.id);

  const secondExtraction = await extractDealFactsForRun(reloaded);

  assert.equal(secondExtraction.ok, true);

  if (!secondExtraction.ok) {
    throw new Error("Second extraction should be idempotent.");
  }

  assert.equal(
    secondExtraction.run.events.filter((event) => event.type === "deal_facts_extracted").length,
    1,
  );
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  throw error;
});
