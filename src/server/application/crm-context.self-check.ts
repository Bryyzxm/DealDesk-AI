import assert from "node:assert/strict";

import { MESSY_DEAL_REQUEST_FIXTURE } from "../../fixtures/messy-deal-request";
import { createCrmMockAdapter } from "../adapters/crm-mock";
import type { CrmLookupPort } from "../ports/crm";
import { createWorkflowRunFromIntake } from "./intake";
import { retrieveCrmAccountContextForRun } from "./crm-context";
import { loadWorkflowRun, saveWorkflowRun } from "./workflow-run-store";

async function main(): Promise<void> {
  await verifySuccessfulCrmLookupPersistsContextAndAudit();
  await verifyMissingAccountNameCreatesDistinctVisibleBlocker();
  await verifyMissingCrmRecordCreatesVisibleBlocker();
  await verifyAdapterFailureCreatesFailedToolResultWithoutFabricatedContext();
  await verifyThrownAdapterFailurePersistsFailedToolResult();
}

async function verifySuccessfulCrmLookupPersistsContextAndAudit(): Promise<void> {
  const intake = createWorkflowRunFromIntake(MESSY_DEAL_REQUEST_FIXTURE);

  assert.equal(intake.ok, true);

  if (!intake.ok) {
    throw new Error("Messy deal fixture should create a workflow run.");
  }

  await saveWorkflowRun(intake.run);

  const lookup = await retrieveCrmAccountContextForRun(intake.run, createCrmMockAdapter());

  assert.equal(lookup.ok, true);

  if (!lookup.ok) {
    throw new Error("Northstar Demo Systems should resolve from the seeded CRM adapter.");
  }

  const reloaded = await loadWorkflowRun(lookup.run.id);
  const crmEventCount = lookup.run.events.filter((event) => event.type === "crm_account_context_retrieved").length;

  assert.ok(reloaded);
  assert.equal(reloaded.crmLookup?.status, "success");
  assert.equal(reloaded.crmLookup?.accountContext?.customerTier, "Enterprise");
  assert.equal(reloaded.crmLookup?.accountContext?.priorDiscount, "18% renewal discount approved last cycle");
  assert.equal(reloaded.crmLookup?.accountContext?.hasActiveContract, true);
  assert.equal(reloaded.crmLookup?.accountContext?.owner, "Priya Raman");
  assert.equal(reloaded.crmLookup?.toolCall.status, "success");
  assert.equal(reloaded.crmLookup?.toolCall.toolName, "crm.lookupAccountContext");
  assert.match(reloaded.crmLookup?.toolCall.resultSummary ?? "", /Northstar Demo Systems/);
  assert.ok(reloaded.events.some((event) => event.type === "crm_account_context_retrieved"));
  assert.equal(crmEventCount, 1);

  const secondLookup = await retrieveCrmAccountContextForRun(reloaded, createCrmMockAdapter());

  assert.equal(secondLookup.ok, true);

  if (!secondLookup.ok) {
    throw new Error("Repeated successful CRM lookup should stay idempotent.");
  }

  assert.equal(
    secondLookup.run.events.filter((event) => event.type === "crm_account_context_retrieved").length,
    1,
  );
}

async function verifyMissingCrmRecordCreatesVisibleBlocker(): Promise<void> {
  const intake = createWorkflowRunFromIntake({
    ...MESSY_DEAL_REQUEST_FIXTURE,
    accountName: "Missing Demo Account",
    fixtureSource: "seed:self-check-crm-missing",
  });

  assert.equal(intake.ok, true);

  if (!intake.ok) {
    throw new Error("Missing CRM account fixture should still create a workflow run.");
  }

  const lookup = await retrieveCrmAccountContextForRun(intake.run, createCrmMockAdapter());

  assert.equal(lookup.ok, false);
  if (lookup.ok) {
    throw new Error("Missing CRM account should not be treated as success.");
  }

  assert.equal(lookup.run.crmLookup?.status, "missing_record");
  assert.equal(lookup.run.crmLookup?.blocker?.blocksQuoteContinuation, true);
  assert.match(lookup.run.crmLookup?.blocker?.reason ?? "", /Missing Demo Account/);
  assert.equal(lookup.error.code, "crm_account_not_found");
  assert.equal(lookup.run.crmLookup?.toolCall.status, "blocked");

  const reloaded = await loadWorkflowRun(lookup.run.id);

  assert.ok(reloaded);
  assert.equal(reloaded.crmLookup?.status, "missing_record");
  assert.match(reloaded.crmLookup?.blocker?.reason ?? "", /Missing Demo Account/);

  const secondLookup = await retrieveCrmAccountContextForRun(lookup.run, createCrmMockAdapter());

  assert.equal(secondLookup.ok, false);

  if (secondLookup.ok) {
    throw new Error("Repeated missing CRM account lookup should stay blocked.");
  }

  assert.equal(countCrmEvents(secondLookup.run), countCrmEvents(lookup.run) + 1);
}

