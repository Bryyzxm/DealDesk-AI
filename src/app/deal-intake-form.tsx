"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { DealRequestInput } from "@/server/domain/workflow-run";

import { submitDealRequest, type DealIntakeActionState } from "./actions";

const EMPTY_INPUT = {
  sender: "",
  accountName: "",
  requestText: "",
  requestedProducts: "",
  requestedTerms: "",
  attachmentText: "",
  fixtureSource: "",
} satisfies Required<DealRequestInput>;

const INITIAL_ACTION_STATE = { status: "idle" } satisfies DealIntakeActionState;

type DealIntakeFormProps = {
  readonly initialInput?: DealRequestInput;
};

export function DealIntakeForm({ initialInput }: DealIntakeFormProps) {
  const [actionState, formAction, pending] = useActionState(
    submitDealRequest,
    INITIAL_ACTION_STATE,
  );
  const [input, setInput] = useState({ ...EMPTY_INPUT, ...initialInput });
  const requestTextErrorId = "requestText-error";
  const hasRequestTextError =
    actionState.status === "error" && input.requestText.trim().length === 0;
  const updateInput = (patch: Partial<typeof input>) =>
    setInput({ ...input, ...patch, fixtureSource: "" });

  return (
    <main className="min-h-dvh bg-[#0E1116] px-4 py-8 text-[#F4F7FB] sm:px-6 lg:px-8">
      <a className="app-skip-link" href="#deal-intake-content">
        Skip to deal intake content
      </a>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section
          aria-labelledby="deal-intake-heading"
          className="rounded-2xl border border-[#2F3A49] bg-[#151A22] p-6 shadow-2xl shadow-black/20"
          id="deal-intake-content"
          tabIndex={-1}
        >
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#7E8A9A]">
            DealDesk AI / Deal Intake
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white" id="deal-intake-heading">
            Submit messy deal request
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B9C3D1]">
            Capture original customer wording and start a traceable workflow run.
          </p>

          {hasRequestTextError ? (
            <div
              className="mt-6 rounded-xl border border-[#F87171]/60 bg-[#F87171]/10 p-4 text-sm text-[#FCA5A5]"
              role="alert"
            >
              <p className="font-semibold">Request cannot be submitted.</p>
              <a className="mt-2 inline-block underline" href="#requestText">
                {actionState.message}
              </a>
            </div>
          ) : null}

          <form action={formAction} aria-labelledby="deal-intake-heading" className="mt-6 grid gap-5">
            <input name="fixtureSource" type="hidden" value={input.fixtureSource} />
            <Field
              id="sender"
              label="Sender"
              name="sender"
              onChange={(value) => updateInput({ sender: value })}
              value={input.sender}
            />
            <Field
              id="accountName"
              label="Account name"
              name="accountName"
              onChange={(value) => updateInput({ accountName: value })}
              value={input.accountName}
            />
            <TextAreaField
              describedBy={hasRequestTextError ? requestTextErrorId : undefined}
              error={hasRequestTextError ? actionState.message : undefined}
              id="requestText"
              label="Free-form request text"
              name="requestText"
              onChange={(value) => updateInput({ requestText: value })}
              required
              rows={7}
              value={input.requestText}
            />
            <Field
              id="requestedProducts"
              label="Requested products"
              name="requestedProducts"
              onChange={(value) => updateInput({ requestedProducts: value })}
              value={input.requestedProducts}
            />
            <Field
              id="requestedTerms"
              label="Requested terms"
              name="requestedTerms"
              onChange={(value) => updateInput({ requestedTerms: value })}
              value={input.requestedTerms}
            />
            <TextAreaField
              id="attachmentText"
              label="Optional attachment text"
              name="attachmentText"
              onChange={(value) => updateInput({ attachmentText: value })}
              rows={4}
              value={input.attachmentText}
            />

            <div className="flex flex-col gap-3 border-t border-[#2F3A49] pt-5 sm:flex-row">
              <Button disabled={pending} size="lg" type="submit">
                {pending ? "Creating run..." : "Create workflow run"}
              </Button>
              <Link
                className="app-focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[#2F3A49] bg-transparent px-6 text-sm font-medium text-[#F4F7FB] hover:bg-[#1D2430] disabled:pointer-events-none disabled:opacity-50"
                href="/?fixture=messy"
              >
                Load seeded messy inquiry
              </Link>
            </div>
          </form>
        </section>

        <aside className="rounded-2xl border border-[#2F3A49] bg-[#1D2430] p-6">
          <h2 className="text-lg font-semibold text-white">Workflow run output</h2>
          <p className="mt-5 text-sm leading-6 text-[#B9C3D1]">
            Valid submission opens a Workflow Run page with stored intake state. Empty request text creates no run.
          </p>
          <div className="mt-5 rounded-xl border border-[#2F3A49] bg-[#151A22] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7E8A9A]">
              After submit
            </p>
            <p className="mt-2 text-sm leading-6 text-[#F4F7FB]">
              Run ID, original input, created timestamp, extraction status, and timeline appear on the run page.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

type FieldProps = {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
};

function Field({ id, label, name, onChange, value }: FieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B9C3D1]" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 w-full rounded-lg border border-[#2F3A49] bg-[#0E1116] px-3 py-2 text-sm text-white outline-none transition focus:border-[#5BA7FF] focus:ring-2 focus:ring-[#5BA7FF]/30"
        id={id}
        name={name}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </div>
  );
}

type TextAreaFieldProps = FieldProps & {
  readonly describedBy?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly rows: number;
};

function TextAreaField({
  describedBy,
  error,
  id,
  label,
  name,
  onChange,
  required = false,
  rows,
  value,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B9C3D1]" htmlFor={id}>
        {label}
      </label>
      <textarea
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        className="mt-2 w-full rounded-lg border border-[#2F3A49] bg-[#0E1116] px-3 py-2 text-sm leading-6 text-white outline-none transition focus:border-[#5BA7FF] focus:ring-2 focus:ring-[#5BA7FF]/30 aria-invalid:border-[#F87171] aria-invalid:ring-[#F87171]/30"
        id={id}
        name={name}
        onChange={(event) => onChange(event.currentTarget.value)}
        aria-required={required ? "true" : undefined}
        rows={rows}
        value={value}
      />
      {error ? (
        <p className="mt-2 text-sm text-[#FCA5A5]" id={describedBy}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
