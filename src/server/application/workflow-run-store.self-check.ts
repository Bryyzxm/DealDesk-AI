import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createWorkflowRunFromIntake } from "./intake";
import { loadWorkflowRun, saveWorkflowRun } from "./workflow-run-store";

const DEAL_REQUEST_FIXTURE = {
  sender: "maya.chen@example.test",
  accountName: "Northstar Demo Systems",
  requestText: "Need 75 Enterprise seats before Friday with net 60 terms.",
  requestedProducts: "DealDesk AI Enterprise, 75 seats",
  requestedTerms: "Net 60, start next month",
  attachmentText: "Please keep legacy renewal cap wording.",
  fixtureSource: "seed:self-check-story-13",
} as const;

async function main(): Promise<void> {
  const result = createWorkflowRunFromIntake(DEAL_REQUEST_FIXTURE);
  const concurrentResult = createWorkflowRunFromIntake({
    ...DEAL_REQUEST_FIXTURE,
    requestText: "Need 12 starter seats with standard net 30 terms.",
    fixtureSource: "seed:self-check-story-13-concurrent",
  });

  assert.equal(result.ok, true);
  assert.equal(concurrentResult.ok, true);

  if (!result.ok || !concurrentResult.ok) {
    throw new Error("Fixture intake should create a workflow run.");
  }

  await Promise.all([saveWorkflowRun(result.run), saveWorkflowRun(concurrentResult.run)]);
  const storedRun = await loadWorkflowRun(result.run.id);
  const concurrentRun = await loadWorkflowRun(concurrentResult.run.id);

  assert.ok(storedRun);
  assert.ok(concurrentRun);
  assert.equal(storedRun.id.startsWith("run_"), true);
  assert.equal(storedRun.dealRequest.requestText, DEAL_REQUEST_FIXTURE.requestText);
  assert.equal(storedRun.events.length, 1);
  assert.equal(storedRun.events[0]?.id.startsWith("evt_"), true);
  assert.equal(storedRun.events[0]?.runId, storedRun.id);
  assert.equal(storedRun.events[0]?.type, "deal_request_intake_created");
  assert.match(storedRun.events[0]?.summary ?? "", /Deal request intake captured/);
  assert.equal(concurrentRun.dealRequest.requestText, "Need 12 starter seats with standard net 30 terms.");

  await mkdir(path.join(process.cwd(), ".data"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), ".data", "workflow-runs.json"),
    JSON.stringify({
      [result.run.id]: {
        ...result.run,
        id: concurrentResult.run.id,
        events: [],
      },
    }),
    "utf8",
  );

  assert.equal(await loadWorkflowRun(result.run.id), undefined);
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  throw error;
});
