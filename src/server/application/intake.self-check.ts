import { strict as assert } from "node:assert";

import { createWorkflowRunFromIntake } from "./intake";
import { findWorkflowRunById, saveWorkflowRun } from "./workflow-run-store";

const messyRequest = "Customer asked for 75 seats, rush rollout, and nonstandard net-60 terms.";
const attachmentText = "Forwarded note: legal wants billing language preserved.";

const success = createWorkflowRunFromIntake({
  sender: "maya@example.test",
  accountName: "Northstar Demo Systems",
  requestText: messyRequest,
  requestedProducts: "DealDesk AI Enterprise, 75 seats",
  requestedTerms: "Net 60, rush onboarding, renewal uplift cap",
  attachmentText,
  fixtureSource: "seed:messy-enterprise-renewal",
});

assert.equal(success.ok, true);
assert.match(success.run.id, /^run_/);
assert.match(success.run.events[0]?.id ?? "", /^evt_/);
assert.doesNotThrow(() => new Date(success.run.createdAt).toISOString());
assert.equal(success.run.dealRequest.requestText, messyRequest);
assert.equal(success.run.dealRequest.attachmentText, attachmentText);
assert.equal(success.run.events[0]?.source, "seed:messy-enterprise-renewal");

await saveWorkflowRun(success.run);

const reloaded = await findWorkflowRunById(success.run.id);

assert.equal(reloaded?.id, success.run.id);
assert.equal(reloaded?.dealRequest.requestText, messyRequest);
assert.equal(reloaded?.dealRequest.attachmentText, attachmentText);
assert.match(reloaded?.events[0]?.id ?? "", /^evt_/);
assert.equal(reloaded?.events[0]?.runId, success.run.id);
assert.equal(reloaded?.events[0]?.source, "seed:messy-enterprise-renewal");
assert.equal(reloaded?.events[0]?.summary, success.run.events[0]?.summary);

const failure = createWorkflowRunFromIntake({
  sender: "maya@example.test",
  accountName: "Northstar Demo Systems",
  requestText: "   ",
  requestedProducts: "DealDesk AI Enterprise",
  requestedTerms: "Net 60",
});

assert.equal(failure.ok, false);
assert.equal(failure.error.code, "request_text_required");
