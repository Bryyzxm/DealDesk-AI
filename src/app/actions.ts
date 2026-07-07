"use server";

import { createWorkflowRunFromIntake } from "@/server/application/intake";
import { extractDealFactsForRun } from "@/server/application/extract";
import { retrieveCrmAccountContextForRun } from "@/server/application/crm-context";
import { findWorkflowRunById, saveWorkflowRun } from "@/server/application/workflow-run-store";
import { createCrmMockAdapter } from "@/server/adapters/crm-mock";
import { isWorkflowRunId } from "@/server/domain/workflow-run";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type DealIntakeActionState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly message: string; readonly code: string };

export async function submitDealRequest(
  previousState: DealIntakeActionState,
  formData: FormData,
): Promise<DealIntakeActionState> {
  const result = createWorkflowRunFromIntake({
    sender: getFormString(formData, "sender"),
    accountName: getFormString(formData, "accountName"),
    requestText: getFormString(formData, "requestText"),
    requestedProducts: getFormString(formData, "requestedProducts"),
    requestedTerms: getFormString(formData, "requestedTerms"),
    attachmentText: getOptionalFormString(formData, "attachmentText"),
    fixtureSource: getOptionalFormString(formData, "fixtureSource"),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      code: result.error.code,
    };
  }

  await saveWorkflowRun(result.run);
  revalidatePath(`/runs/${result.run.id}`);
  redirect(`/runs/${result.run.id}`);
}

export async function extractDealFacts(formData: FormData): Promise<void> {
  const runId = getFormString(formData, "runId");

  if (!isWorkflowRunId(runId)) {
    notFound();
  }

  const run = await findWorkflowRunById(runId);

  if (!run) {
    notFound();
  }

  await extractDealFactsForRun(run);
  revalidatePath(`/runs/${runId}`);
  redirect(`/runs/${runId}`);
}

export async function retrieveCrmAccountContext(formData: FormData): Promise<void> {
  const runId = getFormString(formData, "runId");

  if (!isWorkflowRunId(runId)) {
    notFound();
  }

  const run = await findWorkflowRunById(runId);

  if (!run) {
    notFound();
  }

  await retrieveCrmAccountContextForRun(run, createCrmMockAdapter());
  revalidatePath(`/runs/${runId}`);
  redirect(`/runs/${runId}`);
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getOptionalFormString(formData: FormData, key: string): string | undefined {
  const value = getFormString(formData, key);
  return value.length > 0 ? value : undefined;
}
