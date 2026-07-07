"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type CommandPaletteProps = {
  readonly currentRunHref?: string;
};

export function CommandPalette({ currentRunHref }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeForNavigation = (focusTargetId: string) => {
    setOpen(false);
    window.setTimeout(() => document.getElementById(focusTargetId)?.focus(), 0);
  };

  const closePalette = () => {
    const previousFocus = previousFocusRef.current;

    setOpen(false);
    window.setTimeout(() => previousFocus?.focus(), 0);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isPaletteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (isPaletteShortcut) {
        event.preventDefault();
        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen(true);
        return;
      }

      if (open && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePalette();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const backgroundElements = Array.from(document.querySelectorAll<HTMLElement>("main"));
    const previousStates = backgroundElements.map((element) => ({
      ariaHidden: element.getAttribute("aria-hidden"),
      element,
      inert: element.inert,
    }));

    for (const element of backgroundElements) {
      element.setAttribute("aria-hidden", "true");
      element.inert = true;
    }

    return () => {
      for (const { ariaHidden, element, inert } of previousStates) {
        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", ariaHidden);
        }

        element.inert = inert;
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (!focusableElements || focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 px-4 py-20" role="presentation">
      <div
        aria-labelledby="command-palette-heading"
        aria-modal="true"
        className="mx-auto max-w-lg rounded-2xl border border-[#2F3A49] bg-[#151A22] p-5 text-[#F4F7FB] shadow-2xl shadow-black/40"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#7E8A9A]">
              Navigation
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white" id="command-palette-heading">
              Command palette
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#B9C3D1]">
              Navigate to Deal Intake or the current Workflow Run. No workflow actions run from this panel.
            </p>
          </div>
          <button
            className="app-focus-ring rounded-lg border border-[#2F3A49] px-3 py-2 text-sm font-semibold text-[#F4F7FB] hover:bg-[#1D2430]"
            onClick={closePalette}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>

        <nav aria-label="Command palette navigation" className="mt-5 grid gap-3">
          <Link
            className="app-focus-ring rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4 text-left hover:bg-[#1D2430]"
            href="/"
            onClick={() => closeForNavigation("deal-intake-content")}
          >
            <span className="block text-sm font-semibold text-white">Deal Intake</span>
            <span className="mt-1 block text-sm leading-6 text-[#B9C3D1]">
              Open the intake form and seeded demo loader.
            </span>
          </Link>

          {currentRunHref ? (
            <Link
              className="app-focus-ring rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4 text-left hover:bg-[#1D2430]"
              href={currentRunHref}
              onClick={() => closeForNavigation("workflow-run-content")}
            >
              <span className="block text-sm font-semibold text-white">Current Workflow Run</span>
              <span className="mt-1 block text-sm leading-6 text-[#B9C3D1]">
                Return to the active run review surface.
              </span>
            </Link>
          ) : (
            <div
              className="rounded-xl border border-[#2F3A49] bg-[#0E1116] p-4 text-left opacity-70"
            >
              <span className="block text-sm font-semibold text-white">Current Workflow Run unavailable</span>
              <span className="mt-1 block text-sm leading-6 text-[#B9C3D1]">
                Create or open a workflow run before this navigation action is available.
              </span>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
