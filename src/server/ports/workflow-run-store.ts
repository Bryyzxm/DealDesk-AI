import type { WorkflowRun, WorkflowRunId } from "../domain/workflow-run";

export type WorkflowRunStore = {
  readonly save: (run: WorkflowRun) => Promise<void>;
  readonly findById: (id: WorkflowRunId) => Promise<WorkflowRun | undefined>;
};