async function verifyMissingAccountNameCreatesDistinctVisibleBlocker(): Promise<void> {
  const intake = createWorkflowRunFromIntake({
    ...MESSY_DEAL_REQUEST_FIXTURE,
    accountName: "   ",
    fixtureSource: "seed:self-check-crm-account-name-missing",
  });

  assert.equal(intake.ok, true);

  if (!intake.ok) {
    throw new Error("Missing account name fixture should still create a workflow run.");
  }

  const lookup = await retrieveCrmAccountContextForRun(intake.run, createCrmMockAdapter());

  assert.equal(lookup.ok, false);
  if (lookup.ok) {
    throw new Error("Missing account name should not be treated as success.");
  }

  assert.equal(lookup.run.crmLookup?.status, "account_name_missing");
  assert.equal(lookup.run.crmLookup?.blocker?.blocksQuoteContinuation, true);
  assert.equal(lookup.error.code, "crm_account_name_missing");
  assert.equal(lookup.run.crmLookup?.toolCall.status, "blocked");

  const reloaded = await loadWorkflowRun(lookup.run.id);

  assert.ok(reloaded);
  assert.equal(reloaded.crmLookup?.status, "account_name_missing");
}

async function verifyAdapterFailureCreatesFailedToolResultWithoutFabricatedContext(): Promise<void> {
  const intake = createWorkflowRunFromIntake({
    ...MESSY_DEAL_REQUEST_FIXTURE,
    accountName: "CRM Adapter Failure Demo",
    fixtureSource: "seed:self-check-crm-failure",
  });

  assert.equal(intake.ok, true);

  if (!intake.ok) {
    throw new Error("Adapter failure fixture should still create a workflow run.");
  }

  const lookup = await retrieveCrmAccountContextForRun(intake.run, createCrmMockAdapter());

  assert.equal(lookup.ok, false);
  if (lookup.ok) {
    throw new Error("CRM adapter failure should not be treated as success.");
  }

  assert.equal(lookup.run.crmLookup?.status, "adapter_failure");
  assert.equal(
    lookup.run.crmLookup?.status === "adapter_failure" && "accountContext" in lookup.run.crmLookup,
    false,
  );
  assert.equal(lookup.run.crmLookup?.toolCall.toolName, "crm.lookupAccountContext");
  assert.equal(lookup.run.crmLookup?.toolCall.status, "failed");
  assert.equal(lookup.run.crmLookup?.toolCall.error?.code, "crm_adapter_unavailable");
  assert.match(lookup.run.crmLookup?.toolCall.error?.message ?? "", /CRM mock adapter failure/);
  assert.match(lookup.run.crmLookup?.toolCall.resultSummary ?? "", /failed/i);
  assert.equal(lookup.error.code, "crm_adapter_failure");

  const reloaded = await loadWorkflowRun(lookup.run.id);

  assert.ok(reloaded);
  assert.equal(reloaded.crmLookup?.status, "adapter_failure");
  assert.equal(reloaded.crmLookup?.toolCall.status, "failed");
  assert.equal(reloaded.crmLookup?.toolCall.error?.code, "crm_adapter_unavailable");

  const secondLookup = await retrieveCrmAccountContextForRun(lookup.run, createCrmMockAdapter());

  assert.equal(secondLookup.ok, false);

  if (secondLookup.ok) {
    throw new Error("Repeated adapter failure lookup should stay failed.");
  }

  assert.equal(countCrmEvents(secondLookup.run), countCrmEvents(lookup.run) + 1);
}

async function verifyThrownAdapterFailurePersistsFailedToolResult(): Promise<void> {
  const intake = createWorkflowRunFromIntake(MESSY_DEAL_REQUEST_FIXTURE);

  assert.equal(intake.ok, true);

  if (!intake.ok) {
    throw new Error("Thrown adapter failure fixture should still create a workflow run.");
  }

  const throwingAdapter: CrmLookupPort = {
    lookupAccountContext: async () => {
      throw new Error("upstream timeout");
    },
  };

  const lookup = await retrieveCrmAccountContextForRun(intake.run, throwingAdapter);

  assert.equal(lookup.ok, false);
  if (lookup.ok) {
    throw new Error("Thrown CRM adapter failure should not be treated as success.");
  }

  assert.equal(lookup.error.code, "crm_adapter_failure");
  assert.equal(lookup.run.crmLookup?.status, "adapter_failure");
  assert.equal(lookup.run.crmLookup?.toolCall.status, "failed");
  assert.equal(lookup.run.crmLookup?.toolCall.error?.code, "crm_adapter_unavailable");
  assert.match(lookup.run.crmLookup?.toolCall.error?.message ?? "", /upstream timeout/);
}

function countCrmEvents(run: Awaited<ReturnType<typeof retrieveCrmAccountContextForRun>>["run"]): number {
  return run.events.filter((event) => event.type === "crm_account_context_retrieved").length;
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  throw error;
});
